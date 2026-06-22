"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Search, UserCheck } from "lucide-react";
import type { PickupNoticeStatus, PickupNoticeSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
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
import { PickupCard } from "./pickup-card";
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

export function StaffPickups({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("pickups");
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("all");
  const today = todayIso();
  const range = monthRange(month);

  const todayInput = { centerId: centerId ?? "", date: today };
  const todayQuery = useQuery({
    queryKey: queryKeys.pickups.staffList(todayInput),
    queryFn: () => orpc.pickups.staffList(todayInput),
    enabled: !!centerId,
  });

  const monthInput = {
    centerId: centerId ?? "",
    from: range.from,
    to: range.to,
    status: status === "all" ? undefined : (status as PickupNoticeStatus),
  };
  const monthQuery = useQuery({
    queryKey: queryKeys.pickups.staffList(monthInput),
    queryFn: () => orpc.pickups.staffList(monthInput),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const todayNotices = todayQuery.data ?? [];
  const monthNotices = monthQuery.data ?? [];
  const error = todayQuery.error ?? monthQuery.error;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("staffDescription")}</CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold">{t("todaySection")}</h2>
          <span className="text-sm text-muted-foreground">
            {formatDate(today)}
          </span>
        </div>
        {todayQuery.isPending ? (
          <LoadingCard label={t("loading")} />
        ) : todayNotices.length === 0 ? (
          <Card className="grid place-items-center gap-2 p-6 text-center">
            <UserCheck className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {todayNotices.map((notice) => (
              <PickupCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("thisMonth")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={month} onValueChange={setMonth} className="w-[170px]" />
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
          {monthQuery.isPending ? (
            <LoadingCard label={t("loading")} />
          ) : (
            <PickupTable notices={monthNotices} t={t} />
          )}
        </CardContent>
      </Card>
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
    ],
    [t],
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
