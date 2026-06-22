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
