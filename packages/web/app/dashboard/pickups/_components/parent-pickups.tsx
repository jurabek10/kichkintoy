"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ChevronRight, Plus, Search, UserCheck } from "lucide-react";
import type {
  PickupNoticeStatus,
  PickupNoticeSummary,
} from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
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
import { useSelectedChild } from "@/lib/selected-child";
import {
  pickupRelationshipLabelKey,
  pickupStatusLabelKey,
} from "./pickup-labels";

const statusOptions: PickupNoticeStatus[] = [
  "submitted",
  "changed",
  "acknowledged",
  "cancelled",
];

type ChildOption = { id: string; name: string };

export function ParentPickups() {
  const { t } = useLayoutTranslation("pickups");
  const router = useRouter();
  const today = todayIso();

  const [month, setMonth] = useState(today.slice(0, 7));
  const [status, setStatus] = useState("all");
  const [child, setChild] = useState("all");
  const [search, setSearch] = useState("");

  // One fetch of the full notice history feeds both the today timeline and the
  // month records table; the parent's list is small, so month/status/child are
  // narrowed on the client.
  // Scoped to the globally selected kid (header switcher).
  const { childId } = useSelectedChild();
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.pickups.parentList({ childId }),
    queryFn: () => orpc.pickups.parentList({ childId }),
    enabled: !!childId,
  });

  const childOptions = useChildOptions(notices);

  const columns = useMemo<ColumnDef<PickupNoticeSummary>[]>(
    () => buildColumns(t, router),
    [t, router],
  );

  // pickupTime is a real HH:MM, so today reads top-to-bottom as a timeline.
  const todayRows = notices
    .filter((notice) => notice.pickupDate === today)
    .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));

  const query = search.trim().toLowerCase();
  const monthRows = notices.filter((notice) => {
    if (notice.pickupDate.slice(0, 7) !== month) return false;
    if (status !== "all" && notice.status !== status) return false;
    if (child !== "all" && notice.child.id !== child) return false;
    if (query && !notice.child.name.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={UserCheck}
            tone="sky"
            title={t("title")}
            description={t("parentDescription")}
          />
          <Button asChild>
            <Link href="/dashboard/pickups/new">
              <Plus className="h-4 w-4" />
              {t("newNotice")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2 px-1">
          <h2 className="text-base font-bold">{t("todaySection")}</h2>
          <span className="text-sm text-muted-foreground">
            {formatDate(today)}
          </span>
        </div>
        {isPending ? (
          <LoadingCard label={t("loading")} />
        ) : todayRows.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sky/15 text-sky-ink">
              <UserCheck className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/pickups/new">
                <Plus className="h-4 w-4" />
                {t("schedulePickup")}
              </Link>
            </Button>
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {todayRows.map((notice) => (
              <PickupTimelineRow key={notice.id} notice={notice} t={t} />
            ))}
          </Card>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">{t("records")}</CardTitle>
            <CardDescription>{t("parentRecordsDescription")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker
              value={month}
              onValueChange={setMonth}
              className="w-[170px]"
            />
            {childOptions.length > 1 ? (
              <Select value={child} onValueChange={setChild}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allChildren")}</SelectItem>
                  {childOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[165px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(pickupStatusLabelKey(item))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <LoadingCard label={t("loading")} />
          ) : (
            <DataTable
              columns={columns}
              data={monthRows}
              pageSize={15}
              emptyMessage={t("table.empty")}
              onRowClick={(notice) =>
                router.push(`/dashboard/pickups/${notice.id}`)
              }
              toolbar={(table) => (
                <div className="flex items-center justify-between gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("table.search")}
                      className="h-9 w-[220px] pl-8"
                    />
                  </div>
                  <DataTableViewOptions table={table} />
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One pickup on today's timeline. The sky time tile leads — a parent scans for
 * "when" first — then who's being picked up and by whom. Mirrors the mobile
 * pickup card so the two surfaces read as one. One click opens the notice.
 */
function PickupTimelineRow({
  notice,
  t,
}: {
  notice: PickupNoticeSummary;
  t: TFunction<"pickups">;
}) {
  return (
    <Link
      href={`/dashboard/pickups/${notice.id}`}
      className="group flex items-center gap-3 px-3 py-3 transition hover:bg-muted/40 sm:gap-4 sm:px-4"
    >
      <span className="grid h-12 w-16 shrink-0 place-items-center rounded-xl bg-sky/15 text-base font-extrabold tabular-nums tracking-tight text-sky-ink">
        {notice.pickupTime}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {notice.child.name}
          </span>
          {notice.child.className ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {notice.child.className}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {notice.pickupPersonName}
          </span>{" "}
          · {t(pickupRelationshipLabelKey(notice.relationship))}
        </p>
      </div>

      <Badge
        variant={pickupStatusVariant(notice.status)}
        className="hidden shrink-0 sm:inline-flex"
      >
        {t(pickupStatusLabelKey(notice.status))}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function buildColumns(
  t: TFunction<"pickups">,
  router: ReturnType<typeof useRouter>,
): ColumnDef<PickupNoticeSummary>[] {
  return [
    {
      id: "child",
      accessorFn: (notice) => notice.child.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.child")} />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.child.name}</span>
      ),
    },
    {
      id: "class",
      accessorFn: (notice) => notice.child.className ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.class")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.child.className ?? "—"}
        </span>
      ),
    },
    {
      id: "person",
      accessorFn: (notice) => notice.pickupPersonName,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.person")} />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.original.pickupPersonName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t(pickupRelationshipLabelKey(row.original.relationship))}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "pickupTime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.time")} />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.pickupTime}</span>
      ),
    },
    {
      accessorKey: "pickupDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.date")} />
      ),
      cell: ({ row }) => formatDate(row.original.pickupDate),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant={pickupStatusVariant(row.original.status)}>
          {t(pickupStatusLabelKey(row.original.status))}
        </Badge>
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
              router.push(`/dashboard/pickups/${row.original.id}`);
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

function useChildOptions(notices: PickupNoticeSummary[]): ChildOption[] {
  return useMemo(() => {
    const unique = new Map<string, string>();
    for (const notice of notices) {
      unique.set(notice.child.id, notice.child.name);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [notices]);
}

function pickupStatusVariant(status: PickupNoticeStatus) {
  if (status === "acknowledged") return "success" as const;
  if (status === "changed") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
