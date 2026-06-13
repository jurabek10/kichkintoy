import type {
  PickupNoticeStatus,
  PickupRelationship,
} from "@kichkintoy/shared";

export function pickupStatusLabelKey(status: PickupNoticeStatus) {
  if (status === "submitted") return "status.submitted";
  if (status === "changed") return "status.changed";
  if (status === "acknowledged") return "status.acknowledged";
  return "status.cancelled";
}

export function pickupRelationshipLabelKey(relationship: PickupRelationship) {
  if (relationship === "mother") return "relationship.mother";
  if (relationship === "father") return "relationship.father";
  if (relationship === "grandparent") return "relationship.grandparent";
  return "relationship.other";
}
