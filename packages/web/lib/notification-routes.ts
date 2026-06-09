import type { RealtimeQueryInvalidationHint } from "@kichkintoy/shared";

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): string {
  const source = `${input.notificationType}:${input.entityType ?? ""}`;
  const id = input.entityId;

  if (id && source.includes("report")) return `/dashboard/reports/${id}`;
  if (id && source.includes("notice")) return `/dashboard/notices/${id}`;
  if (id && source.includes("album")) return `/dashboard/albums/${id}`;
  if (id && source.includes("calendar")) return `/dashboard/calendar/${id}`;
  if (id && source.includes("meal")) return `/dashboard/meals/${id}`;
  if (id && source.includes("medication")) {
    return `/dashboard/medications/${id}`;
  }
  if (id && source.includes("pickup")) return `/dashboard/pickups/${id}`;
  if (source.includes("student_document.request_sent")) {
    return "/dashboard/documents";
  }
  if (id && source.includes("student_document")) {
    return `/dashboard/documents/${id}`;
  }
  if (source.includes("attendance")) return "/dashboard/attendance";

  return "/dashboard/notifications";
}

export function queryGroupFromHint(hint: RealtimeQueryInvalidationHint) {
  return [hint.group] as const;
}
