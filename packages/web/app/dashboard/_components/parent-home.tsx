"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IoArrowForward,
  IoBook,
  IoCalendar,
  IoCalendarNumber,
  IoCalendarOutline,
  IoChevronForward,
  IoDocumentText,
  IoDocumentTextOutline,
  IoHappyOutline,
  IoImages,
  IoImagesOutline,
  IoMedkit,
  IoMegaphone,
  IoRestaurant,
  IoSunny,
  IoWalk,
  IoWallet,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import { KidsLoader } from "@/components/kids-loader";
import { SignedAlbumImage } from "@/app/dashboard/albums/_components/signed-album-image";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { formatDayMonth, formatTime, formatWeekdayLong } from "@/lib/date";
import { todayIsoDate } from "../reports/_components/report-utils";
import { ParentAttendanceCalendar } from "./parent-attendance-calendar";

/**
 * Parent home — the mobile app's home screen, brought to the web. Same building
 * blocks in the same order as the phone, the same Ionicons, the same feed and
 * empty-state cards: a child header, a "today" greeting, the center card with a
 * shortcut grid, the day's feed (report → album → attendance calendar → notice),
 * and what's coming up. Driven by real data; dates render in the active language.
 */

// A small candy palette so each child gets a stable, distinct avatar colour.
const CHILD_COLORS = [
  "bg-sky-ink",
  "bg-grape-ink",
  "bg-mint-ink",
  "bg-coral-ink",
  "bg-sunshine-ink",
];

// The shortcut grid — the phone's feature tiles, with the phone's exact pastel
// fills, glyph colours, and Ionicons so the two platforms read identically.
type FeatureTile = {
  key: string;
  navKey: string;
  href: string;
  Icon: IconType;
  bg: string;
  fg: string;
};

const FEATURES: FeatureTile[] = [
  { key: "reports", navKey: "items.reports", href: "/dashboard/reports", Icon: IoBook, bg: "#FBEBD2", fg: "#E29A45" },
  { key: "notices", navKey: "items.notices", href: "/dashboard/notices", Icon: IoMegaphone, bg: "#E1F0FF", fg: "#4D9FEC" },
  { key: "albums", navKey: "items.albums", href: "/dashboard/albums", Icon: IoImages, bg: "#FFF1CF", fg: "#F4A621" },
  { key: "calendar", navKey: "items.calendar", href: "/dashboard/calendar", Icon: IoCalendar, bg: "#FFE2DD", fg: "#F05A47" },
  { key: "attendance", navKey: "items.attendance", href: "/dashboard/attendance", Icon: IoCalendarNumber, bg: "#DDF3E4", fg: "#46B06A" },
  { key: "meals", navKey: "items.meals", href: "/dashboard/meals", Icon: IoRestaurant, bg: "#FFF6D4", fg: "#EFB019" },
  { key: "medications", navKey: "items.medications", href: "/dashboard/medications", Icon: IoMedkit, bg: "#FFE0E0", fg: "#F0594C" },
  { key: "pickups", navKey: "items.pickups", href: "/dashboard/pickups", Icon: IoWalk, bg: "#DBECFF", fg: "#4D9FEC" },
  { key: "documents", navKey: "items.documents", href: "/dashboard/documents", Icon: IoDocumentText, bg: "#DCF2E3", fg: "#46B06A" },
  { key: "payments", navKey: "items.payments", href: "/dashboard/payments", Icon: IoWallet, bg: "#E5E4FF", fg: "#7C5CD8" },
];

// Per-kind feed tokens — identical to the mobile FEED_KIND_TOKENS map: a soft
// pill background, a deepened "ink" text colour, and a brighter glyph colour.
type FeedKind = "report" | "album" | "notice";
const FEED_TOKENS: Record<
  FeedKind,
  { Icon: IconType; iconColor: string; pill: string; ink: string }
