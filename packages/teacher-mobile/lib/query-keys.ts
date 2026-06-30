/** Teacher-facing query keys (staff lists scoped to the teacher's classes). */
export const teacherQueryKeys = {
  classes: ['teacher', 'classes'] as const,
  roster: (classId: string) => ['teacher', 'roster', classId] as const,
  child: (childId: string) => ['teacher', 'child', childId] as const,
  classReportStatuses: (classId: string, date: string) =>
    ['teacher', 'report-statuses', classId, date] as const,
  attendance: (date: string) => ['teacher', 'attendance', date] as const,
  medications: (date: string) => ['teacher', 'medications', date] as const,
  meals: (date: string) => ['teacher', 'meals', date] as const,
  albums: ['teacher', 'albums'] as const,
  notices: ['teacher', 'notices'] as const,
  pickups: (date: string) => ['teacher', 'pickups', date] as const,
  calendar: (from: string, to: string) => ['teacher', 'calendar', from, to] as const,
  calendarEvent: (eventId: string) => ['teacher', 'calendar-event', eventId] as const,
  documents: (status: string) => ['teacher', 'documents', status] as const,
  joinRequests: (status: string) => ['teacher', 'join-requests', status] as const,
};

/** Central query-key factory so cache invalidation stays consistent. */
export const queryKeys = {
  parent: {
    children: ['parent', 'children'] as const,
    childReports: (childId: string) => ['parent', 'reports', childId] as const,
  },
  reports: {
    detail: (reportId: string) => ['reports', 'detail', reportId] as const,
  },
  media: {
    download: (mediaAssetId: string) => ['media', 'download', mediaAssetId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (input?: Record<string, unknown>) => ['notifications', 'list', input ?? {}] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  albums: {
    parentList: (childId: string) => ['albums', 'parent', childId] as const,
    detail: (postId: string) => ['albums', 'detail', postId] as const,
  },
  notices: {
    parentList: ['notices', 'parent'] as const,
    detail: (noticeId: string) => ['notices', 'detail', noticeId] as const,
  },
  meals: {
    parentList: (childId: string) => ['meals', 'parent', childId] as const,
  },
  calendar: {
    upcoming: (childId: string) => ['calendar', 'upcoming', childId] as const,
    parentList: (childId: string, from: string, to: string) =>
      ['calendar', 'parent', childId, from, to] as const,
    birthdays: (childId: string, from: string, to: string) =>
      ['calendar', 'birthdays', childId, from, to] as const,
    detail: (eventId: string) => ['calendar', 'detail', eventId] as const,
  },
  attendance: {
    parentList: (childId: string, from: string, to: string) =>
      ['attendance', 'parent', childId, from, to] as const,
  },
  medications: {
    children: ['medications', 'children'] as const,
    parentList: ['medications', 'parent'] as const,
    detail: (requestId: string) => ['medications', 'detail', requestId] as const,
  },
  pickups: {
    children: ['pickups', 'children'] as const,
    parentList: ['pickups', 'parent'] as const,
    detail: (noticeId: string) => ['pickups', 'detail', noticeId] as const,
  },
  documents: {
    parentList: ['studentDocuments', 'parent'] as const,
    detail: (submissionId: string) => ['studentDocuments', 'detail', submissionId] as const,
  },
};
