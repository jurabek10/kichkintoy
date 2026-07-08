"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ChevronRight, Search, UserCheck } from "lucide-react";
import type { PickupNoticeStatus, PickupNoticeSummary } from "@kichkintoy/shared";
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
import { ChildAvatar } from "@/components/child-avatar";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
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
import {
  pickupRelationshipLabelKey,
  pickupStatusLabelKey,
} from "./pickup-labels";

type RecordsView = "day" | "month";

const statusOptions: PickupNoticeStatus[] = [
  "submitted",
  "changed",
  "acknowledged",
  "cancelled",
];

type ClassOption = { id: string; name: string };

export function StaffPickups({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("pickups");
  const today = todayIso();
  const [view, setView] = useState<RecordsView>("day");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("all");
  const [todayClass, setTodayClass] = useState("all");
  const [tableClass, setTableClass] = useState("all");
  const range = monthRange(month);

  const todayInput = { centerId: centerId ?? "", date: today };
  const todayQuery = useQuery({
    queryKey: queryKeys.pickups.staffList(todayInput),
    queryFn: () => orpc.pickups.staffList(todayInput),
    enabled: !!centerId,
  });

  // The records table narrows to a single day by default — a month of daily
  // pickups is hundreds of rows — and can switch to a month overview.
  const statusFilter =
    status === "all" ? undefined : (status as PickupNoticeStatus);
  const recordsInput =
    view === "day"
      ? { centerId: centerId ?? "", date: day, status: statusFilter }
      : {
          centerId: centerId ?? "",
          from: range.from,
          to: range.to,
          status: statusFilter,
        };
  const recordsQuery = useQuery({
    queryKey: queryKeys.pickups.staffList(recordsInput),
    queryFn: () => orpc.pickups.staffList(recordsInput),
    enabled: !!centerId,
  });

  const todayNotices = todayQuery.data ?? [];
  const recordNotices = recordsQuery.data ?? [];

  const todayClasses = useClassOptions(todayNotices);
  const tableClasses = useClassOptions(recordNotices);

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const error = todayQuery.error ?? recordsQuery.error;

  // pickupTime is a real HH:MM, so today reads as a pickup timeline.
  const todayRows = inClass(todayNotices, todayClass).sort((a, b) =>
    a.pickupTime.localeCompare(b.pickupTime),
  );
  const tableRows = inClass(recordNotices, tableClass);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <PageHeading
            Icon={UserCheck}
            tone="sky"
            title={t("title")}
            description={t("staffDescription")}
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold">{t("todaySection")}</h2>
            <span className="text-sm text-muted-foreground">
              {formatDate(today)}
            </span>
          </div>
          <ClassFilter
            value={todayClass}
            onValueChange={setTodayClass}
            classes={todayClasses}
            allLabel={t("filters.allClasses")}
          />
        </div>
        {todayQuery.isPending ? (
          <LoadingCard label={t("loading")} />
        ) : todayRows.length === 0 ? (
          <Card className="grid place-items-center gap-2 p-6 text-center">
            <UserCheck className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
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
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">{t("records")}</CardTitle>
            <ViewToggle value={view} onValueChange={setView} t={t} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === "day" ? (
              <DatePicker
                value={day}
                onValueChange={setDay}
                className="w-[170px]"
              />
            ) : (
              <MonthPicker
                value={month}
                onValueChange={setMonth}
                className="w-[170px]"
              />
            )}
            <ClassFilter
              value={tableClass}
              onValueChange={setTableClass}
              classes={tableClasses}
              allLabel={t("filters.allClasses")}
            />
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
          {recordsQuery.isPending ? (
            <LoadingCard label={t("loading")} />
          ) : (
            <PickupTable notices={tableRows} t={t} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One pickup on today's timeline. Time-led (pickupTime is a real clock value),
 * then who's being picked up and by whom. One tap opens the notice.
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
      <span className="w-14 shrink-0 text-base font-bold tabular-nums tracking-tight">
        {notice.pickupTime}
      </span>
      <span className="h-9 w-px shrink-0 bg-border" aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <ChildAvatar
            name={notice.child.name}
            photoUrl={notice.child.photoUrl}
            className="h-6 w-6 text-[10px]"
          />
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

function ClassFilter({
  value,
  onValueChange,
  classes,
  allLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  classes: ClassOption[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {classes.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ViewToggle({
  value,
  onValueChange,
  t,
}: {
  value: RecordsView;
  onValueChange: (value: RecordsView) => void;
  t: TFunction<"pickups">;
}) {
  const options: { key: RecordsView; label: string }[] = [
    { key: "day", label: t("view.day") },
    { key: "month", label: t("view.month") },
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

function PickupTable({
  notices,
  t,
}: {
  notices: PickupNoticeSummary[];
  t: TFunction<"pickups">;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<PickupNoticeSummary>[]>(
    () => [
      {
        id: "child",
        accessorFn: (notice) => notice.child.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => (
          <span className="flex items-center gap-2.5">
            <ChildAvatar
              name={row.original.child.name}
              photoUrl={row.original.child.photoUrl}
            />
            <span className="font-semibold">{row.original.child.name}</span>
          </span>
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
    ],
    [router, t],
  );

  const query = search.trim().toLowerCase();
  const rows = query
    ? notices.filter((notice) =>
        notice.child.name.toLowerCase().includes(query),
      )
    : notices;

  return (
    <DataTable
      columns={columns}
      data={rows}
      pageSize={15}
      emptyMessage={t("table.empty")}
      onRowClick={(notice) => router.push(`/dashboard/pickups/${notice.id}`)}
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
  );
}

function useClassOptions(notices: PickupNoticeSummary[]): ClassOption[] {
  return useMemo(() => {
    const unique = new Map<string, string>();
    for (const notice of notices) {
      const { classId, className } = notice.child;
      if (classId && className) unique.set(classId, className);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [notices]);
}

function inClass(notices: PickupNoticeSummary[], classId: string) {
  if (classId === "all") return notices;
  return notices.filter((notice) => notice.child.classId === classId);
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

function currentMonth() {
  return todayIso().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year!, monthIndex!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
