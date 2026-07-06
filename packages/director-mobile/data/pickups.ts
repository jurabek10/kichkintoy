/**
 * Pickup notices (하원 알림) data access — staff/author side. The oRPC queries a
 * teacher uses to see who is going home today and a month's history, the detail,
 * and the acknowledge mutation that confirms a notice back to the parent. Parents
 * file and edit notices; staff review and acknowledge. Mirrors the other staff
 * data layers.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { useCenterId } from '@/data/teacher';
import { formatDayMonthTime, formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type ApiSummary = Awaited<ReturnType<typeof orpc.pickups.staffList>>[number];
type ApiDetail = Awaited<ReturnType<typeof orpc.pickups.detail>>;

export type PickupStatus = ApiSummary['status'];
export type PickupRelationship = ApiSummary['relationship'];

// --- View models -----------------------------------------------------------

export type StaffPickupSummary = {
  id: string;
  childName: string;
  className: string | null;
  classId: string | null;
  personName: string;
  relationship: PickupRelationship;
  note: string | null;
  pickupDate: string; // "YYYY-MM-DD"
  pickupTime: string; // "HH:mm"
  dateLabel: string;
  status: PickupStatus;
};

export type StaffPickupDetail = StaffPickupSummary & {
  parentName: string;
  acknowledgedByName: string | null;
  acknowledgedAtLabel: string | null;
};

// --- Mappers ---------------------------------------------------------------

function toSummary(notice: ApiSummary): StaffPickupSummary {
  return {
    id: notice.id,
    childName: notice.child.name,
    className: notice.child.className,
    classId: notice.child.classId,
    personName: notice.pickupPersonName,
    relationship: notice.relationship,
    note: notice.note,
    pickupDate: notice.pickupDate,
    pickupTime: notice.pickupTime,
    dateLabel: formatLongDate(notice.pickupDate, i18n.language),
    status: notice.status,
  };
}

function toDetail(notice: ApiDetail): StaffPickupDetail {
  const lang = i18n.language;
  return {
    ...toSummary(notice),
    parentName: notice.parentName,
    acknowledgedByName: notice.acknowledgedBy?.fullName ?? null,
    acknowledgedAtLabel: notice.acknowledgedAt ? formatDayMonthTime(notice.acknowledgedAt, lang) : null,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A "YYYY-MM" month's date-only bounds. */
export function monthBounds(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const lastDay = new Date(year!, monthIndex!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

// --- Hooks -----------------------------------------------------------------

/** Today's pickups, earliest time first — a going-home timeline. */
export function useTodayPickups(): Query<StaffPickupSummary[]> {
  const centerId = useCenterId();
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const query = useQuery({
    queryKey: teacherQueryKeys.pickups(date),
    queryFn: () => orpc.pickups.staffList({ centerId: centerId ?? '', date }),
    enabled: !!centerId,
  });
  return {
    data: (query.data ?? []).map(toSummary).sort((a, b) => a.pickupTime.localeCompare(b.pickupTime)),
    isPending: !!centerId && query.isPending,
  };
}

export type PickupView = 'month' | 'day';

/** The records list, scoped to a whole month or a single day (matching the web's
 *  day/month toggle). Newest day first, earliest time within a day. */
export function useRecordPickups(view: PickupView, month: string, day: string): Query<StaffPickupSummary[]> {
  const centerId = useCenterId();
  const { from, to } = monthBounds(month);
  const input =
    view === 'day'
      ? { centerId: centerId ?? '', date: day }
      : { centerId: centerId ?? '', from, to };
  const query = useQuery({
    queryKey: [...teacherQueryKeys.pickups(view), view === 'day' ? day : month] as const,
    queryFn: () => orpc.pickups.staffList(input),
    enabled: !!centerId,
  });
  const data = (query.data ?? [])
    .map(toSummary)
    .sort((a, b) => b.pickupDate.localeCompare(a.pickupDate) || a.pickupTime.localeCompare(b.pickupTime));
  return { data, isPending: !!centerId && query.isPending };
}

export function useStaffPickup(noticeId: string): Query<StaffPickupDetail | null> {
  const query = useQuery({
    queryKey: pickupDetailKey(noticeId),
    queryFn: () => orpc.pickups.detail({ noticeId }),
    enabled: !!noticeId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: !!noticeId && query.isPending };
}

/** Acknowledge a notice back to the parent. */
export function useAcknowledgePickup(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.pickups.acknowledge({ noticeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'pickups'] });
      queryClient.invalidateQueries({ queryKey: pickupDetailKey(noticeId) });
    },
  });
}

function pickupDetailKey(noticeId: string) {
  return ['teacher', 'pickup', noticeId] as const;
}
