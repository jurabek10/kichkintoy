import type { DailyReportListResponse } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function reportItemSummary(
  report: DailyReportListResponse[number],
  t?: TFunction<"reports">,
) {
  const pieces = [];
  if (report.itemCount) {
    pieces.push(t?.("summary.items", { count: report.itemCount }) ?? `${report.itemCount} items`);
  }
  if (report.photoCount) {
    pieces.push(t?.("summary.photos", { count: report.photoCount }) ?? `${report.photoCount} photos`);
  }
  if (report.commentCount) {
    pieces.push(
      t?.("summary.comments", { count: report.commentCount }) ??
        `${report.commentCount} comments`,
    );
  }
  return pieces.join(" · ") || t?.("summary.empty") || "No content yet";
}
