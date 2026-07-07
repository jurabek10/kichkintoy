"use client";

import { useMemo, useRef } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { createChatAdapter } from "../_lib/chat-adapter";
import { ChatConversation } from "./chat-conversation";

/** Normalise an i18n language tag (e.g. "uz-UZ") to the chat-supported set. */
function normalizeLanguage(lang: string | undefined): string | undefined {
  const base = lang?.slice(0, 2).toLowerCase();
  return base === "uz" || base === "ru" || base === "en" ? base : undefined;
}

/**
 * Owns the assistant-ui runtime for a single thread. Seeds it with the thread's
 * persisted messages, then streams new turns through our SSE adapter. Keyed by
 * threadId upstream so switching threads remounts with fresh state.
 */
export function ChatThread({
  threadId,
  variant = "parent",
  childId,
  childName,
  onTurnComplete,
}: {
  threadId: string;
  variant?: "parent" | "teacher";
  childId: string | undefined;
  childName: string | null;
  onTurnComplete: () => void;
}) {
  const childIdRef = useRef(childId);
  childIdRef.current = childId;

  const { i18n } = useLayoutTranslation();
  const languageRef = useRef(i18n.language);
  languageRef.current = i18n.language;

  const { data, isLoading } = useQuery({
    queryKey: ["chat", "thread", threadId],
    queryFn: () => orpc.chat.getThread({ threadId }),
    staleTime: 0,
  });

  const initialMessages: ThreadMessageLike[] = useMemo(
    () =>
      (data?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    [data?.messages],
  );

  const adapter = useMemo(
    () =>
      createChatAdapter({
        threadId,
        getChildId: () => childIdRef.current,
        getAppLanguage: () => normalizeLanguage(languageRef.current),
        onDone: onTurnComplete,
      }),
    [threadId, onTurnComplete],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatConversation variant={variant} childName={childName} />
    </AssistantRuntimeProvider>
  );
}
