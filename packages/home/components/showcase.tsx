"use client";

import {
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Images,
  MessageCircle,
  Moon,
  SendHorizontal,
  Smile,
  Sparkles,
  Triangle,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/** Slim phone frame for the feature "screenshots" — every screen inside is a
 *  hand-built copy of the real mobile app UI (colors from packages/mobile). */
function ScreenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] animate-float-slow rounded-[2.6rem] bg-[#3A3C42] p-[4px] shadow-pop">
      <div className="relative overflow-hidden rounded-[2.35rem] border-4 border-black bg-[#F2F3F5]">
        <div className="absolute left-1/2 top-2 z-10 h-[20px] w-[76px] -translate-x-1/2 rounded-full bg-black" />
        <div className="flex h-[560px] flex-col px-3 pb-4 pt-8">{children}</div>
      </div>
    </div>
  );
}

/** The mobile ScreenHeader: back chevron + bold title. */
function ScreenHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-0.5 pb-2.5">
      <ChevronLeft className="h-4 w-4 text-[#2B2D31]" />
      <p className="text-[13px] font-extrabold text-[#2B2D31]">{title}</p>
    </div>
  );
}

/** Blob backdrop behind each phone, kidsnote-style. */
function PhoneBlob({
  tint,
  children,
}: {
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto w-fit rounded-[3rem] bg-white p-7 shadow-card sm:p-10">
      <div
        aria-hidden="true"
        className={cn(
          "absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl",
          tint,
        )}
      />
      {children}
    </div>
  );
}

/* ------------------------------ screens ------------------------------ */

function ChatScreen() {
  const { t } = useLayoutTranslation("home");
  return (
    <ScreenFrame>
      <div className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-card">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-grape text-grape-ink">
          <Sparkles className="h-4 w-4" />
        </span>
        <span>
          <p className="text-[11px] font-bold text-[#2B2D31]">
            {t("showcase.chat.screen.title")}
          </p>
          <p className="text-[9px] font-semibold text-mint-ink">
            {t("showcase.chat.screen.status")}
          </p>
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#3B8FF3] px-3 py-2 text-[10.5px] font-semibold leading-snug text-white">
          {t("showcase.chat.screen.question")}
        </div>
        <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-card">
          <p className="text-[10.5px] font-semibold leading-relaxed text-[#2B2D31]">
            {t("showcase.chat.screen.answerIntro")}
          </p>
          <div className="mt-2 space-y-1.5">
            {(
              [
                { Icon: CalendarCheck2, tint: "bg-mint text-mint-ink", key: "answerAttendance" },
                { Icon: UtensilsCrossed, tint: "bg-sunshine text-sunshine-ink", key: "answerMeal" },
                { Icon: Images, tint: "bg-grape text-grape-ink", key: "answerPhotos" },
              ] as const
            ).map(({ Icon, tint, key }) => (
              <p key={key} className="flex items-center gap-1.5 text-[9.5px] font-semibold text-[#5A5E66]">
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md", tint)}>
                  <Icon className="h-3 w-3" />
                </span>
                {t(`showcase.chat.screen.${key}`)}
              </p>
            ))}
          </div>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-card">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-[#3B8FF3]"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between rounded-full bg-white py-2 pl-3.5 pr-2 shadow-card">
        <span className="text-[10px] font-semibold text-[#AEB4BE]">
          {t("showcase.chat.screen.placeholder")}
        </span>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#3B8FF3] text-white">
          <SendHorizontal className="h-3 w-3" />
        </span>
      </div>
    </ScreenFrame>
  );
}

function ReportScreen() {
  const { t } = useLayoutTranslation("home");
  return (
    <ScreenFrame>
      <div className="rounded-2xl bg-white p-3 shadow-card">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-coral px-2 py-0.5 text-[8.5px] font-bold text-coral-ink">
            {t("phone.tiles.reports")}
          </span>
          <span className="text-[9px] font-semibold text-[#AEB4BE]">
            {t("phone.feedDate")}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] font-bold text-[#2B2D31]">
          {t("showcase.reports.screen.title")}
        </p>
        <p className="mt-1 text-[9.5px] font-semibold leading-relaxed text-[#8A8F99]">
          {t("showcase.reports.screen.note")}
        </p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {(
          [
            { Icon: Smile, tint: "bg-sunshine text-sunshine-ink", key: "mood" },
            { Icon: UtensilsCrossed, tint: "bg-coral text-coral-ink", key: "meal" },
            { Icon: Moon, tint: "bg-sky text-sky-ink", key: "nap" },
          ] as const
        ).map(({ Icon, tint, key }) => (
          <div key={key} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tint)}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold text-[#8A8F99]">
                {t(`showcase.reports.screen.${key}Label`)}
              </p>
              <p className="truncate text-[10.5px] font-bold text-[#2B2D31]">
                {t(`showcase.reports.screen.${key}Value`)}
              </p>
            </span>
          </div>
        ))}
      </div>

      {/* Photo strip — real photos, like the report's attached media */}
      <div className="mt-auto grid grid-cols-3 gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/kichkintoy-report1/200/240"
          alt=""
          className="h-20 w-full rounded-xl object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/kichkintoy-report2/200/240"
          alt=""
          className="h-20 w-full rounded-xl object-cover"
        />
        <span className="relative h-20 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/kichkintoy-report3/200/240"
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-[12px] font-extrabold text-white">
            +4
          </span>
        </span>
      </div>
    </ScreenFrame>
  );
}

