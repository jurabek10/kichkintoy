import type { ToolDeclaration } from "./chat-tools.service";

/**
 * Provider-agnostic contract for the AI chat backend. Both the Gemini engine and
 * the OpenAI-compatible engine (OpenRouter / Groq / Ollama / …) implement this,
 * so the controller streams a turn without caring which model answers.
 */

export type ChatTurnMessage = { role: "user" | "assistant"; content: string };

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

export type ChatStreamEvent =
  | { type: "text"; value: string }
  | { type: "tool"; name: string };

export type ChatStreamOptions = {
  systemPrompt: string;
  history: ChatTurnMessage[];
  tools: ToolDeclaration[];
  executeTool: ToolExecutor;
};

export interface ChatEngine {
  streamAnswer(opts: ChatStreamOptions): AsyncGenerator<ChatStreamEvent>;
}

/** DI token; the module binds it to the engine chosen by CHAT_PROVIDER. */
export const CHAT_ENGINE = Symbol("CHAT_ENGINE");
