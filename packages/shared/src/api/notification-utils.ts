import type { RealtimeQueryInvalidationHint } from "./realtime.js";

export type NotificationRouteInput = {
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
};

export type NotificationRouteTarget =
  | { kind: "report"; id: string }
  | { kind: "notice"; id: string }
  | { kind: "album"; id: string }
  | { kind: "calendar"; id: string }
  | { kind: "meal"; id: string | null }
  | { kind: "medication"; id: string }
  | { kind: "pickup"; id: string }
  | { kind: "documents"; id: string | null }
  | { kind: "attendance"; id: string | null }
  | { kind: "message"; id: string }
  | { kind: "notifications" };

export function notificationRouteTarget(input: NotificationRouteInput): NotificationRouteTarget {
  const source = `${input.notificationType}:${input.entityType ?? ""}`;
  const id = input.entityId;

  if (id && source.includes("report")) return { kind: "report", id };
  if (id && source.includes("notice")) return { kind: "notice", id };
  if (id && source.includes("album")) return { kind: "album", id };
  if (id && source.includes("calendar")) return { kind: "calendar", id };
  if (source.includes("meal")) return { kind: "meal", id };
  if (id && source.includes("medication")) return { kind: "medication", id };
  if (id && source.includes("pickup")) return { kind: "pickup", id };
  if (source.includes("student_document")) return { kind: "documents", id };
  if (source.includes("attendance")) return { kind: "attendance", id };
  if (id && (input.notificationType === "message.received" || input.entityType === "conversation_thread")) {
    return { kind: "message", id };
  }

  return { kind: "notifications" };
}

export function queryGroupFromHint(hint: RealtimeQueryInvalidationHint): readonly [string] {
  return [hint.group] as const;
}

export function isAttendanceNotification(input: NotificationRouteInput): boolean {
  return input.notificationType.includes("attendance") || input.entityType === "attendance_record";
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
