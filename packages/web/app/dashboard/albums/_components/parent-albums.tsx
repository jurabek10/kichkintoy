"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpRight,
  Heart,
  ImageIcon,
  Images,
  MessageCircle,
  Search,
} from "lucide-react";
import type { AlbumPostSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { SignedAlbumImage } from "./signed-album-image";
import { TodayAlbums } from "./today-albums";
import {
  albumDate,
  albumTitle,
  currentMonth,
  dayKey,
  monthKey,
  todayKey,
} from "./album-helpers";

type Period = "all" | "month" | "day";
type ClassOption = { id: string; name: string };

export function ParentAlbums() {
  const { t } = useLayoutTranslation("albums");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [month, setMonth] = useState(currentMonth());
  const [day, setDay] = useState(todayKey());

  const {
    data: posts = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.albums.parentList(),
    queryFn: () => orpc.albums.parentList({}),
  });

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const post of posts) {
      for (const klass of post.classes) unique.set(klass.id, klass.name);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [posts]);

  const columns = useMemo<ColumnDef<AlbumPostSummary>[]>(
    () => buildColumns(t, router),
    [t, router],
  );

  const query = search.trim().toLowerCase();
  const rows = posts.filter((post) => {
    if (classId !== "all" && !post.classes.some((c) => c.id === classId)) {
      return false;
    }
    if (period === "month" && monthKey(albumDate(post)) !== month) return false;
    if (period === "day" && dayKey(albumDate(post)) !== day) return false;
    if (query) {
      const haystack = [
        albumTitle(post, t),
        post.caption,
        post.bodyPreview,
        post.author.fullName,
        post.classes.map((c) => c.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <PageHeading
            Icon={Images}
            tone="grape"
            title={t("title")}
            description={t("parentDescription")}
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : posts.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-grape/20">
            <Images className="h-6 w-6 text-grape-ink" />
          </span>
          <p className="font-bold text-foreground">{t("empty.parentTitle")}</p>
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            {t("empty.parentBody")}
          </p>
        </Card>
      ) : (
        <>
          <TodayAlbums posts={posts} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              {t("allAlbums")}
            </h2>
            <Card>
              <CardContent className="p-4 sm:p-5">
                <DataTable
                  columns={columns}
                  data={rows}
                  pageSize={15}
                  emptyMessage={t("table.empty")}
                  onRowClick={(post) =>
                    router.push(`/dashboard/albums/${post.id}`)
                  }
                  toolbar={(table) => (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={t("table.search")}
                          className="h-9 w-[200px] pl-8"
                        />
                      </div>
                      {classOptions.length > 1 ? (
                        <Select value={classId} onValueChange={setClassId}>
                          <SelectTrigger className="h-9 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t("table.allClasses")}
                            </SelectItem>
                            {classOptions.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <PeriodToggle
                        value={period}
                        onValueChange={setPeriod}
                        t={t}
                      />
                      {period === "month" ? (
                        <MonthPicker
                          value={month}
                          onValueChange={setMonth}
                          className="w-[160px]"
                        />
                      ) : period === "day" ? (
                        <DatePicker
                          value={day}
                          onValueChange={setDay}
                          className="w-[160px]"
                        />
                      ) : null}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function buildColumns(
  t: TFunction<"albums">,
  router: ReturnType<typeof useRouter>,
): ColumnDef<AlbumPostSummary>[] {
  return [
    {
      id: "album",
      accessorFn: (post) => albumTitle(post, t),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.album")} />
      ),
      cell: ({ row }) => {
        const post = row.original;
        const asset = post.coverMedia?.assetId ?? post.previewMedia[0]?.assetId;
        const classNames = post.classes.map((c) => c.name).join(", ");
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              {asset ? (
                <SignedAlbumImage
                  mediaAssetId={asset}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{albumTitle(post, t)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {classNames || post.author.fullName}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "mediaCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.photos")} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          {row.original.mediaCount}
        </span>
      ),
    },
    {
      id: "engagement",
      accessorFn: (post) => post.reactionSummary.heartCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.engagement")} />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-3 tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {row.original.reactionSummary.heartCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {row.original.commentCount}
          </span>
        </span>
      ),
    },
    {
      id: "date",
      accessorFn: (post) => albumDate(post),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.date")} />
      ),
      cell: ({ row }) => (
        <span className="nums text-sm text-muted-foreground">
          {formatDate(albumDate(row.original))}
        </span>
      ),
    },
    {
      id: "open",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("table.open")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/albums/${row.original.id}`);
            }}
          >
            {t("table.open")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

function PeriodToggle({
  value,
  onValueChange,
  t,
}: {
  value: Period;
  onValueChange: (value: Period) => void;
  t: TFunction<"albums">;
}) {
  const options: { key: Period; label: string }[] = [
    { key: "all", label: t("table.period.all") },
    { key: "month", label: t("table.period.month") },
    { key: "day", label: t("table.period.day") },
  ];
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onValueChange(option.key)}
          aria-pressed={value === option.key}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition",
            value === option.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
