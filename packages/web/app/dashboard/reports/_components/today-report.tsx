"use client";

import Link from "next/link";
import { ArrowRight, ImageIcon, MessageCircle, Sparkles } from "lucide-react";
import type { DailyReportSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime, formatWeekdayShort } from "@/lib/format";
import { moodEmoji, reportTimestamp } from "./report-utils";

/**
 * The hero of the parent's reports page: today's report, given the whole top of
 * the screen so a parent sees how their child's day went the moment they land.
 * When nothing has been published today it shows the latest report instead, so
 * the slot is never empty — and falls back to a gentle prompt when there are no
 * reports at all. The mood face and date rail are the same glyphs the mobile
 * app uses, tying the two surfaces together.
 */
export function TodayReport({
  report,
  isToday,
  childName,
  t,
}: {
  report: DailyReportSummary | null;
  isToday: boolean;
  childName: string | null;
  t: TFunction<"reports">;
}) {
  if (!report) {
    return (
      <Card className="flex flex-col items-center gap-2 border-coral/30 bg-coral/5 p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-coral/15 text-2xl">
          🌤️
        </span>
        <p className="font-bold text-foreground">{t("parent.noToday")}</p>
        <p className="max-w-[42ch] text-sm text-muted-foreground">
          {t("parent.noTodayBody", { name: childName ?? t("parent.yourChild") })}
        </p>
      </Card>
    );
  }

  const date = reportTimestamp(report);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-coral/15 text-coral-ink">
          <Sparkles className="h-4 w-4" />
        </span>
        <h2 className="text-base font-extrabold tracking-tight text-foreground">
          {isToday ? t("parent.todayHeading") : t("parent.latestHeading")}
        </h2>
      </div>

      <Link href={`/dashboard/reports/${report.id}`} className="group block">
        <Card className="overflow-hidden border-coral/30 transition group-hover:border-coral/60 group-hover:shadow-pop">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-coral/10 via-coral/5 to-transparent p-5 sm:flex-row sm:items-stretch sm:gap-5">
            {/* Date rail — the calendar block carried over from mobile. */}
            <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-center sm:justify-center sm:gap-1 sm:border-r sm:border-coral/20 sm:pr-5">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-coral/15 text-4xl shadow-sm">
                {moodEmoji(report.mood)}
              </span>
              <div className="sm:mt-2 sm:text-center">
                <p className="text-2xl font-extrabold leading-none text-coral-ink">
                  {formatDate(date)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatWeekdayShort(date)} · {formatTime(date)}
                </p>
              </div>
            </div>

            {/* The teacher's words — the reason a parent opens this page. */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-sm font-bold text-coral-ink">
                {report.class.name}
                <span className="font-medium text-muted-foreground">
                  {" · "}
                  {report.author.fullName}
                </span>
              </p>
              <p className="line-clamp-3 whitespace-pre-wrap text-[15px] leading-6 text-foreground">
                {report.teacherNote || t("parent.noNoteYet")}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                {report.photoCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {t("summary.photos", { count: report.photoCount })}
                  </span>
                ) : null}
                {report.commentCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("summary.comments", { count: report.commentCount })}
                  </span>
                ) : null}
                <span className="ml-auto inline-flex items-center gap-1 font-bold text-coral-ink transition group-hover:gap-2">
                  {t("parent.readFull")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </section>
  );
}
