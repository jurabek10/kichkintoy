import { fetch } from "expo/fetch";

export type MobileChatStreamEvent =
  | { type: "delta"; value: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Streams one assistant turn with Expo's WinterCG fetch implementation. Unlike
 * React Native's historical fetch polyfill, expo/fetch exposes response.body
 * as a real ReadableStream on both iOS and Android.
 */
export async function* streamMobileChatTurn(input: {
  apiBaseUrl: string;
  token: string | null;
  threadId: string;
  message: string;
  appLanguage?: string;
  signal?: AbortSignal;
}): AsyncGenerator<MobileChatStreamEvent> {
  const response = await fetch(
    `${input.apiBaseUrl.replace(/\/$/, "")}/chat/stream`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      body: JSON.stringify({
        threadId: input.threadId,
        message: input.message,
        ...(input.appLanguage ? { appLanguage: input.appLanguage } : {}),
      }),
      signal: input.signal,
    },
  );

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
        yield JSON.parse(json) as MobileChatStreamEvent;
      } catch {
        // A malformed frame must not discard the rest of a healthy stream.
      }
    }
  }
}
