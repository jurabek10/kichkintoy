/**
 * Attendance (davomat) data access — the oRPC query for a parent's monthly
 * attendance, mapped into a per-day lookup the calendar renders. Mirrors the
 * meals / albums data layers. The backend already exposes everything we need
 * (status + check-in/out times per day for any range), so this is read-only.
 */
import { useQuery } from '@tanstack/react-query';

import { useCurrentChild, type Query } from '@/data/parent';
import { formatTime } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiAttendanceRecord = Awaited<ReturnType<typeof orpc.attendance.parentList>>[number];
export type AttendanceStatus = ApiAttendanceRecord['status'];

/** Statuses that mean the child came in. */
const ATTENDED: AttendanceStatus[] = ['present', 'late', 'left_early', 'picked_up'];

// --- View model -----------------------------------------------------------

export type AttendanceDay = {
  date: string; // local "YYYY-MM-DD"
  status: AttendanceStatus;
  attended: boolean;
  checkInLabel: string; // "" or "09:12" (Uzbekistan time)
  checkOutLabel: string; // "" or "16:30"
  absenceReason: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** First and last day of a month as "YYYY-MM-DD" (the parentList range). */
export function monthBounds(year: number, monthIndex: number): { from: string; to: string } {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: `${year}-${pad(monthIndex + 1)}-01`,
    to: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
}

// --- Mapper ---------------------------------------------------------------

function toDay(record: ApiAttendanceRecord): AttendanceDay {
  return {
    date: record.attendanceDate.slice(0, 10),
    status: record.status,
    attended: ATTENDED.includes(record.status),
    checkInLabel: record.checkedInAt ? formatTime(record.checkedInAt) : '',
    checkOutLabel: record.checkedOutAt ? formatTime(record.checkedOutAt) : '',
    absenceReason: record.absenceReason,
  };
}

// --- Hook -----------------------------------------------------------------

/** The active child's attendance for one month, keyed by ISO date. */
export function useAttendanceCalendar(
  year: number,
  monthIndex: number,
): Query<Map<string, AttendanceDay>> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const { from, to } = monthBounds(year, monthIndex);

  const query = useQuery({
    queryKey: queryKeys.attendance.parentList(childId, from, to),
    queryFn: () => orpc.attendance.parentList({ childId, from, to }),
    enabled: !!childId,
  });

  const days = new Map<string, AttendanceDay>();
  for (const record of query.data ?? []) {
    const day = toDay(record);
    days.set(day.date, day);
  }

  return { data: days, isPending: child.isPending || (!!childId && query.isPending) };
}
