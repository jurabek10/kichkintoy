"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IoArrowForward,
  IoCalendarOutline,
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoTriangleOutline,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import Link from "next/link";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * Monthly attendance calendar for the active child — the web twin of the mobile
 * `AttendanceCalendar`. Each cell carries the day's status (present / excused /
 * absent) as a soft candy fill, a corner glyph, and the recorded check-in/out
 * times, so a parent reads the whole month at a glance.
 */

// Statuses that count as the child having attended that day.
const ATTENDED = new Set(["present", "late", "left_early", "picked_up"]);

type DayInfo = {
  status: string;
  attended: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoFor = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

function localeTag(lang: string) {
  return lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US";
}

function monthLabel(year: number, monthIndex: number, lang: string) {
  return new Date(year, monthIndex, 1).toLocaleDateString(localeTag(lang), {
    month: "long",
  });
}

// Sunday-first short weekday names in the active language.
function weekdayShortNames(lang: string) {
  const tag = localeTag(lang);
  // 2024-01-07 is a Sunday; walk seven days from it.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + i).toLocaleDateString(tag, { weekday: "short" }),
  );
}

function cellFill(info: DayInfo | undefined) {
  if (!info) return "bg-card";
  if (info.attended) return "bg-mint";
  if (info.status === "absent") return "bg-coral";
  if (info.status === "excused") return "bg-sunshine";
  return "bg-card";
}

function glyph(info: DayInfo | undefined) {
  if (!info) return null;
  if (info.attended) return { Icon: IoCheckmark, className: "text-mint-ink" };
  if (info.status === "absent") return { Icon: IoClose, className: "text-coral-ink" };
  if (info.status === "excused")
    return { Icon: IoTriangleOutline, className: "text-sunshine-ink" };
  return null;
}

export function ParentAttendanceCalendar({
  childId,
  showMore = true,
}: {
  childId: string;
  showMore?: boolean;
}) {
  const { t, i18n } = useLayoutTranslation("app");
  const lang = i18n.language;

  const now = new Date();
  const today = isoFor(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const range = useMemo(() => {
    const last = new Date(view.year, view.monthIndex + 1, 0).getDate();
    return {
      from: isoFor(view.year, view.monthIndex, 1),
      to: isoFor(view.year, view.monthIndex, last),
    };
  }, [view]);

  const { data: records = [] } = useQuery({
    queryKey: queryKeys.attendance.parentList({
      childId,
      from: range.from,
      to: range.to,
    }),
    queryFn: () =>
      orpc.attendance.parentList({ childId, from: range.from, to: range.to }),
    enabled: !!childId,
  });

  const byDate = useMemo(() => {
    const map = new Map<string, DayInfo>();
    for (const r of records) {
      map.set(r.attendanceDate, {
        status: r.status,
        attended: ATTENDED.has(r.status),
        checkInLabel: r.checkedInAt ? formatTime(r.checkedInAt) : null,
        checkOutLabel: r.checkedOutAt ? formatTime(r.checkedOutAt) : null,
      });
    }
    return map;
  }, [records]);

  // Build the Sunday-first grid, padding leading/trailing slots with the
  // adjacent months' days (dimmed) so every slot is one identical box.
  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.monthIndex, 1).getDay();
    const daysInMonth = new Date(view.year, view.monthIndex + 1, 0).getDate();
    const prevMonthDays = new Date(view.year, view.monthIndex, 0).getDate();
    type Cell = { day: number; inMonth: boolean; iso?: string };
    const list: Cell[] = [];
    for (let i = firstWeekday; i > 0; i -= 1) {
      list.push({ day: prevMonthDays - i + 1, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      list.push({ day: d, inMonth: true, iso: isoFor(view.year, view.monthIndex, d) });
    }
    let next = 1;
    while (list.length % 7 !== 0) list.push({ day: next++, inMonth: false });
    return list;
  }, [view]);

  const isCurrentMonth =
    view.year === now.getFullYear() && view.monthIndex === now.getMonth();

  function shiftMonth(delta: number) {
    const d = new Date(view.year, view.monthIndex + delta, 1);
    setView({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      {/* Identity tag (matches the report/album cards) + Today pill */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-mint-ink">
          <IoCalendarOutline className="h-3.5 w-3.5" style={{ color: "#46B06A" }} />
          {t("parentHome.calendar.tag")}
        </span>
        <button
          type="button"
          onClick={() =>
            setView({ year: now.getFullYear(), monthIndex: now.getMonth() })
          }
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            isCurrentMonth
              ? "border-border text-muted-foreground hover:bg-muted"
              : "border-coral-ink text-coral-ink hover:bg-coral",
          )}
        >
          {t("parentHome.calendar.today")}
        </button>
      </div>

      {/* Month navigation */}
      <div className="mt-1 flex items-center">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t("parentHome.calendar.tag")}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <IoChevronBack className="h-5 w-5" />
        </button>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-xs text-muted-foreground">{view.year}</span>
          <span className="text-lg font-extrabold capitalize text-foreground">
            {monthLabel(view.year, view.monthIndex, lang)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t("parentHome.calendar.tag")}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <IoChevronForward className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {weekdayShortNames(lang).map((name) => (
          <span
            key={name}
            className="text-center text-[11px] font-semibold capitalize text-muted-foreground"
          >
            {name}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          const info = cell.iso ? byDate.get(cell.iso) : undefined;
          const g = cell.inMonth ? glyph(info) : null;
          const isToday = cell.iso === today;
          return (
            <div
              key={index}
              className={cn(
                "relative flex h-16 flex-col rounded-xl border p-1",
                isToday ? "border-2 border-primary" : "border-border",
                cell.inMonth ? cellFill(info) : "bg-card",
              )}
            >
              <span
                className={cn(
                  "text-center text-[11px] font-semibold",
                  cell.inMonth ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {cell.day}
              </span>
              {g ? (
                <g.Icon
                  className={cn("absolute right-1 top-1 h-3 w-3", g.className)}
                />
              ) : null}
              {cell.inMonth && (info?.checkInLabel || info?.checkOutLabel) ? (
                <div className="mt-auto flex flex-col items-center leading-tight">
                  {info?.checkInLabel ? (
                    <span className="truncate text-[9px] font-semibold text-mint-ink">
                      {info.checkInLabel}
                    </span>
                  ) : null}
                  {info?.checkOutLabel ? (
                    <span className="truncate text-[9px] text-muted-foreground">
                      {info.checkOutLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem Icon={IoCheckmark} className="text-mint-ink" label={t("parentHome.calendar.present")} />
        <LegendItem Icon={IoTriangleOutline} className="text-sunshine-ink" label={t("parentHome.calendar.excused")} />
        <LegendItem Icon={IoClose} className="text-coral-ink" label={t("parentHome.calendar.absent")} />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        {t("parentHome.calendar.note")}
      </p>

      {showMore ? (
        <Link
          href="/dashboard/attendance"
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
        >
          {t("parentHome.calendar.more")}
          <IoArrowForward className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function LegendItem({
  Icon,
  className,
  label,
}: {
  Icon: IconType;
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <Icon className={cn("h-3.5 w-3.5", className)} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}
