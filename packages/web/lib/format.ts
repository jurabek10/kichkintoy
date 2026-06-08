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

export function albumVisibilityLabel(value: string): string {
  if (value === "class") return "Class-wide";
  if (value === "tagged_children") return "Tagged children";
  return value;
}

export function albumStatusLabel(value: string): string {
  if (value === "published") return "Published";
  if (value === "draft") return "Draft";
  return value;
}

export function mealTypeLabel(value: string): string {
  if (value === "breakfast") return "Breakfast";
  if (value === "lunch") return "Lunch";
  if (value === "snack") return "Snack";
  if (value === "dinner") return "Dinner";
  return value;
}

export function mealAudienceLabel(value: string): string {
  if (value === "center") return "Whole center";
  if (value === "class") return "Classes";
  return value;
}

export function eatingStatusLabel(value: string): string {
  if (value === "ate_all") return "All";
  if (value === "ate_most") return "Most";
  if (value === "ate_some") return "Some";
  if (value === "did_not_eat") return "None";
  return value;
}

export function medicationStatusLabel(value: string): string {
  if (value === "pending") return "Pending";
  if (value === "administered") return "Administered";
  if (value === "skipped") return "Skipped";
  if (value === "cancelled") return "Cancelled";
  return value;
}

export function pickupStatusLabel(value: string): string {
  if (value === "submitted") return "Submitted";
  if (value === "acknowledged") return "Acknowledged";
  if (value === "changed") return "Changed";
  if (value === "cancelled") return "Cancelled";
  return value;
}

export function attendanceStatusLabel(value: string): string {
  if (value === "not_checked_in") return "Not checked in";
  if (value === "present") return "Present";
  if (value === "absent") return "Absent";
  if (value === "late") return "Late";
  if (value === "left_early") return "Left early";
  if (value === "picked_up") return "Picked up";
  if (value === "excused") return "Excused";
  if (value === "cancelled") return "Cancelled";
  return value;
}

export function pickupRelationshipLabel(value: string): string {
  if (value === "mother") return "Mother";
  if (value === "father") return "Father";
  if (value === "grandparent") return "Grandparent";
  if (value === "other") return "Other";
  return value;
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
