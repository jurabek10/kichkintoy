import type { CenterStatus } from "@kichkintoy/shared";

/** Badge variant per center status, shared by the admin screens. */
export const centerStatusVariant: Record<
  CenterStatus,
  "success" | "secondary" | "destructive" | "warning"
> = {
  active: "success",
  suspended: "destructive",
  inactive: "secondary",
  pending_verification: "warning",
};
