"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ChatThreadSummary } from "@kichkintoy/shared";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

const GROUP_ORDER = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

/** Bucket a thread by how long ago it was last touched (ChatGPT-style rail). */
function groupKeyFor(updatedAt: string, startOfToday: number): GroupKey {
  const ts = new Date(updatedAt).getTime();
  const day = 86_400_000;
  if (ts >= startOfToday) return "today";
  if (ts >= startOfToday - day) return "yesterday";
  if (ts >= startOfToday - 7 * day) return "thisWeek";
  if (ts >= startOfToday - 30 * day) return "thisMonth";
  return "older";
}

function groupThreads(
  threads: ChatThreadSummary[],
): Array<{ key: GroupKey; items: ChatThreadSummary[] }> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const buckets = new Map<GroupKey, ChatThreadSummary[]>();
  // Threads arrive newest-first from the API, so bucket order is preserved.
  for (const thread of threads) {
    const key = groupKeyFor(thread.updatedAt, startOfToday);
    const list = buckets.get(key) ?? [];
    list.push(thread);
    buckets.set(key, list);
  }
  return GROUP_ORDER.filter((key) => buckets.get(key)?.length).map((key) => ({
    key,
    items: buckets.get(key)!,
  }));
}

/*
 * The thread rail is a light page surface (card tokens), NOT the sidebar-*
 * family: the director theme paints its nav rail dark slate, and stacking a
 * second dark rail next to it made the chat page read as one murky wall.
 * A white rail separates cleanly on every theme.
 */
export function ChatSidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLayoutTranslation("chat");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startRename = (thread: ChatThreadSummary) => {
    setEditingId(thread.id);
    setDraft(thread.title);
  };

  const commitRename = () => {
    if (!editingId) return;
    const next = draft.trim();
    if (next) onRename(editingId, next);
    setEditingId(null);
  };

  const groups = groupThreads(threads);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Plus className="h-4 w-4" />
          {t("newChat")}
        </button>
      </div>

      <nav className="mt-3 flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <MessageCircle className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("noThreads")}</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`groups.${group.key}`)}
              </p>
              <div className="space-y-0.5">
                {group.items.map((thread) => {
                  const isActive = thread.id === activeId;
                  const isEditing = thread.id === editingId;

                  if (isEditing) {
                    return (
                      <div
                        key={thread.id}
                        className="flex items-center gap-1 rounded-xl bg-muted px-2 py-1.5"
                      >
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="min-w-0 flex-1 rounded-md bg-card px-2 py-1 text-sm text-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-ring"
                          aria-label={t("renamePrompt")}
                        />
                        <button
                          type="button"
                          onClick={commitRename}
                          aria-label={t("renameSave")}
                          className="shrink-0 rounded-md p-1 text-primary hover:bg-primary/10"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label={t("renameCancel")}
                          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-card"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={thread.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-xl px-1 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-foreground/80 hover:bg-muted",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(thread.id)}
                        className="min-w-0 flex-1 truncate py-2 pl-2 text-left"
                      >
                        {thread.title}
                      </button>
                      <div
                        className={cn(
                          "flex shrink-0 items-center transition-opacity",
                          isActive
                            ? "opacity-100"
                            : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => startRename(thread)}
                          aria-label={t("rename")}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(thread.id)}
                          aria-label={t("delete")}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </nav>
    </div>
  );
}
