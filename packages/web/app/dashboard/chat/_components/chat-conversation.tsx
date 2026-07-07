"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowUp } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { AssistantAvatar } from "./assistant-avatar";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex items-start gap-3">
      <AssistantAvatar className="mt-0.5 h-8 w-8" />
      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-card-foreground shadow-sm ring-1 ring-border/60 [&_p]:leading-relaxed">
        <MessagePrimitive.Parts />
        <MessagePrimitive.Error>
          <p className="text-sm text-destructive">·</p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

type Suggestion = { key: string; prompt: string; accent: string };

const ACCENTS = {
  coral: "bg-coral/12 text-coral-ink ring-coral/25 hover:bg-coral/20",
  mint: "bg-mint/12 text-mint-ink ring-mint/25 hover:bg-mint/20",
  sky: "bg-sky/12 text-sky-ink ring-sky/25 hover:bg-sky/20",
  sunshine:
    "bg-sunshine/15 text-sunshine-ink ring-sunshine/30 hover:bg-sunshine/25",
  grape: "bg-grape/12 text-grape-ink ring-grape/25 hover:bg-grape/20",
} as const;

function EmptyState({
  variant,
  childName,
}: {
  variant: "parent" | "teacher" | "director";
  childName: string | null;
}) {
  const { t } = useLayoutTranslation("chat");
  const name = childName ?? "";
  const withName = (k: string, generic: string) =>
    childName ? t(k, { name }) : t(generic);

  // Teacher chips are class-wide (no child name); each carries a domain accent.
  const teacherSuggestions: Suggestion[] = [
    { key: "absentToday", prompt: t("teacher.suggestions.absentToday"), accent: ACCENTS.coral },
    { key: "mostAbsent", prompt: t("teacher.suggestions.mostAbsent"), accent: ACCENTS.sunshine },
    { key: "unwrittenReports", prompt: t("teacher.suggestions.unwrittenReports"), accent: ACCENTS.mint },
    { key: "medicationDue", prompt: t("teacher.suggestions.medicationDue"), accent: ACCENTS.sky },
    { key: "events", prompt: t("teacher.suggestions.events"), accent: ACCENTS.grape },
  ];

  // Director chips are center-wide, spanning operations and tuition.
  const directorSuggestions: Suggestion[] = [
    { key: "snapshot", prompt: t("director.suggestions.snapshot"), accent: ACCENTS.sky },
    { key: "unpaidTuition", prompt: t("director.suggestions.unpaidTuition"), accent: ACCENTS.mint },
    { key: "absentToday", prompt: t("director.suggestions.absentToday"), accent: ACCENTS.coral },
    { key: "joinRequests", prompt: t("director.suggestions.joinRequests"), accent: ACCENTS.sunshine },
    { key: "emptySeats", prompt: t("director.suggestions.emptySeats"), accent: ACCENTS.grape },
  ];

  const parentSuggestions: Suggestion[] = [
    {
      key: "today",
      prompt: withName("suggestions.today", "suggestions.todayGeneric"),
      accent: ACCENTS.coral,
    },
    {
      key: "development",
      prompt: withName(
        "suggestions.development",
        "suggestions.developmentGeneric",
      ),
      accent: ACCENTS.mint,
    },
    { key: "events", prompt: t("suggestions.events"), accent: ACCENTS.sky },
    { key: "notices", prompt: t("suggestions.notices"), accent: ACCENTS.sunshine },
    { key: "meals", prompt: t("suggestions.meals"), accent: ACCENTS.grape },
  ];

  const suggestions =
    variant === "teacher"
      ? teacherSuggestions
      : variant === "director"
        ? directorSuggestions
        : parentSuggestions;

  const title =
    variant === "teacher"
      ? t("teacher.emptyTitle")
      : variant === "director"
        ? t("director.emptyTitle")
        : childName
          ? t("emptyTitle", { name })
          : t("emptyTitleGeneric");
  const subtitle =
    variant === "teacher"
      ? t("teacher.emptySubtitle")
      : variant === "director"
        ? t("director.emptySubtitle")
        : t("emptySubtitle");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <AssistantAvatar className="h-16 w-16" />
      <h2 className="mt-5 font-kids text-2xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-7 flex max-w-xl flex-wrap justify-center gap-2.5">
        {suggestions.map((s) => (
          <ThreadPrimitive.Suggestion
            key={s.key}
            prompt={s.prompt}
            method="replace"
            autoSend
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors",
              s.accent,
            )}
          >
            {s.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

export function ChatConversation({
  variant = "parent",
  childName,
}: {
  variant?: "parent" | "teacher" | "director";
  childName: string | null;
}) {
  const { t } = useLayoutTranslation("chat");
  const placeholder =
    variant === "teacher"
      ? t("teacher.composerPlaceholder")
      : variant === "director"
        ? t("director.composerPlaceholder")
        : childName
          ? t("composerPlaceholder", { name: childName })
          : t("composerPlaceholderGeneric");

  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 md:px-8">
        <ThreadPrimitive.Empty>
          <EmptyState variant={variant} childName={childName} />
        </ThreadPrimitive.Empty>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      <div className="border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:px-8">
        <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder={placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <ComposerPrimitive.Send
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            aria-label={t("send")}
          >
            <ArrowUp className="h-4 w-4" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}
