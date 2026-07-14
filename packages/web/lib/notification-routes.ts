import { notificationRouteTarget } from "@kichkintoy/shared";

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): string {
  const target = notificationRouteTarget(input);

  if (target.kind === "report") return `/dashboard/reports/${target.id}`;
  if (target.kind === "notice" && target.id)
    return `/dashboard/notices/${target.id}`;
  if (target.kind === "notice") return "/dashboard/notices";
  if (target.kind === "album") return `/dashboard/albums/${target.id}`;
  if (target.kind === "calendar" && target.id)
    return `/dashboard/calendar/${target.id}`;
  if (target.kind === "calendar") return "/dashboard/calendar";
  if (target.kind === "child_reports") return "/dashboard/reports";
  if (target.kind === "payments") return "/dashboard/payments";
  if (target.kind === "meal" && target.id)
    return `/dashboard/meals/${target.id}`;
  if (target.kind === "medication")
    return `/dashboard/medications/${target.id}`;
  if (target.kind === "pickup") return `/dashboard/pickups/${target.id}`;
  if (target.kind === "documents" && target.id)
    return `/dashboard/documents/${target.id}`;
  if (target.kind === "documents") return "/dashboard/documents";
  if (target.kind === "attendance") return "/dashboard/attendance";
  if (target.kind === "message") return `/dashboard/messages/${target.id}`;
  if (target.kind === "complaint") return `/dashboard/complaints/${target.id}`;
  return "/dashboard/notifications";
}
