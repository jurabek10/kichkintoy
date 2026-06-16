/**
 * Parent data access — the single seam between "where parent data comes from"
 * and "how a screen renders it".
 *
 * Today every hook returns hardcoded fixtures synchronously, but the interface
 * is query-shaped (`{ data, isPending }`) on purpose: screens already branch on
 * loading, so wiring the real API later (the web app's TanStack Query / orpc
 * layer — see queryKeys factory) is a body-only change with zero screen edits.
 */
import {
  attendance,
  center,
  children,
  currentChild,
  documentContacts,
  feed,
  getNoticeDetail,
  getReportDetail,
  notices,
  profile,
  reports,
  upcomingEvents,
} from '@/constants/data';

export type Query<T> = {
  data: T;
  isPending: boolean;
};

/** Wrap a ready value in the query shape. Swap for `useQuery(...)` per hook. */
function ready<T>(data: T): Query<T> {
  return { data, isPending: false };
}

export function useCenter() {
  return ready(center);
}

export function useCurrentChild() {
  return ready(currentChild);
}

export function useChildren() {
  return ready(children);
}

export function useHomeFeed() {
  return ready(feed);
}

export function useAttendanceSummary() {
  return ready(attendance);
}

export function useUpcomingEvents() {
  return ready(upcomingEvents);
}

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
