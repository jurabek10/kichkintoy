import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { ToolDeclaration } from "./chat-tools.service";
import type {
  ChatEngine,
  ChatStreamOptions,
  ChatStreamEvent,
} from "./chat-engine";

const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";

const MAX_TOOL_ROUNDS = 5;

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: { result: unknown } };
};

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

/**
 * Runs the Gemini 2.5 Flash tool-loop for a chat turn and streams the final
 * answer as text deltas. Tool calls are executed via the injected executor
 * (scoped server-side); their results are fed back to the model.
 */
@Injectable()
export class GeminiChatService implements ChatEngine {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException(
        "AI chat is not configured (GEMINI_API_KEY missing).",
      );
    }
    this.apiKey = key;
  }

  async *streamAnswer(opts: ChatStreamOptions): AsyncGenerator<ChatStreamEvent> {
    const contents: GeminiContent[] = opts.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const modelParts: GeminiPart[] = [];
      const functionCalls: Array<{
        name: string;
        args: Record<string, unknown>;
      }> = [];

      for await (const part of this.streamParts(opts.systemPrompt, contents, opts.tools)) {
        if (part.text) {
          yield { type: "text", value: part.text };
          modelParts.push({ text: part.text });
        } else if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          });
          modelParts.push(part);
        }
      }

      if (functionCalls.length === 0) {
        return; // model produced a final text answer
      }

      // Record the model's tool-call turn, then execute and feed results back.
      contents.push({ role: "model", parts: modelParts });
      const responseParts: GeminiPart[] = [];
      for (const call of functionCalls) {
        yield { type: "tool", name: call.name };
        let result: unknown;
        try {
          result = await opts.executeTool(call.name, call.args);
        } catch (error) {
          result = {
            error: error instanceof Error ? error.message : "tool failed",
          };
        }
        responseParts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }

    // Tool budget exhausted: force one final turn with NO tools so the model
    // must answer in text instead of leaving the user with a blank bubble.
    let produced = false;
    for await (const part of this.streamParts(opts.systemPrompt, contents, [])) {
      if (part.text) {
        produced = true;
        yield { type: "text", value: part.text };
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

  /** One streamed model call; yields text deltas and any functionCall parts. */
  private async *streamParts(
    systemPrompt: string,
    contents: GeminiContent[],
    tools: ToolDeclaration[],
  ): AsyncGenerator<GeminiPart> {
    const response = await fetch(
      `${GEMINI_STREAM_URL}?alt=sse&key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: [{ functionDeclarations: tools }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1200,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

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

      // SSE frames are separated by blank lines; each frame has `data: {...}`.
      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        const json = line.slice("data:".length).trim();
        if (!json || json === "[DONE]") continue;
        let parsed: {
          candidates?: { content?: { parts?: GeminiPart[] } }[];
        };
        try {
          parsed = JSON.parse(json);
        } catch {
          continue;
        }
        for (const part of parsed.candidates?.[0]?.content?.parts ?? []) {
          yield part;
        }
      }
    }
  }
}
