import { notificationRouteTarget } from "@kichkintoy/shared";
import type { Href } from "expo-router";

export function routeForNotification(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): Href | null {
  if (input.notificationType === "teacher.end_of_day") return "/";
  const target = notificationRouteTarget(input);

  if (target.kind === "report")
    return { pathname: "/report/[id]", params: { id: target.id } };
  if (target.kind === "notice")
    return target.id
      ? { pathname: "/notice/[id]", params: { id: target.id } }
      : "/(tabs)/notices";
  if (target.kind === "album")
    return { pathname: "/album/[id]", params: { id: target.id } };
  if (target.kind === "meal") return "/meals";
  if (target.kind === "message") return `/messages/${target.id}` as Href;
  if (target.kind === "complaint") return `/complaints/${target.id}` as Href;
  if (target.kind === "attendance") return "/attendance";
  if (target.kind === "medication")
    return target.id
      ? { pathname: "/medications/[id]", params: { id: target.id } }
      : "/medications";
  if (target.kind === "calendar")
    return target.id
      ? { pathname: "/calendar/[id]", params: { id: target.id } }
      : "/calendar";
  if (target.kind === "notifications") return "/";

  return null;
}
