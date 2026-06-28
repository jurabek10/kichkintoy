import type { DailyReportListResponse } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// yyyy-mm-dd / yyyy-mm in the display timezone, so month filtering lines up
// with the dates parents actually see on each report.
export function reportDayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });
}

export function reportMonthKey(iso: string) {
  return reportDayKey(iso).slice(0, 7);
}

export function todayKey() {
  return reportDayKey(new Date().toISOString());
}

export function currentMonth() {
  return todayKey().slice(0, 7);
}

/** The moment a report reads as — when it went out, or its last edit. */
export function reportTimestamp(report: {
  publishedAt: string | null;
  updatedAt: string;
}) {
  return report.publishedAt ?? report.updatedAt;
}

// Mirrors the mobile app's mood faces so a child's day carries the same glyph
// on web and phone. Falls back to a calm face when the mood is free text.
const MOOD_EMOJI: { keywords: string[]; emoji: string }[] = [
  { keywords: ["happy", "excited", "energetic", "joy", "playful"], emoji: "😊" },
  { keywords: ["calm", "content", "good", "well", "fine"], emoji: "🙂" },
  { keywords: ["tired", "sleepy", "drowsy"], emoji: "😴" },
  { keywords: ["sad", "tearful", "cry", "upset"], emoji: "😢" },
  { keywords: ["irritable", "angry", "fussy"], emoji: "😣" },
];

export function moodEmoji(mood: string | null): string {
  if (!mood) return "🙂";
  const lower = mood.toLowerCase();
  return (
    MOOD_EMOJI.find((m) => m.keywords.some((k) => lower.includes(k)))?.emoji ??
    "🙂"
  );
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
