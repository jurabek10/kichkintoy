import { notificationRouteTarget } from "@kichkintoy/shared";

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): string {
  const target = notificationRouteTarget(input);

  if (target.kind === "report") return `/dashboard/reports/${target.id}`;
  if (target.kind === "notice") return `/dashboard/notices/${target.id}`;
  if (target.kind === "album") return `/dashboard/albums/${target.id}`;
  if (target.kind === "calendar") return `/dashboard/calendar/${target.id}`;
  if (target.kind === "meal" && target.id) return `/dashboard/meals/${target.id}`;
  if (target.kind === "medication") return `/dashboard/medications/${target.id}`;
  if (target.kind === "pickup") return `/dashboard/pickups/${target.id}`;
  if (target.kind === "documents" && target.id) return `/dashboard/documents/${target.id}`;
  if (target.kind === "documents") return "/dashboard/documents";
  if (target.kind === "attendance") return "/dashboard/attendance";
  return "/dashboard/notifications";
}
