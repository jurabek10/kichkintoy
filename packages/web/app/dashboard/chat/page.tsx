"use client";

import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSession } from "@/lib/session";
import { ChatApp } from "./_components/chat-app";
import { AssistantAvatar } from "./_components/assistant-avatar";

export default function DashboardChatPage() {
  const { session, loading } = useSession();
  const { t } = useLayoutTranslation("chat");

  if (loading || !session) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  const role = session.user.role;
  if (role !== "parent" && role !== "teacher") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AssistantAvatar className="h-16 w-16" />
        <h2 className="font-kids text-2xl font-bold text-foreground">
          {t("notParentTitle")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("notParentBody")}
        </p>
      </div>
    );
  }

  return <ChatApp variant={role === "teacher" ? "teacher" : "parent"} />;
}