/* June 2026 (Sunday-first, 1st falls on Monday) exactly as the app's
 * AttendanceCalendar renders it: mint = present (with the check-in time),
 * sunshine △ = excused, coral ✕ = absent, blue ring = today (the 12th). */
type DayCell = {
  day: number;
  inMonth: boolean;
  status?: "present" | "excused" | "absent";
  time?: string;
  today?: boolean;
};

function attendanceMonth(): DayCell[][] {
  const times = ["08:45", "08:52", "08:39", "08:47", "08:55", "08:41", "08:49", "08:44"];
  const cells: DayCell[] = [{ day: 31, inMonth: false }];
  for (let day = 1; day <= 30; day += 1) {
    const column = (cells.length) % 7;
    const weekend = column === 0 || column === 6;
    const cell: DayCell = { day, inMonth: true, today: day === 12 };
    if (!weekend && day <= 12) {
      if (day === 5) cell.status = "excused";
      else if (day === 10) cell.status = "absent";
      else {
        cell.status = "present";
        cell.time = times[day % times.length];
      }
    }
    cells.push(cell);
  }
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, inMonth: false });
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function AttendanceScreen() {
  const { t } = useLayoutTranslation("home");
  const weekdays = t("showcase.attendance.screen.weekdays").split(",");
  const weeks = attendanceMonth();

  return (
    <ScreenFrame>
      <ScreenHeader title={t("phone.tiles.attendance")} />
      <div className="rounded-2xl bg-white p-2.5 shadow-card">
        {/* Tag + Today pill (the real card's top row) */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[8.5px] font-bold text-mint-ink">
            <CalendarCheck2 className="h-2.5 w-2.5" />
            {t("phone.tiles.attendance")}
          </span>
          <span className="rounded-full border border-[#EFEFF1] px-2 py-0.5 text-[8.5px] font-semibold text-[#8A8F99]">
            {t("phone.today")}
          </span>
        </div>

        {/* Month navigation */}
        <div className="mt-1.5 flex items-center justify-between px-1">
          <ChevronLeft className="h-3.5 w-3.5 text-[#8A8F99]" />
          <span className="text-center">
            <p className="text-[8px] font-semibold text-[#8A8F99]">2026</p>
            <p className="text-[12px] font-extrabold leading-tight text-[#2B2D31]">
              {t("showcase.attendance.screen.month")}
            </p>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#8A8F99]" />
        </div>

        {/* Weekday header */}
        <div className="mt-1.5 grid grid-cols-7">
          {weekdays.map((name) => (
            <p key={name} className="text-center text-[7.5px] font-semibold text-[#8A8F99]">
              {name}
            </p>
          ))}
        </div>

        {/* Day grid — status fill + glyph + the recorded check-in time */}
        <div className="mt-1 space-y-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-[3px]">
              {week.map((cell, ci) => (
                <span
                  key={ci}
                  className={cn(
                    "relative flex h-9 flex-col rounded-md border p-[2px]",
                    cell.today ? "border-[#3B8FF3] border-[1.5px]" : "border-[#EFEFF1]",
                    cell.status === "present" && "bg-mint",
                    cell.status === "excused" && "bg-sunshine",
                    cell.status === "absent" && "bg-coral",
                    !cell.status && "bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "text-center text-[7.5px] font-semibold leading-none",
                      cell.inMonth ? "text-[#2B2D31]" : "text-[#AEB4BE]",
                    )}
                  >
                    {cell.day}
                  </span>
                  {cell.status === "present" && (
                    <Check className="absolute right-[2px] top-[2px] h-2 w-2 text-mint-ink" />
                  )}
                  {cell.status === "excused" && (
                    <Triangle className="absolute right-[2px] top-[2px] h-2 w-2 text-sunshine-ink" />
                  )}
                  {cell.status === "absent" && (
                    <X className="absolute right-[2px] top-[2px] h-2 w-2 text-coral-ink" />
                  )}
                  {cell.time && (
                    <span className="mt-auto text-center text-[6.5px] font-semibold leading-none text-mint-ink">
                      {cell.time}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-0.5">
          <span className="flex items-center gap-1 text-[7.5px] font-semibold text-[#8A8F99]">
            <Check className="h-2.5 w-2.5 text-mint-ink" />
            {t("showcase.attendance.screen.presentLabel")}
          </span>
          <span className="flex items-center gap-1 text-[7.5px] font-semibold text-[#8A8F99]">
            <Triangle className="h-2.5 w-2.5 text-sunshine-ink" />
            {t("showcase.attendance.screen.excusedLabel")}
          </span>
          <span className="flex items-center gap-1 text-[7.5px] font-semibold text-[#8A8F99]">
            <X className="h-2.5 w-2.5 text-coral-ink" />
            {t("showcase.attendance.screen.absentLabel")}
          </span>
        </div>
      </div>

      {/* Month summary tiles */}
      <div className="mt-auto flex gap-1.5">
        <span className="flex flex-1 flex-col items-center rounded-2xl bg-white py-2.5 shadow-card">
          <p className="text-[8px] font-semibold text-[#8A8F99]">
            {t("showcase.attendance.screen.presentLabel")}
          </p>
          <p className="text-[14px] font-extrabold text-mint-ink">9</p>
        </span>
        <span className="flex flex-1 flex-col items-center rounded-2xl bg-white py-2.5 shadow-card">
          <p className="text-[8px] font-semibold text-[#8A8F99]">
            {t("showcase.attendance.screen.excusedLabel")}
          </p>
          <p className="text-[14px] font-extrabold text-sunshine-ink">1</p>
        </span>
        <span className="flex flex-1 flex-col items-center rounded-2xl bg-white py-2.5 shadow-card">
          <p className="text-[8px] font-semibold text-[#8A8F99]">
            {t("showcase.attendance.screen.checkInLabel")}
          </p>
          <p className="text-[14px] font-extrabold text-[#2B2D31]">08:45</p>
        </span>
      </div>
    </ScreenFrame>
  );
}

/** One album list row exactly like the app's AlbumCard: title, "date ·
 *  author" byline, heart/comment counts, then the kidsnote-style mosaic —
 *  one large photo beside two stacked, "+N" on the last tile. */
function AlbumRow({
  title,
  byline,
  hearts,
  comments,
  seeds,
  remaining,
  mosaicHeight,
}: {
  title: string;
  byline: string;
  hearts: number;
  comments: number;
  seeds: [string, string, string];
  remaining: number;
  mosaicHeight: string;
}) {
  return (
    <div className="border-b border-[#EFEFF1] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <p className="truncate text-[11.5px] font-bold text-[#2B2D31]">{title}</p>
          <p className="mt-0.5 truncate text-[8.5px] font-semibold text-[#8A8F99]">
            {byline}
          </p>
        </span>
        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <span className="flex items-center gap-0.5 text-[8.5px] font-semibold text-[#8A8F99]">
            <Heart className="h-2.5 w-2.5 fill-[#FF5C7A] text-[#FF5C7A]" />
            {hearts}
          </span>
          <span className="flex items-center gap-0.5 text-[8.5px] font-semibold text-[#8A8F99]">
            <MessageCircle className="h-2.5 w-2.5 fill-[#AEB4BE] text-[#AEB4BE]" />
            {comments}
          </span>
        </span>
      </div>
      <div className={cn("mt-2 flex gap-1", mosaicHeight)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://picsum.photos/seed/${seeds[0]}/300/360`}
          alt=""
          className="h-full min-w-0 flex-1 rounded-md object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://picsum.photos/seed/${seeds[1]}/300/180`}
            alt=""
            className="min-h-0 w-full flex-1 rounded-md object-cover"
          />
          <span className="relative min-h-0 w-full flex-1 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://picsum.photos/seed/${seeds[2]}/300/180`}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[11px] font-bold text-white">
              +{remaining}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function AlbumScreen() {
  const { t } = useLayoutTranslation("home");
  return (
    <ScreenFrame>
      <ScreenHeader title={t("phone.tiles.albums")} />
      <div className="-mx-3 flex-1 overflow-hidden">
        <AlbumRow
          title={t("showcase.albums.screen.title")}
          byline={t("showcase.albums.screen.byline")}
          hearts={24}
          comments={3}
          seeds={["kichkintoy-spring1", "kichkintoy-spring2", "kichkintoy-spring3"]}
          remaining={12}
          mosaicHeight="h-36"
        />
        <AlbumRow
          title={t("showcase.albums.screen.album2Title")}
          byline={t("showcase.albums.screen.album2Byline")}
          hearts={18}
          comments={5}
          seeds={["kichkintoy-music1", "kichkintoy-music2", "kichkintoy-music3"]}
          remaining={7}
          mosaicHeight="h-32"
        />
      </div>
    </ScreenFrame>
  );
}

function DocumentsScreen() {
  const { t } = useLayoutTranslation("home");
  const docs = [
    { key: "doc1", status: "approved", chip: "bg-mint text-mint-ink" },
    { key: "doc2", status: "review", chip: "bg-sky text-sky-ink" },
    { key: "doc3", status: "pending", chip: "bg-sunshine text-sunshine-ink" },
  ] as const;

  return (
    <ScreenFrame>
      <ScreenHeader title={t("showcase.documents.screen.header")} />
      {/* Group header with count pill, like groupDocuments() renders */}
      <div className="flex items-center gap-1.5 px-0.5 pb-2">
        <p className="text-[11px] font-bold text-[#2B2D31]">
          {t("showcase.documents.screen.group")}
        </p>
        <span className="rounded-full bg-[#E7E9ED] px-1.5 py-0.5 text-[8px] font-bold text-[#8A8F99]">
          3
        </span>
      </div>
      <div className="space-y-2">
        {docs.map(({ key, status, chip }) => (
          <div
            key={key}
            className="flex items-center gap-2.5 rounded-2xl border border-[#EFEFF1] bg-white p-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-mint-ink">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-[10.5px] font-bold text-[#2B2D31]">
                  {t(`showcase.documents.screen.${key}`)}
                </p>
                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold", chip)}>
                  {t(`showcase.documents.screen.${status}`)}
                </span>
              </span>
              <p className="mt-0.5 truncate text-[8.5px] font-semibold text-[#8A8F99]">
                {t(`showcase.documents.screen.${key}Sub`)}
              </p>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8A8F99]" />
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-2xl border-2 border-dashed border-[#D8DBE0] p-3.5 text-center text-[10px] font-semibold text-[#8A8F99]">
        {t("showcase.documents.screen.upload")}
      </div>
    </ScreenFrame>
  );
}

/* ------------------------------ section ------------------------------ */

const rows = [
  { key: "chat", Screen: ChatScreen, accent: "text-grape-ink", blob: "bg-grape", check: "bg-grape text-grape-ink" },
  { key: "reports", Screen: ReportScreen, accent: "text-coral-ink", blob: "bg-coral", check: "bg-coral text-coral-ink" },
  { key: "attendance", Screen: AttendanceScreen, accent: "text-mint-ink", blob: "bg-mint", check: "bg-mint text-mint-ink" },
  { key: "albums", Screen: AlbumScreen, accent: "text-sunshine-ink", blob: "bg-sunshine", check: "bg-sunshine text-sunshine-ink" },
  { key: "documents", Screen: DocumentsScreen, accent: "text-sky-ink", blob: "bg-sky", check: "bg-sky text-sky-ink" },
] as const;

/** Kidsnote's alternating feature spotlights: a real app screen on one side,
 *  a two-tone headline (dark kicker + colored title) and proof bullets on the
 *  other, flipping sides every row. */
export function Showcase() {
  const { t } = useLayoutTranslation("home");

  return (
    <section id="showcase" className="scroll-mt-20">
      {rows.map(({ key, Screen, accent, blob, check }, index) => {
        const rawBullets = t(`showcase.${key}.bullets`, {
          returnObjects: true,
        });
        const bullets = Array.isArray(rawBullets) ? (rawBullets as string[]) : [];
        const even = index % 2 === 0;
        return (
          <div key={key} className={even ? "bg-background" : "bg-white"}>
            <div className="container grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
              <Reveal className={even ? "" : "lg:order-2"}>
                <PhoneBlob tint={blob}>
                  <Screen />
                </PhoneBlob>
              </Reveal>
              <Reveal delay={120} className={even ? "" : "lg:order-1"}>
                <h3 className="font-brand text-2xl font-bold leading-snug text-foreground sm:text-3xl lg:text-4xl">
                  {t(`showcase.${key}.kicker`)}
                  <br />
                  <span className={accent}>{t(`showcase.${key}.title`)}</span>
                </h3>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {t(`showcase.${key}.body`)}
                </p>
                <ul className="mt-7 space-y-3.5">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", check)}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="max-w-xl text-base font-medium leading-relaxed text-foreground/80">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        );
      })}
    </section>
  );
}
