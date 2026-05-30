// Central queryKey factory. Use these everywhere so invalidation stays consistent
// (mirrors the docquery `getKey` convention, adapted to REST resources).
export const queryKeys = {
  geo: {
    regions: () => ["geo", "regions"] as const,
    districts: (regionId: string) =>
      ["geo", "regions", regionId, "districts"] as const,
  },
  centers: {
    search: (params: Record<string, unknown>) =>
      ["centers", "search", params] as const,
    byCode: (code: string) => ["centers", "by-code", code] as const,
    classes: (centerId: string) => ["centers", centerId, "classes"] as const,
  },
  auth: {
    invitations: (verificationToken: string) =>
      ["auth", "invitations", verificationToken] as const,
  },
  teacher: {
    classes: () => ["teacher", "classes"] as const,
    classChildren: (classId: string) =>
      ["teacher", "classes", classId, "children"] as const,
    reports: (params?: Record<string, unknown>) =>
      ["teacher", "reports", params ?? {}] as const,
    classReportStatuses: (classId: string, reportDate?: string) =>
      ["teacher", "classes", classId, "report-statuses", reportDate ?? ""] as const,
    report: (reportId: string) => ["teacher", "reports", reportId] as const,
  },
  parent: {
    children: () => ["parent", "children"] as const,
    childReports: (childId: string) =>
      ["parent", "children", childId, "reports"] as const,
  },
  director: {
    classes: (centerId: string) => ["director", centerId, "classes"] as const,
    classDetail: (centerId: string, classId: string) =>
      ["director", centerId, "classes", classId] as const,
    teachers: (centerId: string) => ["director", centerId, "teachers"] as const,
    joinRequests: (centerId: string, status?: string) =>
      ["director", centerId, "join-requests", status ?? ""] as const,
    invitations: (centerId: string) =>
      ["director", centerId, "invitations"] as const,
  },
} as const;
