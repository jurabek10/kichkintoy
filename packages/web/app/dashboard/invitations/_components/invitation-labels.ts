import type { InvitationKind, InvitationStatus } from "@kichkintoy/shared";

export function invitationKindLabelKey(kind: InvitationKind) {
  return kind === "parent" ? "kind.parent" : "kind.teacher";
}

export function invitationStatusLabelKey(status: InvitationStatus) {
  return `status.${status}`;
}
