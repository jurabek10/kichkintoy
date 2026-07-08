import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { ToolDeclaration } from "./chat-tools.service";
import type {
  ChatEngine,
  ChatStreamOptions,
  ChatStreamEvent,
} from "./chat-engine";

const MAX_TOOL_ROUNDS = 5;

/**
 * OpenAI chat-completions message shapes we send back and forth. Assistant turns
 * carry `tool_calls`; each tool result is a `tool` message keyed by call id.
 */
type OpenAiMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAiToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** A tool call accumulated across streaming deltas (arguments arrive in pieces). */
type PendingToolCall = { id: string; name: string; args: string };

/**
 * Runs the tool-loop against any OpenAI-compatible chat endpoint — OpenRouter,
 * Groq, a local Ollama, or the OpenAI API itself — selected purely by env
 * (CHAT_BASE_URL / CHAT_API_KEY / CHAT_MODEL). Behaviour mirrors the Gemini
 * engine: stream text deltas, execute any tool calls server-side, feed the
 * results back, repeat until the model produces a final answer.
 *
 * The chat feature is grounded entirely in function calling, so the configured
 * model MUST support tools (Llama 3.1, Qwen 2.5, DeepSeek do; Gemma 2 and
 * Phi-3 do not and will not ground correctly).
 */
@Injectable()
export class OpenAiChatService implements ChatEngine {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModels: string[];

  constructor() {
    // Read lazily-validated config; a missing key surfaces per-request (below)
    // rather than crashing API boot, so the app still starts before it's set.
    this.baseUrl = (
      process.env.CHAT_BASE_URL ?? "https://openrouter.ai/api/v1"
    ).replace(/\/+$/, "");
    this.apiKey = process.env.CHAT_API_KEY ?? "";
    this.model =
      process.env.CHAT_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";
    // OpenRouter-only: free-pool models get rate-limited upstream, so route
    // through a fallback chain instead of surfacing the 429 to the user.
    this.fallbackModels = (process.env.CHAT_MODEL_FALLBACKS ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }

  async *streamAnswer(opts: ChatStreamOptions): AsyncGenerator<ChatStreamEvent> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        "AI chat is not configured (CHAT_API_KEY missing).",
      );
    }

    const messages: OpenAiMessage[] = [
      { role: "system", content: opts.systemPrompt },
      ...opts.history.map(
        (m): OpenAiMessage => ({ role: m.role, content: m.content }),
      ),
    ];
    const tools = opts.tools.map(toOpenAiTool);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let assistantText = "";
      const pending = new Map<number, PendingToolCall>();

      for await (const delta of this.streamCompletion(messages, tools)) {
        if (delta.content) {
          assistantText += delta.content;
          yield { type: "text", value: delta.content };
        }
        for (const tc of delta.toolCalls) {
          const cur = pending.get(tc.index) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.name) cur.name = tc.name;
          if (tc.args) cur.args += tc.args;
          pending.set(tc.index, cur);
        }
      }

      const calls = [...pending.values()].filter((c) => c.name);
      if (calls.length === 0) {
        return; // model produced a final text answer
      }

      // Record the assistant's tool-call turn, then execute and feed results back.
      messages.push({
        role: "assistant",
        content: assistantText.length > 0 ? assistantText : null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: c.args || "{}" },
        })),
      });

      for (const call of calls) {
        yield { type: "tool", name: call.name };
        let result: unknown;
        try {
          result = await opts.executeTool(call.name, parseArgs(call.args));
        } catch (error) {
          result = {
            error: error instanceof Error ? error.message : "tool failed",
          };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ result }),
        });
      }
    }

    // Tool budget exhausted: the model kept calling tools without settling on
    // an answer. Force one final turn with NO tools so it must reply in text
    // (otherwise the user sees a blank bubble).
    let produced = false;
    for await (const delta of this.streamCompletion(messages, [])) {
      if (delta.content) {
        produced = true;
        yield { type: "text", value: delta.content };
      }
    }
    if (!produced) {
      yield {
        type: "text",
        value:
          "I gathered the data but couldn't finish the summary — please ask again.",
      };
    }
  }

  /**
   * One streamed completion. Yields per-chunk deltas: any text content and any
   * tool-call fragments (OpenAI streams `arguments` as a growing string, keyed
   * by `index`, which the caller stitches together).
   */
  private async *streamCompletion(
    messages: OpenAiMessage[],
    tools: ReturnType<typeof toOpenAiTool>[],
  ): AsyncGenerator<{
    content?: string;
    toolCalls: Array<{ index: number; id?: string; name?: string; args?: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        // Optional OpenRouter attribution headers; harmless on other providers.
        "HTTP-Referer": "https://kichkintoy.app",
        "X-Title": "Kichkintoy",
      },
      body: JSON.stringify({
        model: this.model,
        // OpenRouter fallback routing: tries each model in order when the
        // previous one errors or is rate-limited. Omitted for other providers.
        models:
          this.fallbackModels.length > 0
            ? [this.model, ...this.fallbackModels]
            : undefined,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 1200,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const body = await response.text().catch(() => "");
      throw new ServiceUnavailableException(
        `AI chat failed: ${response.status} ${body.slice(0, 200)}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are newline-delimited `data: {...}` lines, `data: [DONE]` ends.
      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        const json = line.slice("data:".length).trim();
        if (!json || json === "[DONE]") continue;
        let parsed: {
          choices?: Array<{
            delta?: {
              content?: string | null;
              tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }>;
            };
          }>;
        };
        try {
          parsed = JSON.parse(json);
        } catch {
          continue;
        }
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        yield {
          content: delta.content ?? undefined,
          toolCalls: (delta.tool_calls ?? []).map((tc) => ({
            index: tc.index,
            id: tc.id,
            name: tc.function?.name,
            args: tc.function?.arguments,
          })),
        };
      }
    }
  }
}

/** Gemini-style declaration → OpenAI `tools[]` entry (the schema is compatible). */
function toOpenAiTool(tool: ToolDeclaration) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/** Tool-call arguments arrive as a JSON string; tolerate empty/partial. */
function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
