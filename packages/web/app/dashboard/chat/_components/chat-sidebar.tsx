"use client";

import { MessageCircle, Plus, Trash2 } from "lucide-react";
import type { ChatThreadSummary } from "@kichkintoy/shared";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { MascotAvatar } from "./mascot-avatar";

export function ChatSidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLayoutTranslation("chat");

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <MascotAvatar className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate font-kids text-base font-bold leading-tight text-sidebar-foreground">
            {t("title")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("newChat")}
        </button>
      </div>

      <p className="px-4 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("history")}
      </p>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {threads.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("noThreads")}
          </p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                thread.id === activeId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageCircle className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">{thread.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(thread.id)}
                aria-label={t("delete")}
                className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}
