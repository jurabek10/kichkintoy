// Central queryKey factory. Use these everywhere so invalidation stays consistent.
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
  albums: {
    all: () => ["albums"] as const,
    audience: (centerId: string) => ["albums", "audience", centerId] as const,
    staffList: (centerId: string, status?: string) =>
      ["albums", "staff", centerId, status ?? "all"] as const,
    parentList: (childId?: string) =>
      ["albums", "parent", childId ?? "all"] as const,
    detail: (postId: string) => ["albums", "detail", postId] as const,
  },
  meals: {
    all: () => ["meals"] as const,
    audience: (centerId: string) => ["meals", "audience", centerId] as const,
    staffList: (input: Record<string, unknown>) =>
      ["meals", "staff", input] as const,
    parentList: (input?: Record<string, unknown>) =>
      ["meals", "parent", input ?? {}] as const,
    detail: (mealId: string) => ["meals", "detail", mealId] as const,
  },
  medications: {
    all: () => ["medications"] as const,
    children: (centerId?: string | null) =>
      ["medications", "children", centerId ?? "parent"] as const,
    staffList: (input: Record<string, unknown>) =>
      ["medications", "staff", input] as const,
    parentList: (input?: Record<string, unknown>) =>
      ["medications", "parent", input ?? {}] as const,
    detail: (requestId: string) =>
      ["medications", "detail", requestId] as const,
    latestForChild: (childId: string) =>
      ["medications", "latest", childId] as const,
  },
  teacher: {
    classes: () => ["teacher", "classes"] as const,
    classChildren: (classId: string) =>
      ["teacher", "classes", classId, "children"] as const,
    reports: (params?: Record<string, unknown>) =>
      ["teacher", "reports", params ?? {}] as const,
    classReportStatuses: (classId: string, reportDate?: string) =>
      [
        "teacher",
        "classes",
        classId,
        "report-statuses",
        reportDate ?? "",
      ] as const,
    report: (reportId: string) => ["teacher", "reports", reportId] as const,
  },
  reports: {
    staffDashboard: (params: {
      director: boolean;
      centerId: string | null;
      date: string;
    }) => ["teacher", "reports", "dashboard", params] as const,
    detail: (reportId: string, isParent: boolean) =>
      ["reports", reportId, { isParent }] as const,
  },
  notices: {
    audience: (centerId: string) => ["notices", "audience", centerId] as const,
    authorList: (centerId: string, status?: string) =>
      ["notices", "author", centerId, status ?? "all"] as const,
    authorDetail: (noticeId: string) =>
      ["notices", "author", noticeId] as const,
    parentList: () => ["notices", "parent"] as const,
    parentDetail: (noticeId: string) =>
      ["notices", "parent", noticeId] as const,
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
