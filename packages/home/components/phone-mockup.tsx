"use client";

import {
  BatteryFull,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  House,
  Images,
  Megaphone,
  PersonStanding,
  Pill,
  Signal,
  Smile,
  Sun,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

/* The parent app's real shortcut grid — same order and exact tile colors as
   packages/mobile/constants/data.ts. */
const tiles = [
  { key: "reports", Icon: BookOpen, bg: "#FBEBD2", fg: "#E29A45" },
  { key: "notices", Icon: Megaphone, bg: "#E1F0FF", fg: "#4D9FEC" },
  { key: "albums", Icon: Images, bg: "#FFF1CF", fg: "#F4A621" },
  { key: "calendar", Icon: CalendarDays, bg: "#FFE2DD", fg: "#F05A47" },
  { key: "attendance", Icon: CalendarCheck2, bg: "#DDF3E4", fg: "#46B06A" },
  { key: "meals", Icon: UtensilsCrossed, bg: "#FFF6D4", fg: "#EFB019" },
  { key: "medications", Icon: Pill, bg: "#FFE0E0", fg: "#F0594C" },
  { key: "pickups", Icon: PersonStanding, bg: "#DBECFF", fg: "#4D9FEC" },
] as const;

/** The hero's signature: the parent app's real home screen (header, greeting
 *  banner, center card with the shortcut grid, today's report) on an iPhone
 *  16 Pro Max frame, with live notification cards floating out of it. Colors
 *  and layout mirror packages/mobile — this is a screenshot, hand-built. */
export function PhoneMockup() {
  const { t } = useLayoutTranslation("home");

  return (
    <div className="relative mx-auto w-fit">
      {/* Soft candy blobs behind the phone */}
      <div
        aria-hidden="true"
        className="absolute -left-14 -top-10 h-40 w-40 rounded-full bg-[#FFC53D]/25 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-8 -right-12 h-44 w-44 rounded-full bg-[#4DABF7]/25 blur-2xl"
      />

      {/* iPhone 16 Pro Max — titanium frame, thin uniform bezel */}
      <div className="relative w-[300px] animate-float rounded-[3.4rem] bg-[#3A3C42] p-[5px] shadow-pop">
        {/* Side buttons */}
        <div
          aria-hidden="true"
          className="absolute -left-[7px] top-[110px] h-8 w-[3px] rounded-l-md bg-[#2C2E33]"
        />
        <div
          aria-hidden="true"
          className="absolute -left-[7px] top-[150px] h-14 w-[3px] rounded-l-md bg-[#2C2E33]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-[7px] top-[130px] h-20 w-[3px] rounded-r-md bg-[#2C2E33]"
        />

        <div className="relative flex h-[620px] flex-col overflow-hidden rounded-[3.1rem] border-[6px] border-black bg-[#F2F3F5]">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2.5 z-10 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-7 pb-1 pt-3.5 text-[#2B2D31]">
            <span className="text-[12px] font-bold tracking-tight">09:41</span>
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3 pt-1">
            {/* Home header: child profile + notifications (the real top bar) */}
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-sky text-[12px] font-bold text-sky-ink">
                  {t("phone.childName").slice(0, 1)}
                </span>
                <span className="text-[14px] font-bold text-[#2B2D31]">
                  {t("phone.childName")}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#8A8F99]" />
              </span>
              <span className="relative p-1">
                <Bell className="h-[18px] w-[18px] animate-ring text-[#2B2D31]" />
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-pulse-soft place-items-center rounded-full bg-coral-ink px-1 text-[8px] font-extrabold text-white">
                  2
                </span>
              </span>
            </div>

            {/* Greeting banner */}
            <div className="mt-1 flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-card">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunshine">
                <Sun className="h-4 w-4 text-[#F0A93B]" />
              </span>
              <span className="min-w-0">
                <p className="text-[12px] font-bold text-[#2B2D31]">
                  {t("phone.today")}
                </p>
                <p className="truncate text-[10px] font-semibold text-[#8A8F99]">
                  {t("phone.todaySub")}
                </p>
              </span>
            </div>

            {/* Center card: name + class + the real shortcut grid */}
            <div className="mt-2.5 rounded-2xl bg-white p-3 shadow-card">
              <p className="text-[13px] font-extrabold text-[#5B6BD6]">
                {t("phone.centerName")}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#8A8F99]">
                {t("phone.childClass")}
              </p>
              <div className="mt-2.5 grid grid-cols-4 gap-y-2.5">
                {tiles.map(({ key, Icon, bg, fg }) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color: fg }} />
                    </span>
                    <p className="max-w-full truncate px-0.5 text-[8px] font-semibold text-[#2B2D31]">
                      {t(`phone.tiles.${key}`)}
                    </p>
                  </div>
                ))}
              </div>
              {/* Pager dots */}
              <div className="mt-2.5 flex justify-center gap-1">
                <span className="h-1 w-3.5 rounded-full bg-[#3B8FF3]" />
                <span className="h-1 w-1 rounded-full bg-[#E7E9ED]" />
              </div>
            </div>

            {/* Today feed: latest report with the stats row */}
            <p className="mb-1.5 mt-3 px-0.5 text-[13px] font-extrabold text-[#2B2D31]">
              {t("phone.today")}
            </p>
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-coral px-2 py-0.5 text-[8.5px] font-bold text-coral-ink">
                  {t("phone.tiles.reports")}
                </span>
                <span className="text-[9px] font-semibold text-[#AEB4BE]">
                  {t("phone.feedDate")}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-[#2B2D31]">
                {t("phone.reportTitle")}
              </p>
              <div className="mt-2 flex gap-1.5">
                {(
                  [
                    { key: "statMood", Icon: Smile, value: "🙂" },
                    { key: "statPhotos", Icon: Images, value: "4" },
                    { key: "statUpdates", Icon: FileText, value: "3" },
                  ] as const
                ).map(({ key, Icon, value }) => (
                  <span
                    key={key}
                    className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-[#F2F3F5] py-2"
                  >
                    <Icon className="h-3 w-3 text-[#3B8FF3]" />
                    <span className="text-[8px] font-semibold text-[#8A8F99]">
                      {t(`phone.${key}`)}
                    </span>
                    <span className="text-[10px] font-bold text-[#2B2D31]">
                      {value}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Tab bar — the app's 5 real tabs, pinned to the bottom */}
            <div className="mt-auto flex items-center justify-between rounded-3xl bg-white px-6 py-2.5 shadow-card">
              <span className="flex flex-col items-center gap-0.5 text-[#3B8FF3]">
                <House className="h-4 w-4" />
                <span className="h-1 w-1 rounded-full bg-[#3B8FF3]" />
              </span>
              <BookOpen className="h-4 w-4 text-[#AEB4BE]" />
              <Images className="h-4 w-4 text-[#AEB4BE]" />
              <Megaphone className="h-4 w-4 text-[#AEB4BE]" />
              <PersonStanding className="h-4 w-4 text-[#AEB4BE]" />
            </div>

            {/* Home indicator */}
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-[#2B2D31]/20" />
          </div>
        </div>
      </div>

      {/* Floating notification: attendance marked (live tick) */}
      <div className="absolute -left-32 top-28 hidden animate-float-slow items-center gap-2.5 rounded-2xl bg-white p-3 pr-4 shadow-pop sm:flex">
        <span className="grid h-8 w-8 animate-pulse-soft place-items-center rounded-full bg-mint text-mint-ink">
          <Check className="h-4 w-4" />
        </span>
        <span>
          <p className="text-xs font-bold text-foreground">
            {t("phone.cardAttendanceTitle")}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground">
            {t("phone.cardAttendanceMeta")}
          </p>
        </span>
      </div>

      {/* Floating notification: new photos */}
      <div className="absolute -right-28 top-64 hidden animate-float items-center gap-2.5 rounded-2xl bg-white p-3 pr-4 shadow-pop sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-grape text-grape-ink">
          <Images className="h-4 w-4" />
        </span>
        <span>
          <p className="text-xs font-bold text-foreground">
            {t("phone.cardAlbumTitle")}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground">
            {t("phone.cardAlbumMeta")}
          </p>
        </span>
      </div>

      {/* Floating chat bubble: the teacher is typing… */}
      <div
        aria-hidden="true"
        className="absolute -left-20 bottom-24 hidden animate-float items-end gap-1 sm:flex"
      >
        <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 shadow-pop">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-[#3B8FF3]"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
