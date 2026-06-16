/**
 * Parent data access — the single seam between "where parent data comes from"
 * and "how a screen renders it".
 *
 * The home hooks now call the real oRPC API via TanStack Query and map the
 * responses into the shapes the screens already consume. The content-section
 * hooks (reports/notices/albums/meals lists + details) are still hardcoded and
 * will be wired the same way in a follow-up.
 */
import { useQuery } from '@tanstack/react-query';

import i18n from '@/i18n';
import { ageLabel, formatDayMonth, formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import {
  albums,
  documentContacts,
  getAlbumDetail,
  getNoticeDetail,
  getReportDetail,
  mealsByDate,
  notices,
  profile,
  reports,
  type Child,
} from '@/constants/data';

export type Query<T> = {
  data: T;
  isPending: boolean;
};

/** Wrap a ready value in the query shape (hardcoded sections only). */
function ready<T>(data: T): Query<T> {
  return { data, isPending: false };
}

// --- Children -------------------------------------------------------------

type ApiChild = {
  id: string;
  name: string;
  photoUrl: string | null;
  dateOfBirth: string | null;
  className: string | null;
  centerName: string;
};

function toChild(child: ApiChild): Child {
  return {
    id: child.id,
    name: child.name,
    photo: child.photoUrl,
    className: child.className ?? undefined,
    centerName: child.centerName,
    birthLabel: child.dateOfBirth ? formatLongDate(child.dateOfBirth, i18n.language) : '',
    ageLabel: child.dateOfBirth ? ageLabel(child.dateOfBirth) : '',
  };
}

export function useChildren(): Query<Child[]> {
  const query = useQuery({
    queryKey: queryKeys.parent.children,
    queryFn: () => orpc.reports.parentChildren(),
  });
  return { data: (query.data ?? []).map(toChild), isPending: query.isPending };
}

export function useCurrentChild(): Query<Child | null> {
  const { data, isPending } = useChildren();
  return { data: data[0] ?? null, isPending };
}

export function useCenter(): Query<{ name: string }> {
  const { data, isPending } = useCurrentChild();
  return { data: { name: data?.centerName ?? '' }, isPending };
}

// --- Home feed ------------------------------------------------------------

export type HomeFeed = {
  report: { note: string; mood: string; photoCount: number; updateCount: number; dateLabel: string } | null;
  album: { caption: string; photoCount: number; dateLabel: string } | null;
  notice: { title: string; body: string; dateLabel: string } | null;
};

function byDateDesc(a: string | null, b: string | null) {
  return (b ?? '').localeCompare(a ?? '');
}

export function useHomeFeed(): Query<HomeFeed> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const lang = i18n.language;

  const reportsQuery = useQuery({
    queryKey: queryKeys.parent.childReports(childId),
    queryFn: () => orpc.reports.parentList({ childId }),
    enabled: !!childId,
  });
  const albumsQuery = useQuery({
    queryKey: queryKeys.albums.parentList(childId),
    queryFn: () => orpc.albums.parentList({ childId }),
    enabled: !!childId,
  });
  const noticesQuery = useQuery({
    queryKey: queryKeys.notices.parentList,
    queryFn: () => orpc.notices.parentList({}),
  });

  const latestReport = [...(reportsQuery.data ?? [])]
    .filter((report) => report.status === 'published')
    .sort((a, b) => byDateDesc(a.reportDate, b.reportDate))[0];
  const latestAlbum = [...(albumsQuery.data ?? [])].sort((a, b) =>
    byDateDesc(a.publishedAt, b.publishedAt),
  )[0];
  const latestNotice = [...(noticesQuery.data ?? [])].sort((a, b) =>
    byDateDesc(a.publishedAt, b.publishedAt),
  )[0];

  const data: HomeFeed = {
    report: latestReport
      ? {
          note: latestReport.teacherNote ?? '',
          mood: latestReport.mood ?? '—',
          photoCount: latestReport.photoCount,
          updateCount: latestReport.itemCount,
          dateLabel: formatDayMonth(latestReport.reportDate, lang),
        }
      : null,
    album: latestAlbum
      ? {
          caption: latestAlbum.caption.split('\n')[0] || '',
          photoCount: latestAlbum.mediaCount,
          dateLabel: latestAlbum.publishedAt ? formatDayMonth(latestAlbum.publishedAt, lang) : '',
        }
      : null,
    notice: latestNotice
      ? {
          title: latestNotice.title,
          body: latestNotice.bodyPreview,
          dateLabel: latestNotice.publishedAt ? formatDayMonth(latestNotice.publishedAt, lang) : '',
        }
      : null,
  };

  const isPending =
    child.isPending ||
    noticesQuery.isPending ||
    (!!childId && (reportsQuery.isPending || albumsQuery.isPending));

  return { data, isPending };
}

// --- Attendance summary ---------------------------------------------------

const ATTENDED = new Set(['present', 'late', 'left_early', 'picked_up']);

function monthRange() {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
}

export function useAttendanceSummary(): Query<{ attended: number; total: number }> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const { from, to } = monthRange();

  const query = useQuery({
    queryKey: queryKeys.attendance.parentList(childId, from, to),
    queryFn: () => orpc.attendance.parentList({ childId, from, to }),
    enabled: !!childId,
  });

  const records = query.data ?? [];
  const attended = records.filter((record) => ATTENDED.has(record.status)).length;

  return {
    data: { attended, total: records.length },
    isPending: child.isPending || (!!childId && query.isPending),
  };
}

// --- Upcoming events ------------------------------------------------------

export type UpcomingEvent = { id: string; title: string; whenLabel: string };

export function useUpcomingEvents(): Query<UpcomingEvent[]> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const lang = i18n.language;

  const query = useQuery({
    queryKey: queryKeys.calendar.upcoming(childId),
    queryFn: () => orpc.calendar.upcoming({ childId, limit: 4 }),
    enabled: !!childId,
  });

  const events = (query.data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    whenLabel: formatDayMonth(event.startsAt, lang),
  }));

  return { data: events, isPending: child.isPending || (!!childId && query.isPending) };
}

// --- Hardcoded content sections (wired to the API in a follow-up) ----------

export function useChildProfile() {
  return ready(profile);
}

export function useDocumentContacts() {
  return ready(documentContacts);
}

export function useChildReports() {
  return ready(reports);
}

export function useReport(id: string) {
  return ready(getReportDetail(id));
}

export function useNotices() {
  return ready(notices);
}

export function useNotice(id: string) {
  return ready(getNoticeDetail(id));
}

export function useAlbums() {
  return ready(albums);
}

export function useAlbum(id: string) {
  return ready(getAlbumDetail(id));
}

export function useMealsByDate() {
  return ready(mealsByDate());
}
