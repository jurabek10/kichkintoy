import { notificationRouteTarget } from "@kichkintoy/shared";
import type { Href } from "expo-router";

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): Href | null {
  const target = notificationRouteTarget(input);

  if (target.kind === "report")
    return { pathname: "/report/[id]", params: { id: target.id } };
  if (target.kind === "notice" && target.id)
    return { pathname: "/notice/[id]", params: { id: target.id } };
  if (target.kind === "notice") return "/(tabs)/notices";
  if (target.kind === "album")
    return { pathname: "/album/[id]", params: { id: target.id } };
  if (target.kind === "meal") return "/meals";
  if (target.kind === "calendar" && target.id)
    return { pathname: "/event/[id]", params: { id: target.id } };
  if (target.kind === "calendar") return "/feature/calendar";
  if (target.kind === "child_reports") return "/(tabs)/reports";
  if (target.kind === "payments") return "/feature/payments";
  if (target.kind === "documents") return "/documents";
  if (target.kind === "message") return `/messages/${target.id}` as Href;
  if (target.kind === "complaint") return `/complaints/${target.id}` as Href;

  return null;
}
