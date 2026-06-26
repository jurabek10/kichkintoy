import type { AlbumPostSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

/** The date an album reads as — its publish time, or last edit while a draft. */
export function albumDate(post: AlbumPostSummary) {
  return post.publishedAt ?? post.updatedAt;
}

/** The album's display title: the caption's first line, else a body preview. */
export function albumTitle(post: AlbumPostSummary, t: TFunction<"albums">) {
  const firstLine = post.caption.split("\n")[0]?.trim();
  return firstLine || post.bodyPreview || t("card.emptyTitle");
}

// yyyy-mm-dd / yyyy-mm in the display timezone, so date math matches shown dates.
export function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });
}

export function monthKey(iso: string) {
  return dayKey(iso).slice(0, 7);
}

export function todayKey() {
  return dayKey(new Date().toISOString());
}

export function currentMonth() {
  return todayKey().slice(0, 7);
}
