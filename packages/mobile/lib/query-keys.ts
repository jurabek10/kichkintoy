/** Central query-key factory so cache invalidation stays consistent. */
export const queryKeys = {
  parent: {
    children: ['parent', 'children'] as const,
    childReports: (childId: string) => ['parent', 'reports', childId] as const,
  },
  albums: {
    parentList: (childId: string) => ['albums', 'parent', childId] as const,
  },
  notices: {
    parentList: ['notices', 'parent'] as const,
  },
  calendar: {
    upcoming: (childId: string) => ['calendar', 'upcoming', childId] as const,
  },
  attendance: {
    parentList: (childId: string, from: string, to: string) =>
      ['attendance', 'parent', childId, from, to] as const,
  },
};
