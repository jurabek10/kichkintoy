"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ChevronRight, Clock, Pill, Search } from "lucide-react";
import type { MedicationRequestSummary, MedicationStatus } from "@kichkintoy/shared";
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
import { SignedMedicationImage } from "./signed-medication-image";
import { medicationStatusLabelKey } from "./medication-labels";

const statusOptions: MedicationStatus[] = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
];

type ClassOption = { id: string; name: string };

export function StaffMedications({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("medications");
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState("all");
  const [todayClass, setTodayClass] = useState("all");
  const [tableClass, setTableClass] = useState("all");
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

  const todayRequests = todayQuery.data ?? [];
  const monthRequests = monthQuery.data ?? [];

  const todayClasses = useClassOptions(todayRequests);
  const tableClasses = useClassOptions(monthRequests);

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const error = todayQuery.error ?? monthQuery.error;

  // Time is free text ("after lunch", "08:30"), so it can't order a schedule.
  // Surface what still needs action: pending first, then by child name.
  const todayRows = inClass(todayRequests, todayClass).sort(
    (a, b) =>
      Number(b.status === "pending") - Number(a.status === "pending") ||
      a.child.name.localeCompare(b.child.name),
  );
  const tableRows = inClass(monthRequests, tableClass);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <PageHeading
            Icon={Pill}
            tone="coral"
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
            <Pill className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {todayRows.map((request) => (
              <MedicationRoundRow key={request.id} request={request} t={t} />
            ))}
          </Card>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("thisMonth")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={month} onValueChange={setMonth} className="w-[170px]" />
            <ClassFilter
              value={tableClass}
              onValueChange={setTableClass}
              classes={tableClasses}
              allLabel={t("filters.allClasses")}
            />
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
            <MedicationTable requests={tableRows} t={t} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One medication on today's round. Identity-led: thumbnail + child first, with
 * the qualitative dose time ("after lunch", "08:30", …) as a free-width chip so
 * any wording stays on one line. One tap opens the report.
 */
function MedicationRoundRow({
  request,
  t,
}: {
  request: MedicationRequestSummary;
  t: TFunction<"medications">;
}) {
  return (
    <Link
      href={`/dashboard/medications/${request.id}`}
      className="group flex items-center gap-3 px-3 py-3 transition hover:bg-muted/40 sm:gap-4 sm:px-4"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border bg-muted">
        {request.photo ? (
          <SignedMedicationImage
            mediaAssetId={request.photo.assetId}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Pill className="h-5 w-5 text-muted-foreground" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <ChildAvatar
            name={request.child.name}
            photoUrl={request.child.photoUrl}
            className="h-6 w-6 text-[10px]"
          />
          <span className="truncate text-sm font-semibold">
            {request.child.name}
          </span>
          {request.child.className ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {request.child.className}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground/80">
            {request.medicineName}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="truncate">{request.dosage}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-foreground/70">
            <Clock className="h-3 w-3" />
            <span className="truncate">{request.medicationTime}</span>
          </span>
        </div>
      </div>

      <Badge
        variant={medicationStatusVariant(request.status)}
        className="hidden shrink-0 sm:inline-flex"
      >
        {t(medicationStatusLabelKey(request.status))}
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
                router.push(`/dashboard/medications/${row.original.id}`);
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

function useClassOptions(requests: MedicationRequestSummary[]): ClassOption[] {
  return useMemo(() => {
    const unique = new Map<string, string>();
    for (const request of requests) {
      const { classId, className } = request.child;
      if (classId && className) unique.set(classId, className);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);
}

function inClass(requests: MedicationRequestSummary[], classId: string) {
  if (classId === "all") return requests;
  return requests.filter((request) => request.child.classId === classId);
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
