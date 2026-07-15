import { Ionicons } from "@expo/vector-icons";
import { notificationRouteTarget } from "@kichkintoy/shared";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type NotificationVisual = {
  icon: IconName;
  /** Tailwind background class for the icon tile. */
  tileClass: string;
  /** Hex ink for the Ionicon (Tailwind can't reach the `color` prop). */
  ink: string;
};

/**
 * A notification wears the colour of the screen it came from — a report reads
 * coral, a notice sky, an album grape — so the inbox is scannable by domain at a
 * glance rather than a wall of identical bells. Keyed by the shared route kind.
 */
const VISUALS: Record<string, NotificationVisual> = {
  report: { icon: "reader", tileClass: "bg-coral", ink: "#E8674E" },
  notice: { icon: "megaphone", tileClass: "bg-sky", ink: "#3E8FE0" },
  album: { icon: "images", tileClass: "bg-grape", ink: "#7C5CD8" },
  meal: { icon: "restaurant", tileClass: "bg-sunshine", ink: "#F4A621" },
  medication: { icon: "medkit", tileClass: "bg-coral", ink: "#E8674E" },
  pickup: { icon: "walk", tileClass: "bg-sunshine", ink: "#F4A621" },
  attendance: {
    icon: "checkmark-circle",
    tileClass: "bg-mint",
    ink: "#46B06A",
  },
  calendar: { icon: "calendar", tileClass: "bg-sky", ink: "#3E8FE0" },
  documents: { icon: "document-text", tileClass: "bg-grape", ink: "#7C5CD8" },
  message: { icon: "chatbubble", tileClass: "bg-grape", ink: "#7C5CD8" },
  complaint: {
    icon: "shield-checkmark",
    tileClass: "bg-sunshine",
    ink: "#B56E00",
  },
  notifications: { icon: "notifications", tileClass: "bg-sky", ink: "#3E8FE0" },
  child_reports: { icon: "home", tileClass: "bg-sky", ink: "#3E8FE0" },
  payments: { icon: "card", tileClass: "bg-mint", ink: "#46B06A" },
};

export function notificationVisual(input: {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}): NotificationVisual {
  if (input.notificationType === "teacher.attendance_summary")
    return VISUALS.attendance!;
  if (input.notificationType === "teacher.medications_today")
    return VISUALS.medication!;
  if (input.notificationType === "teacher.end_of_day")
    return VISUALS.child_reports!;
  if (input.notificationType === "teacher.tomorrow_reminder")
    return VISUALS.calendar!;
  if (input.notificationType === "teacher.notice_reminder")
    return VISUALS.notice!;
  if (input.notificationType === "digest.tomorrow_events")
    return VISUALS.calendar!;
  if (input.notificationType === "document.deadline_reminder")
    return VISUALS.documents!;
  if (input.notificationType === "notice.unread_nudge") return VISUALS.notice!;
  return VISUALS[notificationRouteTarget(input).kind] ?? VISUALS.notifications!;
}
