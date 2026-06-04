import type {
  FacilityType,
  InvitationKind,
  JoinRequestKind,
} from "@kichkintoy/shared";

export function facilityTypeLabel(value: FacilityType): string {
  if (value === "kindergarten") return "Kindergarten";
  if (value === "daycare") return "Daycare";
  return "Academy";
}

export function joinKindLabel(value: JoinRequestKind): string {
  if (value === "parent") return "Parent";
  if (value === "teacher") return "Teacher";
  return "Director";
}

export function invitationKindLabel(value: InvitationKind): string {
  return value === "parent" ? "Parent" : "Teacher";
}

export function assignmentRoleLabel(value: string): string {
  return value === "assistant_teacher" ? "Assistant" : "Teacher";
}

export function reportStatusLabel(value: string): string {
  if (value === "published") return "Published";
  if (value === "scheduled") return "Scheduled";
  return "Draft";
}

export function noticeStatusLabel(value: string): string {
  if (value === "published") return "Published";
  if (value === "scheduled") return "Scheduled";
  return "Draft";
}

export function noticeAudienceLabel(value: string): string {
  if (value === "center") return "Whole center";
  if (value === "class") return "Classes";
  return "Children";
}

export function reportItemTypeLabel(value: string): string {
  if (value === "meal") return "Meal";
  if (value === "sleep") return "Sleep";
  if (value === "toilet") return "Toilet";
  if (value === "mood") return "Mood";
  if (value === "activity") return "Activity";
  if (value === "temperature") return "Temperature";
  if (value === "medication") return "Medication";
  if (value === "health") return "Health";
  return "Custom";
}

export function genderLabel(value: string | null | undefined): string {
  if (value === "boy") return "Boy";
  if (value === "girl") return "Girl";
  if (value === "prefer_not_to_say") return "Prefer not to say";
  return "—";
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const ms = Date.now() - date.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
