"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IoCalendarOutline } from "react-icons/io5";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSelectedChild } from "@/lib/selected-child";
import { formatMonthName, formatTime } from "@/lib/date";
import { ParentAttendanceCalendar } from "../../_components/parent-attendance-calendar";
import { ParentAttendanceTable, type AttendanceDay } from "./parent-attendance-table";
import { ReportAbsenceDialog } from "./report-absence-dialog";

const ATTENDED = new Set(["present", "late", "left_early", "picked_up"]);
const pad = (n: number) => String(n).padStart(2, "0");

function monthBounds(year: number, monthIndex: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: `${year}-${pad(monthIndex + 1)}-01`,
    to: `${year}-${pad(monthIndex + 1)}-${pad(last)}`,
  };
}

function monthTitle(year: number, monthIndex: number, lang: string) {
  return `${formatMonthName(year, monthIndex, lang)} ${year}`;
}

export function ParentAttendance() {
  const { t, i18n } = useLayoutTranslation("attendance");
  const { t: tApp } = useLayoutTranslation("app");
  const lang = i18n.language;

  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  // The globally selected kid (header switcher) scopes the whole page.
  const { children, childId, isPending: childrenPending } = useSelectedChild();
  const bounds = monthBounds(view.year, view.monthIndex);

  const recordsQuery = useQuery({
    queryKey: queryKeys.attendance.parentList({
      childId,
      from: bounds.from,
      to: bounds.to,
    }),
    queryFn: () =>
      orpc.attendance.parentList({ childId, from: bounds.from, to: bounds.to }),
    enabled: !!childId,
  });

  // The month's recorded days, newest first, skipping days with no check-in.
  const days = useMemo<AttendanceDay[]>(() => {
    return (recordsQuery.data ?? [])
      .filter((r) => r.status !== "not_checked_in")
      .map((r) => ({
        date: r.attendanceDate.slice(0, 10),
        status: r.status,
        attended: ATTENDED.has(r.status),
        checkInLabel: r.checkedInAt ? formatTime(r.checkedInAt) : null,
        checkOutLabel: r.checkedOutAt ? formatTime(r.checkedOutAt) : null,
        absenceReason: r.absenceReason,
        pickedUpBy: r.pickedUpBy,
        pickedUpRelationship: r.pickedUpRelationship,
        note: r.parentVisibleNote,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [recordsQuery.data]);

  if (childrenPending) {
    return <KidsLoader size="lg" className="min-h-[40vh]" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      {/* Header: title + report-absence action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("parentDescription")}
          </p>
        </div>
        {children.length > 0 ? (
          <ReportAbsenceDialog
            childrenList={children.map((c) => ({ id: c.id, name: c.name }))}
            defaultChildId={childId}
            onReported={(date) => {
              const d = new Date(date);
              setView({ year: d.getFullYear(), monthIndex: d.getMonth() });
            }}
          />
        ) : null}
      </div>

      {/* Calendar (controlled so the list below tracks the same month) */}
      {childId ? (
        <ParentAttendanceCalendar
          childId={childId}
          showMore={false}
          value={view}
          onChange={setView}
        />
      ) : null}

      {recordsQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {toApiError(recordsQuery.error).message}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Month list header */}
      <div className="mt-1 flex items-center justify-between px-1">
        <h2 className="text-lg font-extrabold capitalize text-foreground">
          {monthTitle(view.year, view.monthIndex, lang)}
        </h2>
        {days.length > 0 ? (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">
            {days.length}
          </span>
        ) : null}
      </div>

      {/* Month list */}
      {recordsQuery.isPending ? (
        <KidsLoader label={t("loading")} size="sm" className="py-6" />
      ) : days.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed py-10 text-center">
          <IoCalendarOutline className="h-9 w-9 text-muted-foreground" />
          <p className="font-bold text-foreground">
            {tApp("parentHome.calendar.empty")}
          </p>
          <p className="max-w-[36ch] text-sm text-muted-foreground">
            {tApp("parentHome.calendar.emptyBody")}
          </p>
        </div>
      ) : (
        <ParentAttendanceTable days={days} />
      )}
    </div>
  );
}
