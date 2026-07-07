"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./chat-sidebar";
import { ChatThread } from "./chat-thread";
import { DeleteChatDialog } from "./delete-chat-dialog";

export function ChatApp({
  variant = "parent",
}: {
  variant?: "parent" | "teacher";
}) {
  const { t } = useLayoutTranslation("chat");
  const queryClient = useQueryClient();
  const isTeacher = variant === "teacher";

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const threadsQuery = useQuery({
    queryKey: ["chat", variant, "threads"],
    queryFn: () => orpc.chat.listThreads({}),
  });
  // Teachers have no child-picker — the assistant is scoped to their classes.
  const childrenQuery = useQuery({
    queryKey: ["chat", "children"],
    queryFn: () => orpc.profile.listChildren({}),
    enabled: !isTeacher,
  });

  const threads = threadsQuery.data?.items ?? [];
  const children = isTeacher ? [] : childrenQuery.data ?? [];
  const activeChild =
    children.find((c) => c.id === selectedChildId) ??
    children.find((c) => c.isPrimary) ??
    children[0];

  // Default the child selection once children load.
  useEffect(() => {
    if (isTeacher) return;
    if (!selectedChildId && activeChild) setSelectedChildId(activeChild.id);
  }, [activeChild, selectedChildId, isTeacher]);

  const createThread = useMutation({
    mutationFn: () =>
      orpc.chat.createThread(
        selectedChildId ? { childId: selectedChildId } : {},
      ),
    onSuccess: (thread) => {
      setActiveThreadId(thread.id);
      setMobileOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["chat", variant, "threads"] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  // Ensure there is always an active thread to talk to.
  useEffect(() => {
    if (threadsQuery.isLoading || activeThreadId) return;
    if (threads.length > 0) {
      setActiveThreadId(threads[0].id);
    } else if (!creatingRef.current) {
      creatingRef.current = true;
      createThread.mutate(undefined, {
        onSettled: () => {
          creatingRef.current = false;
        },
      });
    }
  }, [threadsQuery.isLoading, threads, activeThreadId, createThread]);

  const renameThread = useMutation({
    mutationFn: (input: { threadId: string; title: string }) =>
      orpc.chat.renameThread(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", variant, "threads"] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteThread = useMutation({
    mutationFn: (id: string) => orpc.chat.deleteThread({ threadId: id }),
    onSuccess: (_res, id) => {
      if (id === activeThreadId) setActiveThreadId(null);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["chat", variant, "threads"] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const handleRename = (id: string, title: string) =>
    renameThread.mutate({ threadId: id, title });

  const onTurnComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["chat", variant, "threads"] });
  }, [queryClient, variant]);

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-card",
        // Break out of the dashboard's padded, max-width content box so the
        // chat fills the screen like a real app surface, not a floating card.
        "-mx-4 -mt-6 -mb-24 sm:-mx-6 lg:-mx-8 lg:-my-8",
        // Full height minus the sticky top bar; leave room for the parent
        // bottom tab bar on mobile so the composer never hides behind it.
        "h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)]",
      )}
    >
      {/* Thread list — persistent on desktop, drawer on mobile */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border md:block">
        <ChatSidebar
          threads={threads}
          activeId={activeThreadId}
          onSelect={setActiveThreadId}
          onNew={() => createThread.mutate()}
          onRename={handleRename}
          onDelete={setDeleteTarget}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-sidebar-border shadow-xl">
            <ChatSidebar
              threads={threads}
              activeId={activeThreadId}
              onSelect={(id) => {
                setActiveThreadId(id);
                setMobileOpen(false);
              }}
              onNew={() => createThread.mutate()}
              onRename={handleRename}
              onDelete={setDeleteTarget}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 md:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            aria-label={t("history")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex-1 truncate font-kids text-sm font-semibold text-foreground md:hidden">
            {t("title")}
          </span>
          {!isTeacher && children.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("childPicker")}</span>
              <select
                value={selectedChildId ?? ""}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/40"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>

        <main className="min-h-0 flex-1">
          {activeThreadId ? (
            <ChatThread
              key={activeThreadId}
              threadId={activeThreadId}
              variant={variant}
              childId={isTeacher ? undefined : selectedChildId}
              childName={isTeacher ? null : activeChild?.firstName ?? null}
              onTurnComplete={onTurnComplete}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className={cn("flex gap-2")}>
                <span className="h-3 w-3 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
                <span className="h-3 w-3 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
                <span className="h-3 w-3 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </main>
      </div>

      <DeleteChatDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        loading={deleteThread.isPending}
        onConfirm={() => deleteTarget && deleteThread.mutate(deleteTarget)}
      />
    </div>
  );
}
