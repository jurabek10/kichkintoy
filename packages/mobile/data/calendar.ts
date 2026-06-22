/**
 * Calendar (jadval) data access — the parent's monthly schedule: staff-created
 * events from `calendar.parentList` merged with classmates' birthdays from
 * `calendar.birthdays` (derived from each child's date of birth). Both are
 * read-only here; staff create events on the web. Mirrors the attendance data
 * layer: one selected month, keyed by ISO date.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentChild, type Query } from '@/data/parent';
import { formatLongDate, formatTime, localIsoDate, todayIsoDate, weekdayLong } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

type ApiEvent = Awaited<ReturnType<typeof orpc.calendar.parentList>>[number];
type ApiBirthday = Awaited<ReturnType<typeof orpc.calendar.birthdays>>[number];
type ApiEventDetail = Awaited<ReturnType<typeof orpc.calendar.detail>>;

export type CalendarEventStatus = ApiEvent['status'];
export type CalendarAudience = ApiEvent['audienceType'];

// --- View model -----------------------------------------------------------

type BaseItem = {
  id: string;
  date: string; // local "YYYY-MM-DD"
  sortKey: string;
  isPast: boolean; // strictly before today (Uzbekistan time)
};

export type EventItem = BaseItem & {
  kind: 'event';
  title: string;
  timeLabel: string; // "" for all-day, else "09:30"
  allDay: boolean;
  locationText: string | null;
  status: CalendarEventStatus;
  audienceType: CalendarAudience;
  scopeLabel: string; // class / child name — empty for center-wide events
};

export type BirthdayItem = BaseItem & {
  kind: 'birthday';
  childName: string;
  photoUrl: string | null;
  turningAge: number;
  isOwnChild: boolean;
};

export type ScheduleItem = EventItem | BirthdayItem;

/** What a calendar day cell should mark. */
export type DayMarks = { event: boolean; birthday: boolean };

export type MonthSchedule = {
  items: ScheduleItem[]; // the month's items, chronological
  byDay: Map<string, DayMarks>; // per-day markers for the grid
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

// --- Mappers --------------------------------------------------------------

function scopeLabel(event: ApiEvent): string {
  if (event.audienceType === 'class') return event.classNames.join(', ');
  if (event.audienceType === 'child') return event.childNames.join(', ');
  return '';
}

function toEventItem(event: ApiEvent, today: string): EventItem {
  const date = localIsoDate(event.startsAt);
  const timeLabel = event.allDay ? '' : formatTime(event.startsAt);
  // All-day and birthdays sort before timed events on the same day.
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

// --- Hook -----------------------------------------------------------------

/** The active child's schedule for one month: events + birthdays, chronological,
 *  plus a per-day marker map for the calendar grid. */
export function useMonthSchedule(year: number, monthIndex: number): Query<MonthSchedule> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const today = todayIsoDate();
  const { fromIso, toIso, fromDate, toDate } = monthRange(year, monthIndex);

  const eventsQuery = useQuery({
    queryKey: queryKeys.calendar.parentList(childId, fromIso, toIso),
    queryFn: () => orpc.calendar.parentList({ childId, from: fromIso, to: toIso }),
    enabled: !!childId,
  });
  const birthdaysQuery = useQuery({
    queryKey: queryKeys.calendar.birthdays(childId, fromDate, toDate),
    queryFn: () => orpc.calendar.birthdays({ childId, from: fromDate, to: toDate }),
    enabled: !!childId,
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
    isPending: child.isPending || (!!childId && (eventsQuery.isPending || birthdaysQuery.isPending)),
  };
}

// --- Event detail ---------------------------------------------------------

export type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  dateLabel: string; // "8 June 2026"
  weekdayLabel: string; // "Monday"
  timeLabel: string; // "05:00", "05:00 – 06:30", or "" for all-day
  allDay: boolean;
  locationText: string | null;
  audienceType: CalendarAudience;
  scopeLabel: string; // class / child names — empty for center-wide
  organizerName: string;
  centerName: string;
  status: CalendarEventStatus;
  cancellationReason: string | null;
  seenByMe: boolean;
};

function toEventDetail(event: ApiEventDetail, lang: string): EventDetail {
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
    centerName: event.centerName,
    status: event.status,
    cancellationReason: event.cancellationReason,
    seenByMe: event.seenByMe,
  };
}

/** One calendar event for the detail screen. */
export function useCalendarEvent(eventId: string, lang: string): Query<EventDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.calendar.detail(eventId),
    queryFn: () => orpc.calendar.detail({ eventId }),
    enabled: !!eventId,
  });
  return { data: query.data ? toEventDetail(query.data, lang) : null, isPending: query.isPending };
}

/** Mark an event as seen, optimistically flipping the detail's `seenByMe`. */
export function useMarkEventSeen(eventId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.calendar.detail(eventId);

  return useMutation({
    mutationFn: () => orpc.calendar.markSeen({ eventId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ApiEventDetail>(detailKey);
      queryClient.setQueryData<ApiEventDetail>(detailKey, (current) =>
        current ? { ...current, seenByMe: true } : current,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}
