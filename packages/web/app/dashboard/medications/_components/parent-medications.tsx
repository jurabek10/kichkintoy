"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, Clock, Pill, Plus, Search } from "lucide-react";
import type {
  MedicationRequestSummary,
  MedicationStatus,
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
import { MedicationCard } from "./medication-card";
import { SignedMedicationImage } from "./signed-medication-image";
import { medicationStatusLabelKey } from "./medication-labels";

type Period = "all" | "month" | "day";

const statusOptions: MedicationStatus[] = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
];

export function ParentMedications() {
  const { t } = useLayoutTranslation("medications");
  const router = useRouter();
  const today = todayIso();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);

  // One history fetch feeds both views: today's request cards and the full
  // request-history table. We sort newest-first up front so a request the
  // parent just sent sits at the top of the table the moment they land here.
  const {
    data: requests = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.medications.parentList({}),
    queryFn: () => orpc.medications.parentList({}),
    select: (rows) =>
      [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });

  const columns = useMemo<ColumnDef<MedicationRequestSummary>[]>(
    () => buildColumns(t, router),
    [t, router],
  );

  const todayRequests = requests.filter(
    (request) => request.requestedForDate === today,
  );

  const query = search.trim().toLowerCase();
  const rows = requests.filter((request) => {
    if (status !== "all" && request.status !== status) return false;
    if (period === "month" && request.requestedForDate.slice(0, 7) !== month)
      return false;
    if (period === "day" && request.requestedForDate !== day) return false;
    if (query) {
      const haystack = [
        request.medicineName,
        request.dosage,
        request.symptoms,
        request.child.name,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={Pill}
            tone="coral"
            title={t("title")}
            description={t("parentDescription")}
          />
          <Button asChild className="shrink-0">
            <Link href="/dashboard/medications/new">
              <Plus className="h-4 w-4" />
              {t("newRequest")}
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold">{t("todaySection")}</h2>
          <span className="text-sm text-muted-foreground">
            {formatDate(today)}
          </span>
        </div>
        {isPending ? (
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
        <CardHeader>
          <CardTitle className="text-base">{t("requestHistory")}</CardTitle>
          <CardDescription>{t("requestHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <LoadingCard label={t("loading")} />
          ) : requests.length === 0 ? (
            <Card className="grid place-items-center gap-2 p-8 text-center">
              <Pill className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">{t("empty.parentTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("empty.parentBody")}
              </p>
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={15}
              emptyMessage={t("table.empty")}
              onRowClick={(request) =>
                router.push(`/dashboard/medications/${request.id}`)
              }
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("table.search")}
                        className="h-9 w-[190px] pl-8"
                      />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-9 w-[150px]">
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
                    <PeriodToggle value={period} onValueChange={setPeriod} t={t} />
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

function buildColumns(
  t: TFunction<"medications">,
  router: ReturnType<typeof useRouter>,
): ColumnDef<MedicationRequestSummary>[] {
  return [
    {
      id: "medicine",
      accessorFn: (request) => request.medicineName,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.medicine")} />
      ),
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
              {request.photo ? (
                <SignedMedicationImage
                  mediaAssetId={request.photo.assetId}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Pill className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 max-w-[260px]">
              <p className="truncate font-medium">{request.medicineName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {request.dosage}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "child",
      accessorFn: (request) => request.child.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.child")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.child.name}</span>
      ),
    },
    {
      accessorKey: "medicationTime",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.time")} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {row.original.medicationTime}
        </span>
      ),
    },
    {
      accessorKey: "requestedForDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.date")} />
      ),
      cell: ({ row }) => (
        <span className="nums text-sm">
          {formatDate(row.original.requestedForDate)}
        </span>
      ),
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
              router.push(`/dashboard/medications/${row.original.id}`);
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
  t: TFunction<"medications">;
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}
