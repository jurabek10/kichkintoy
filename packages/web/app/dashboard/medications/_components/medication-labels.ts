import type { MedicationStatus } from "@kichkintoy/shared";

export function medicationStatusLabelKey(status: MedicationStatus) {
  if (status === "pending") return "status.pending";
  if (status === "administered") return "status.administered";
  if (status === "skipped") return "status.skipped";
  return "status.cancelled";
}