> = {
  report: { Icon: IoDocumentText, iconColor: "#E8674E", pill: "bg-coral", ink: "text-coral-ink" },
  album: { Icon: IoImages, iconColor: "#7C5CD8", pill: "bg-grape", ink: "text-grape-ink" },
  notice: { Icon: IoMegaphone, iconColor: "#3E8FE0", pill: "bg-sky", ink: "text-sky-ink" },
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function ParentHome() {
  const { t, i18n } = useLayoutTranslation("app");
  const { t: tNav } = useLayoutTranslation("nav");
  const { session } = useSession();
  const lang = i18n.language;
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children(),
  });
  const children = childrenQuery.data?.children ?? [];

  useEffect(() => {
    if (!activeChildId && children.length > 0) {
      setActiveChildId(children[0]!.id);
    }
  }, [activeChildId, children]);

  const activeChild =
    children.find((c) => c.id === activeChildId) ?? children[0] ?? null;
  const childId = activeChild?.id ?? "";
  const colorFor = (id: string) =>
    CHILD_COLORS[children.findIndex((c) => c.id === id) % CHILD_COLORS.length]!;

  const reportsQuery = useQuery({
    queryKey: queryKeys.parent.childReports(childId),
    queryFn: () => orpc.reports.parentList({ childId }),
    enabled: !!childId,
  });
  const albumsQuery = useQuery({
    queryKey: queryKeys.albums.parentList(childId),
    queryFn: () => orpc.albums.parentList({ childId }),
    enabled: !!childId,
  });
  const noticesQuery = useQuery({
    queryKey: queryKeys.notices.parentList(),
    queryFn: () => orpc.notices.parentList({}),
  });
  const upcomingQuery = useQuery({
    queryKey: queryKeys.calendar.upcoming({ childId, limit: 4 }),
    queryFn: () => orpc.calendar.upcoming({ childId, limit: 4 }),
    enabled: !!childId,
  });

  if (!session) return null;

  // The report and album slots only surface today's items — otherwise each
  // shows its "nothing yet" card rather than a stale older entry. `today` is
  // the same value the reports system uses, so a report the teacher just wrote
  // always lands here. The notice slot keeps the most recent notice regardless
  // of date, since a center notice stays relevant beyond the day it was posted.
  const today = todayIsoDate();
  const latestReport = (reportsQuery.data ?? [])
    .filter((r) => r.status === "published" && r.reportDate === today)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  const latestAlbum = [...(albumsQuery.data ?? [])]
    .filter((a) => (a.publishedAt ?? "").slice(0, 10) === today)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];
  const latestNotice = [...(noticesQuery.data ?? [])].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  )[0];
  const upcoming = upcomingQuery.data ?? [];

  if (childrenQuery.isPending) {
    return <KidsLoader size="lg" className="min-h-[40vh]" />;
  }
  if (!activeChild) {
    return (
      <div className="mx-auto grid min-h-[40vh] max-w-md place-items-center gap-2 text-center">
        <IoHappyOutline className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-bold">{t("parentHome.noChildrenTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("parentHome.noChildrenBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3">
      {/* Child header — tappable profile + child switcher */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/dashboard/children"
          className="group flex min-w-0 items-center gap-2.5"
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
              colorFor(activeChild.id),
            )}
          >
            {initials(activeChild.name)}
          </span>
          <span className="truncate text-lg font-bold text-foreground">
            {activeChild.name}
          </span>
          <IoChevronForward className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {children.length > 1 ? (
        <div className="-mt-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children.map((child) => {
            const active = child.id === activeChild.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => setActiveChildId(child.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white",
                    colorFor(child.id),
                  )}
                >
                  {initials(child.name)}
                </span>
                {child.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Greeting banner */}
      <HomeCard className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunshine">
          <IoSunny className="h-5 w-5" style={{ color: "#F0A93B" }} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground">
            {t("parentHome.today")}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t("parentHome.todaySub")}
          </p>
        </div>
      </HomeCard>

      {/* Center card + feature grid */}
      <HomeCard>
        <p className="text-lg font-extrabold text-sky-ink">
          {activeChild.centerName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeChild.className
            ? t("parentHome.childClass", { name: activeChild.className })
            : activeChild.centerName}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6">
          {FEATURES.map((feature) => (
            <Link
              key={feature.key}
              href={feature.href}
              className="group flex flex-col items-center gap-2"
            >
              <span
                style={{ backgroundColor: feature.bg }}
                className="grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-105"
              >
                <feature.Icon className="h-6 w-6" style={{ color: feature.fg }} />
              </span>
              <span className="w-full truncate px-0.5 text-center text-[11px] text-foreground">
                {tNav(feature.navKey)}
              </span>
            </Link>
          ))}
        </div>
      </HomeCard>

      {/* Today feed */}
      <div className="mt-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-lg font-extrabold text-foreground">
          {t("parentHome.today")}
        </h2>
        <span className="shrink-0 text-xs font-semibold capitalize text-muted-foreground">
          {formatWeekdayLong(new Date(), lang)}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {reportsQuery.isPending ? (
          <HomeCard>
            <KidsLoader size="sm" />
          </HomeCard>
        ) : latestReport ? (
          <FeedCard
            href="/dashboard/reports"
            kind="report"
            tag={t("parentHome.report.tag")}
            time={formatDayMonth(latestReport.reportDate, lang)}
            title={t("parentHome.report.title")}
            body={latestReport.teacherNote?.trim() || t("parentHome.report.empty")}
            cta={t("parentHome.report.cta")}
          >
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat Icon={IoHappyOutline} label={t("parentHome.report.mood")} value={latestReport.mood?.trim() || "—"} />
              <Stat Icon={IoImagesOutline} label={t("parentHome.report.photos")} value={String(latestReport.photoCount)} />
              <Stat Icon={IoDocumentTextOutline} label={t("parentHome.report.updates")} value={String(latestReport.itemCount)} />
            </div>
          </FeedCard>
        ) : (
          <EmptyFeedCard
            kind="report"
            tag={t("parentHome.report.tag")}
            title={t("parentHome.report.none")}
            subtitle={t("parentHome.caughtUp")}
          />
        )}

        {albumsQuery.isPending ? null : latestAlbum ? (
          <FeedCard
            href="/dashboard/albums"
            kind="album"
            tag={t("parentHome.photos.tag")}
            time={latestAlbum.publishedAt ? formatDayMonth(latestAlbum.publishedAt, lang) : ""}
            title={latestAlbum.caption?.trim() || t("parentHome.photos.tag")}
            body={t("parentHome.photos.caption", { count: latestAlbum.mediaCount })}
            cta={t("parentHome.photos.cta")}
          >
            {latestAlbum.previewMedia.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {latestAlbum.previewMedia.slice(0, 4).map((media, i, arr) => {
                  const remaining = latestAlbum.mediaCount - arr.length;
                  const isLast = i === arr.length - 1;
                  return (
                    <div
                      key={media.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <SignedAlbumImage
                        mediaAssetId={media.assetId}
                        className="h-full w-full object-cover"
                      />
                      {isLast && remaining > 0 ? (
                        <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-bold text-white">
                          +{remaining}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </FeedCard>
        ) : (
          <EmptyFeedCard
            kind="album"
            tag={t("parentHome.photos.tag")}
            title={t("parentHome.photos.none")}
            subtitle={t("parentHome.caughtUp")}
          />
        )}

        {/* Attendance calendar */}
        <ParentAttendanceCalendar childId={childId} />

        {noticesQuery.isPending ? null : latestNotice ? (
          <FeedCard
            href="/dashboard/notices"
            kind="notice"
            tag={t("parentHome.notice.tag")}
            time={latestNotice.publishedAt ? formatDayMonth(latestNotice.publishedAt, lang) : ""}
            title={latestNotice.title}
            body={latestNotice.bodyPreview}
            cta={t("parentHome.notice.cta")}
          />
        ) : (
          <EmptyFeedCard
            kind="notice"
            tag={t("parentHome.notice.tag")}
            title={t("parentHome.notice.none")}
            subtitle={t("parentHome.caughtUp")}
          />
        )}
      </div>

      {/* Upcoming */}
      <HomeCard className="mt-2">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("parentHome.aside.upcoming")}
          </span>
          <IoCalendarOutline className="h-4 w-4 text-muted-foreground" />
        </div>
        {upcomingQuery.isPending ? (
          <KidsLoader size="sm" className="py-2" />
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("parentHome.aside.noUpcoming")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.map((event) => (
              <li key={event.id} className="flex items-center gap-3 py-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.allDay
                      ? formatDayMonth(event.startsAt, lang)
                      : `${formatDayMonth(event.startsAt, lang)} · ${formatTime(event.startsAt)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/calendar"
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
        >
          {t("parentHome.aside.viewCalendar")}
          <IoArrowForward className="h-3.5 w-3.5" />
        </Link>
      </HomeCard>
    </div>
  );
}

/** White rounded surface — the web twin of the mobile `Card`. */
function HomeCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The tag pill (icon + label) shared by feed and empty cards. */
function KindTag({ kind, label }: { kind: FeedKind; label: string }) {
  const token = FEED_TOKENS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold",
        token.pill,
        token.ink,
      )}
    >
      <token.Icon className="h-3.5 w-3.5" style={{ color: token.iconColor }} />
      {label}
    </span>
  );
}

function FeedCard({
  href,
  kind,
  tag,
  time,
  title,
  body,
  cta,
  children,
}: {
  href: string;
  kind: FeedKind;
  tag: string;
  time: string;
  title: string;
  body?: string;
  cta?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="flex items-center justify-between gap-2">
        <KindTag kind={kind} label={tag} />
        {time ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {time}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-bold leading-snug text-foreground">
        {title}
      </h3>
      {body ? (
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">
          {body}
        </p>
      ) : null}
      {children}
      {cta ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
          {cta}
          <IoArrowForward className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The "nothing yet" placeholder — the web twin of the mobile EmptyFeedCard. It
 * keeps the section's identity (the same tag pill) above a soft-tinted icon
 * badge and a friendly anticipation message.
 */
function EmptyFeedCard({
  kind,
  tag,
  title,
  subtitle,
}: {
  kind: FeedKind;
  tag: string;
  title: string;
  subtitle: string;
}) {
  const token = FEED_TOKENS[kind];
  return (
    <HomeCard>
      <KindTag kind={kind} label={tag} />
      <div className="flex flex-col items-center gap-2 py-5">
        <span
          className={cn(
            "grid h-14 w-14 place-items-center rounded-2xl",
            token.pill,
          )}
        >
          <token.Icon className="h-6 w-6" style={{ color: token.iconColor }} />
        </span>
        <p className="text-[15px] font-bold text-foreground">{title}</p>
        <p className="max-w-[240px] text-center text-xs leading-5 text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </HomeCard>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: IconType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-background py-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
