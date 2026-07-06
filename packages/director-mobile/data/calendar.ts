/**
 * Calendar (jadval) data access — staff/author side. The month's schedule for the
 * teacher's classes (center events from `calendar.staffList` merged with children's
 * birthdays), plus the event detail and the create / edit / cancel mutations.
 * Mirrors the parent calendar data layer, but sourced from the staff endpoints
 * the server already scopes to the classes she teaches.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CalendarAudienceType,
  CalendarEventStatus,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@kichkintoy/shared';
import { useCenterId, type Query } from '@/data/teacher';
import { formatLongDate, formatTime, localIsoDate, todayIsoDate, weekdayLong } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type ApiEvent = Awaited<ReturnType<typeof orpc.calendar.staffList>>[number];
type ApiBirthday = Awaited<ReturnType<typeof orpc.calendar.birthdays>>[number];

// --- View models -----------------------------------------------------------

type BaseItem = {
  id: string;
  date: string; // local "YYYY-MM-DD"
  sortKey: string;
  isPast: boolean;
};

export type EventItem = BaseItem & {
  kind: 'event';
  title: string;
  timeLabel: string;
  allDay: boolean;
  locationText: string | null;
  status: CalendarEventStatus;
  audienceType: CalendarAudienceType;
  scopeLabel: string;
};

export type BirthdayItem = BaseItem & {
  kind: 'birthday';
  childName: string;
  photoUrl: string | null;
  turningAge: number;
  isOwnChild: boolean;
};

export type ScheduleItem = EventItem | BirthdayItem;

export type DayMarks = { event: boolean; birthday: boolean };

export type MonthSchedule = {
  items: ScheduleItem[];
  byDay: Map<string, DayMarks>;
};

export type StaffEventDetail = {
  id: string;
  title: string;
  description: string | null;
  dateLabel: string;
  weekdayLabel: string;
  timeLabel: string;
  allDay: boolean;
  locationText: string | null;
  audienceType: CalendarAudienceType;
  scopeLabel: string;
  organizerName: string;
  status: CalendarEventStatus;
  cancellationReason: string | null;
  seenCount: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** A month's bounds as both ISO datetimes (events) and date-only (birthdays). */
export function monthRange(year: number, monthIndex: number) {
  const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromDate: `${year}-${pad(monthIndex + 1)}-01`,
    toDate: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
}

// --- Mappers ---------------------------------------------------------------

function scopeLabel(event: ApiEvent): string {
  if (event.audienceType === 'class') return event.classNames.join(', ');
  if (event.audienceType === 'child') return event.childNames.join(', ');
  return '';
}

function toEventItem(event: ApiEvent, today: string): EventItem {
  const date = localIsoDate(event.startsAt);
  const timeLabel = event.allDay ? '' : formatTime(event.startsAt);
  const sortKey = `${date} ${event.allDay ? '0' : `1 ${timeLabel}`}`;
  return {
    kind: 'event',
    id: event.id,
    date,
    sortKey,
    isPast: date < today,
    title: event.title,
    timeLabel,
    allDay: event.allDay,
    locationText: event.locationText,
    status: event.status,
    audienceType: event.audienceType,
    scopeLabel: scopeLabel(event),
  };
}

function toBirthdayItem(birthday: ApiBirthday, today: string): BirthdayItem {
  return {
    kind: 'birthday',
    id: `bday-${birthday.childId}-${birthday.date}`,
    date: birthday.date,
    sortKey: `${birthday.date} 0`,
    isPast: birthday.date < today,
    childName: birthday.childName,
    photoUrl: birthday.photoUrl,
    turningAge: birthday.turningAge,
    isOwnChild: birthday.isOwnChild,
  };
}

// --- Hooks -----------------------------------------------------------------

/** The teacher's schedule for one month: events + birthdays, chronological, plus
 *  a per-day marker map for the calendar grid. */
export function useStaffMonthSchedule(year: number, monthIndex: number): Query<MonthSchedule> {
  const centerId = useCenterId();
  const today = todayIsoDate();
  const { fromIso, toIso, fromDate, toDate } = monthRange(year, monthIndex);

  const eventsQuery = useQuery({
    queryKey: teacherQueryKeys.calendar(fromIso, toIso),
    queryFn: () => orpc.calendar.staffList({ centerId: centerId ?? '', from: fromIso, to: toIso }),
    enabled: !!centerId,
  });
  const birthdaysQuery = useQuery({
    queryKey: [...teacherQueryKeys.calendar(fromDate, toDate), 'bday'] as const,
    queryFn: () => orpc.calendar.birthdays({ centerId: centerId ?? '', from: fromDate, to: toDate }),
    enabled: !!centerId,
  });

  const items: ScheduleItem[] = [
    ...(eventsQuery.data ?? []).map((event) => toEventItem(event, today)),
    ...(birthdaysQuery.data ?? []).map((birthday) => toBirthdayItem(birthday, today)),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const byDay = new Map<string, DayMarks>();
  for (const item of items) {
    const marks = byDay.get(item.date) ?? { event: false, birthday: false };
    if (item.kind === 'birthday') marks.birthday = true;
    else marks.event = true;
    byDay.set(item.date, marks);
  }

  return {
    data: { items, byDay },
    isPending: !!centerId && (eventsQuery.isPending || birthdaysQuery.isPending),
  };
}

function toStaffDetail(event: Awaited<ReturnType<typeof orpc.calendar.detail>>, lang: string): StaffEventDetail {
  const start = formatTime(event.startsAt);
  const end = event.endsAt ? formatTime(event.endsAt) : '';
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    dateLabel: formatLongDate(localIsoDate(event.startsAt), lang),
    weekdayLabel: weekdayLong(localIsoDate(event.startsAt), lang),
    timeLabel: event.allDay ? '' : end ? `${start} – ${end}` : start,
    allDay: event.allDay,
    locationText: event.locationText,
    audienceType: event.audienceType,
    scopeLabel:
      event.audienceType === 'class'
        ? event.classNames.join(', ')
        : event.audienceType === 'child'
          ? event.childNames.join(', ')
          : '',
    organizerName: event.authorName,
    status: event.status,
    cancellationReason: event.cancellationReason,
    seenCount: event.seenCount,
  };
}

/** One event for the staff detail screen. */
export function useStaffCalendarEvent(eventId: string, lang: string): Query<StaffEventDetail | null> {
  const query = useQuery({
    queryKey: teacherQueryKeys.calendarEvent(eventId),
    queryFn: () => orpc.calendar.detail({ eventId }),
    enabled: !!eventId,
  });
  return {
    data: query.data ? toStaffDetail(query.data, lang) : null,
    isPending: !!eventId && query.isPending,
  };
}

/** The raw event, for prefilling the composer when editing. */
export function useCalendarEventRaw(eventId: string) {
  return useQuery({
    queryKey: teacherQueryKeys.calendarEvent(eventId),
    queryFn: () => orpc.calendar.detail({ eventId }),
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => orpc.calendar.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher', 'calendar'] }),
  });
}

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCalendarEventInput['body']) =>
      orpc.calendar.update({ eventId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.calendarEvent(eventId) });
    },
  });
}

export function useCancelEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cancellationReason?: string) =>
      orpc.calendar.cancel({ eventId, cancellationReason: cancellationReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.calendarEvent(eventId) });
    },
  });
}
