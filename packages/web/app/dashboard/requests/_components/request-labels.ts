import type { InvitationKind } from "@kichkintoy/shared";

export type JoinRequestKind = "parent" | "teacher" | "director";
export type JoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export function joinRequestKindLabelKey(kind: JoinRequestKind) {
  if (kind === "parent") return "kind.parent";
  if (kind === "teacher") return "kind.teacher";
  return "kind.director";
}

export function joinRequestStatusLabelKey(status: JoinRequestStatus) {
  return `status.${status}`;
}

export function invitationKindLabelKey(kind: InvitationKind) {
  return kind === "parent" ? "kind.parent" : "kind.teacher";
}
