"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Pill, Search } from "lucide-react";
import type { MedicationRequestSummary, MedicationStatus } from "@kichkintoy/shared";
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
import { MedicationCard } from "./medication-card";
import { medicationStatusLabelKey } from "./medication-labels";

const statusOptions: MedicationStatus[] = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
];

export function StaffMedications({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("medications");
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("all");
  const today = todayIso();
  const range = monthRange(month);

  const todayInput = { centerId: centerId ?? "", date: today };
  const todayQuery = useQuery({
    queryKey: queryKeys.medications.staffList(todayInput),
    queryFn: () => orpc.medications.staffList(todayInput),
    enabled: !!centerId,
  });

  const monthInput = {
    centerId: centerId ?? "",
    from: range.from,
    to: range.to,
    status: status === "all" ? undefined : (status as MedicationStatus),
  };
  const monthQuery = useQuery({
    queryKey: queryKeys.medications.staffList(monthInput),
    queryFn: () => orpc.medications.staffList(monthInput),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const todayRequests = todayQuery.data ?? [];
  const monthRequests = monthQuery.data ?? [];
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
        ) : todayRequests.length === 0 ? (
          <Card className="grid place-items-center gap-2 p-6 text-center">
            <Pill className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {todayRequests.map((request) => (
              <MedicationCard key={request.id} request={request} />
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
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(medicationStatusLabelKey(item))}
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
            <MedicationTable requests={monthRequests} t={t} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MedicationTable({
  requests,
  t,
}: {
  requests: MedicationRequestSummary[];
  t: TFunction<"medications">;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<MedicationRequestSummary>[]>(
    () => [
      {
        id: "child",
        accessorFn: (request) => request.child.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.child.name}</span>
        ),
      },
      {
        id: "class",
        accessorFn: (request) => request.child.className ?? "",
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
        id: "medicine",
        accessorFn: (request) => request.medicineName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.medicine")} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.medicineName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.dosage}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "medicationTime",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.time")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.medicationTime}</span>
        ),
      },
      {
        accessorKey: "requestedForDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.date")} />
        ),
        cell: ({ row }) => formatDate(row.original.requestedForDate),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={medicationStatusVariant(row.original.status)}>
            {t(medicationStatusLabelKey(row.original.status))}
          </Badge>
        ),
      },
    ],
    [t],
  );

  const query = search.trim().toLowerCase();
  const rows = query
    ? requests.filter((request) =>
        request.child.name.toLowerCase().includes(query),
      )
    : requests;

  return (
    <DataTable
      columns={columns}
      data={rows}
      pageSize={15}
      emptyMessage={t("table.empty")}
      onRowClick={(request) =>
        router.push(`/dashboard/medications/${request.id}`)
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
  );
}

function medicationStatusVariant(status: MedicationStatus) {
  if (status === "administered") return "success" as const;
  if (status === "skipped") return "warning" as const;
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
