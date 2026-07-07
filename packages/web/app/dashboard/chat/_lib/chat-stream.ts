import { apiBaseUrl, authTokenStorageKey } from "@/lib/config";

export type ChatStreamEvent =
  | { type: "delta"; value: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; message: string };

const STREAM_URL = `${apiBaseUrl}/chat/stream`;

/**
 * POST a turn to the chat SSE endpoint and yield parsed events as they arrive.
 * The backend derives the owner role from the session (parent or teacher),
 * runs the Gemini tool-loop with the scoped toolset, and streams text deltas.
 */
export async function* streamChatTurn(input: {
  threadId: string;
  message: string;
  childId?: string;
  appLanguage?: string;
  signal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(authTokenStorageKey)
      : null;

  const response = await fetch(STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      threadId: input.threadId,
      message: input.message,
      ...(input.childId ? { childId: input.childId } : {}),
      ...(input.appLanguage ? { appLanguage: input.appLanguage } : {}),
    }),
    signal: input.signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    yield {
      type: "error",
      message: body.slice(0, 200) || `Request failed (${response.status})`,
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n");
    while (boundary !== -1) {
      const line = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      boundary = buffer.indexOf("\n");
      if (!line.startsWith("data:")) continue;
      const json = line.slice("data:".length).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as ChatStreamEvent;
      } catch {
        // ignore malformed frame
      }
    }
  }
}
