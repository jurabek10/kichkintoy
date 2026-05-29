import type { DailyReportListResponse } from "@kichkintoy/shared";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function reportItemSummary(report: DailyReportListResponse[number]) {
  const pieces = [];
  if (report.itemCount) pieces.push(`${report.itemCount} items`);
  if (report.photoCount) pieces.push(`${report.photoCount} photos`);
  if (report.commentCount) pieces.push(`${report.commentCount} comments`);
  return pieces.join(" · ") || "No content yet";
}
