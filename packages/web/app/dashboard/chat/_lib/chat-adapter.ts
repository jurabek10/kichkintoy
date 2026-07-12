import type {
  ChatModelAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import { streamChatTurn } from "./chat-stream";

function lastUserText(messages: readonly ThreadMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

/**
 * Bridges assistant-ui's LocalRuntime to our NestJS SSE endpoint. The backend
 * owns history + persistence (keyed by threadId), so we send only the latest
 * user message and stream the answer back as cumulative text.
 */
export function createChatAdapter(refs: {
  threadId: string;
  getAppLanguage: () => string | undefined;
  onDone?: () => void;
}): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const message = lastUserText(messages);
      let text = "";
      // Surfaced to the UI while the answer is still empty: "thinking" until
      // the model reaches for a tool, "searching" from the first tool call on.
      let stage: "thinking" | "searching" = "thinking";

      for await (const event of streamChatTurn({
        threadId: refs.threadId,
        message,
        appLanguage: refs.getAppLanguage(),
        signal: abortSignal,
      })) {
        if (event.type === "delta") {
          text += event.value;
          yield {
            content: [{ type: "text", text }],
            metadata: { custom: { stage } },
          };
        } else if (event.type === "tool") {
          stage = "searching";
          // No text part yet — an empty one would make the bubble render
          // blank instead of the "searching…" status line.
          yield {
            content: text ? [{ type: "text", text }] : [],
            metadata: { custom: { stage } },
          };
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }

      refs.onDone?.();
      yield { content: text ? [{ type: "text", text }] : [] };
    },
  };
}
