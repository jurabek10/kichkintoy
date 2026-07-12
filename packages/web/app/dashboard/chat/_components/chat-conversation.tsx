"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
  useMessagePartText,
} from "@assistant-ui/react";
import {
  Armchair,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  CalendarDays,
  Gauge,
  PenLine,
  Pill,
  Sprout,
  Sun,
  UserPlus,
  UserX,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { AssistantAvatar } from "./assistant-avatar";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm [&_p]:leading-relaxed">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

/* The default Text part appends a streaming cursor dot; we render the text
   ourselves (the bubble is whitespace-pre-wrap) and let WorkingStatus carry
   the "still busy" signal instead. The model answers with markdown-style
   **bold** — render that inline rather than showing raw asterisks. */
function PlainText() {
  const { text } = useMessagePartText();
  const segments = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {segments.map((segment, i) =>
        i % 2 === 1 ? <strong key={i}>{segment}</strong> : segment,
      )}
    </>
  );
}

/*
 * Narrates what the assistant is doing until the first words of the answer
 * arrive. The adapter stamps the run's stage into message metadata:
 * "thinking" before any tool call, "searching" once the model starts looking
 * things up. Self-gates on real text so the bubble is never a blank strip.
 */
function WorkingStatus() {
  const { t } = useLayoutTranslation("chat");
  const stage = useMessage(
    (m) =>
      (m.metadata?.custom as { stage?: "thinking" | "searching" } | undefined)
        ?.stage,
  );
  const hasText = useMessage((m) =>
    m.content.some((part) => part.type === "text" && part.text.length > 0),
  );
  if (hasText) return null;
  return (
    <span className="flex items-center gap-2 py-0.5 text-sm text-muted-foreground">
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/80 motion-reduce:animate-none" />
      <span className="animate-pulse motion-reduce:animate-none">
        {stage === "searching" ? t("lookingUp") : t("thinking")}
      </span>
    </span>
  );
}

function AssistantMessage() {
  const { t } = useLayoutTranslation("chat");
  return (
    <MessagePrimitive.Root className="flex items-start gap-3">
      <AssistantAvatar className="mt-0.5 h-8 w-8" />
      <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-card-foreground shadow-sm ring-1 ring-border/60 [&_p]:leading-relaxed">
        {/* Before the first token arrives the bubble would sit empty — narrate
            the current stage instead, but only while the turn is running. */}
        <ThreadPrimitive.If running>
          <MessagePrimitive.If last>
            <WorkingStatus />
          </MessagePrimitive.If>
        </ThreadPrimitive.If>
        <MessagePrimitive.Parts components={{ Text: PlainText }} />
        <MessagePrimitive.Error>
          <p className="text-sm text-destructive">{t("errorTitle")}</p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

type Tone = "coral" | "sunshine" | "mint" | "sky" | "grape";

/* Candy icon tiles — same soft-fill + deep-ink pairing the mobile home screen
   and PageHeading use, so each theme (incl. the director's muted family)
   remaps them automatically. */
const TILE_TONES: Record<Tone, string> = {
  coral: "bg-coral text-coral-ink",
  sunshine: "bg-sunshine text-sunshine-ink",
  mint: "bg-mint text-mint-ink",
  sky: "bg-sky text-sky-ink",
  grape: "bg-grape text-grape-ink",
};

type Suggestion = {
  key: string;
  prompt: string;
  tone: Tone;
  Icon: LucideIcon;
};

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
    { key: "absentToday", prompt: t("teacher.suggestions.absentToday"), tone: "coral", Icon: UserX },
    { key: "mostAbsent", prompt: t("teacher.suggestions.mostAbsent"), tone: "sunshine", Icon: CalendarClock },
    { key: "unwrittenReports", prompt: t("teacher.suggestions.unwrittenReports"), tone: "mint", Icon: PenLine },
    { key: "medicationDue", prompt: t("teacher.suggestions.medicationDue"), tone: "sky", Icon: Pill },
    { key: "events", prompt: t("teacher.suggestions.events"), tone: "grape", Icon: CalendarDays },
  ];

  // Director chips are center-wide, spanning operations and tuition.
  const directorSuggestions: Suggestion[] = [
    { key: "snapshot", prompt: t("director.suggestions.snapshot"), tone: "sky", Icon: Gauge },
    { key: "unpaidTuition", prompt: t("director.suggestions.unpaidTuition"), tone: "mint", Icon: Wallet },
    { key: "absentToday", prompt: t("director.suggestions.absentToday"), tone: "coral", Icon: UserX },
    { key: "joinRequests", prompt: t("director.suggestions.joinRequests"), tone: "sunshine", Icon: UserPlus },
    { key: "emptySeats", prompt: t("director.suggestions.emptySeats"), tone: "grape", Icon: Armchair },
  ];

  const parentSuggestions: Suggestion[] = [
    {
      key: "today",
      prompt: withName("suggestions.today", "suggestions.todayGeneric"),
      tone: "coral",
      Icon: Sun,
    },
    {
      key: "development",
      prompt: withName(
        "suggestions.development",
        "suggestions.developmentGeneric",
      ),
      tone: "mint",
      Icon: Sprout,
    },
    { key: "events", prompt: t("suggestions.events"), tone: "sky", Icon: CalendarDays },
    { key: "notices", prompt: t("suggestions.notices"), tone: "sunshine", Icon: Bell },
    { key: "meals", prompt: t("suggestions.meals"), tone: "grape", Icon: UtensilsCrossed },
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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <AssistantAvatar className="h-14 w-14" />
      <h2 className="mt-5 max-w-lg text-center font-kids text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {subtitle}
      </p>
      {/* Starter cards — the flagship question spans the full row, the rest
          pair up beneath it. Each is one tap away from a real answer. */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {suggestions.map((s, index) => (
          <ThreadPrimitive.Suggestion
            key={s.key}
            prompt={s.prompt}
            method="replace"
            autoSend
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-border hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              index === 0 && "sm:col-span-2",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-hover:scale-105",
                TILE_TONES[s.tone],
              )}
            >
              <s.Icon className="h-[18px] w-[18px]" />
            </span>
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

      <div className="relative border-t border-border/60 bg-background/80 px-4 pb-3 pt-3 backdrop-blur md:px-8">
        <ThreadPrimitive.ScrollToBottom
          aria-label={t("scrollToBottom")}
          className="absolute -top-12 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:text-foreground disabled:invisible"
        >
          <ArrowDown className="h-4 w-4" />
        </ThreadPrimitive.ScrollToBottom>

        <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[1.35rem] border border-border bg-card p-2 pl-4 shadow-sm transition focus-within:border-ring/40 focus-within:ring-2 focus-within:ring-ring/30">
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder={placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <ComposerPrimitive.Send
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            aria-label={t("send")}
          >
            <ArrowUp className="h-4 w-4" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] leading-tight text-muted-foreground/80">
          {t("disclaimer")}
        </p>
      </div>
    </ThreadPrimitive.Root>
  );
}
