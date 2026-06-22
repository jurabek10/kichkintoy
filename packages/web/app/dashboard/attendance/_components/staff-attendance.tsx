"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  LogOut,
  Search,
  X,
} from "lucide-react";
import type { AttendanceRecordSummary, AttendanceStatus } from "@kichkintoy/shared";
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
import { Input } from "@/components/ui/input";
import { LoadingCard } from "@/components/loading-card";
import { formatTime } from "@/lib/date";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { attendanceStatusLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  AbsenceReasonForm,
  absenceReasonForForm,
  translateAbsenceReason,
} from "./absence-reason-form";
import { AttendanceCard } from "./attendance-card";

const statusOptions: AttendanceStatus[] = [
  "not_checked_in",
  "present",
  "late",
  "absent",
  "excused",
  "left_early",
  "picked_up",
];

// Bars and legends read left→right from "here and fine" to "needs a look".
const STATUS_ORDER: AttendanceStatus[] = [
  "present",
  "late",
  "picked_up",
  "left_early",
  "excused",
  "absent",
  "not_checked_in",
];

export function StaffAttendance({
  centerId,
  role,
}: {
  centerId: string | null;
  role: string;
}) {
  const { t } = useLayoutTranslation("attendance");
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState("all");
  const [classId, setClassId] = useState("all");
  const [absenceDraft, setAbsenceDraft] = useState<{
    childId: string;
    reason: string;
    note: string;
  } | null>(null);

  const directorView = role === "director";

  // The director sees the whole center grouped by class, so they always fetch
  // the full day (with the center-wide summary). Teachers narrow the fetch with
  // their class/status selects.
  const input = {
    centerId: centerId ?? "",
    date,
    status:
      directorView || status === "all" ? undefined : (status as AttendanceStatus),
    classId: directorView || classId === "all" ? undefined : classId,
  };

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId ?? "" }),
    enabled: !!centerId,
  });

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.attendance.staffList(input),
    queryFn: () => orpc.attendance.staffList(input),
    enabled: !!centerId,
  });

  const classes = useMemo(() => {
    const unique = new Map<string, string>();
    for (const child of childrenQuery.data?.children ?? []) {
      if (child.classId && child.className) unique.set(child.classId, child.className);
    }
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [childrenQuery.data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount(),
    });
  };

  const checkIn = useMutation({
    mutationFn: (childId: string) =>
      orpc.attendance.checkIn({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });

  const checkOut = useMutation({
    mutationFn: (childId: string) =>
      orpc.attendance.checkOut({ childId, attendanceDate: date }),
    onSuccess: invalidate,
  });

  const markAbsent = useMutation({
    mutationFn: (input: { childId: string; reason: string; note?: string }) =>
      orpc.attendance.markStatus({
        childId: input.childId,
        attendanceDate: date,
        status: "absent",
        absenceReason: input.reason,
        parentVisibleNote: input.note,
      }),
    onSuccess: async () => {
      setAbsenceDraft(null);
      await invalidate();
    },
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const summary = data?.summary;
  const records = data?.records ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>
              {directorView ? t("directorDescription") : t("staffDescription")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[155px]"
            />
            {!directorView ? (
              <>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allClasses")}</SelectItem>
                    {classes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[175px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    {statusOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`status.${item}`, attendanceStatusLabel(item))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>
        </CardHeader>
        {summary ? (
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Summary label={t("summary.total")} value={summary.total} />
              <Summary
                label={t("summary.present")}
                value={summary.present + summary.late}
                tone="present"
              />
              <Summary
                label={t("summary.absent")}
                value={summary.absent + summary.excused}
                tone="absent"
              />
              <Summary
                label={t("summary.pickedUp")}
                value={summary.pickedUp + summary.leftEarly}
                tone="left_early"
              />
            </div>
            <StatusMeter
              counts={summaryToCounts(summary)}
              total={summary.total}
              t={t}
            />
          </CardContent>
        ) : null}
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}
      {checkIn.error || checkOut.error || markAbsent.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {toApiError(checkIn.error ?? checkOut.error ?? markAbsent.error).message}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : records.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </Card>
      ) : directorView ? (
        <DirectorClassGroups records={records} t={t} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <AttendanceCard
              key={`${record.child.id}-${record.attendanceDate}`}
              record={record}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkIn.mutate(record.child.id)}
                    disabled={checkIn.isPending}
                  >
                    <Check className="h-4 w-4" />
                    {t("checkIn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkOut.mutate(record.child.id)}
                    disabled={checkOut.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("checkOut")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setAbsenceDraft({
                        childId: record.child.id,
                        reason: absenceReasonForForm(record.absenceReason, t),
                        note: record.parentVisibleNote ?? "",
                      })
                    }
                    disabled={markAbsent.isPending}
                  >
                    <X className="h-4 w-4" />
                    {t("absent")}
                  </Button>
                  {absenceDraft?.childId === record.child.id ? (
                    <AbsenceReasonForm
                      reason={absenceDraft.reason}
                      note={absenceDraft.note}
                      submitLabel={t("saveAbsent")}
                      isPending={markAbsent.isPending}
                      onReasonChange={(reason) =>
                        setAbsenceDraft((current) =>
                          current ? { ...current, reason } : current,
                        )
                      }
                      onNoteChange={(note) =>
                        setAbsenceDraft((current) =>
                          current ? { ...current, note } : current,
                        )
                      }
                      onCancel={() => setAbsenceDraft(null)}
                      onSubmit={() =>
                        markAbsent.mutate({
                          childId: record.child.id,
                          reason: absenceDraft.reason,
                          note: absenceDraft.note,
                        })
                      }
                    />
                  ) : null}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** The director's day as a list of collapsible class panels. */
function DirectorClassGroups({
  records,
  t,
}: {
  records: AttendanceRecordSummary[];
  t: TFunction<"attendance">;
}) {
  const noClass = t("noClass");
  const groups = useMemo(() => groupByClass(records, noClass), [records, noClass]);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <ClassAttendancePanel key={group.key} group={group} t={t} />
      ))}
    </div>
  );
}

function ClassAttendancePanel({
  group,
  t,
}: {
  group: ClassGroup;
  t: TFunction<"attendance">;
}) {
  const [open, setOpen] = useState(false);
  const counts = countsFromRecords(group.records);
  const total = group.records.length;
  const present = counts.present + counts.late;
  const absent = counts.absent + counts.excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold">{group.name}</h3>
            <Badge variant={rateVariant(rate)}>{rate}%</Badge>
          </div>
          <StatusBar
            counts={counts}
            total={total}
            className="mt-2 h-1.5 max-w-sm"
          />
          <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
            <LegendItem status="present" label={t("summary.present")} value={present} />
            <LegendItem status="absent" label={t("summary.absent")} value={absent} />
            <LegendItem
              status="not_checked_in"
              label={t("status.not_checked_in", attendanceStatusLabel("not_checked_in"))}
              value={counts.not_checked_in}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="nums text-sm font-bold">
            {present}/{total}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("summary.present")}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t p-4">
          <ClassAttendanceTable records={group.records} t={t} />
        </div>
      ) : null}
    </Card>
  );
}

/** One class's roster as the familiar TanStack table, with its own search. */
function ClassAttendanceTable({
  records,
  t,
}: {
  records: AttendanceRecordSummary[];
  t: TFunction<"attendance">;
}) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<AttendanceRecordSummary>[]>(
    () => [
      {
        id: "childName",
        accessorFn: (record) => record.child.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.child.name}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={statusBadge(row.original.status)}>
            {t(
              `status.${row.original.status}`,
              attendanceStatusLabel(row.original.status),
            )}
          </Badge>
        ),
        sortingFn: (left, right) =>
          compareText(
            attendanceStatusLabel(left.original.status),
            attendanceStatusLabel(right.original.status),
          ),
      },
      {
        accessorKey: "checkedInAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.checkIn")} />
        ),
        cell: ({ row }) => formatDateTime(row.original.checkedInAt),
        sortingFn: (left, right) =>
          compareNullableDate(left.original.checkedInAt, right.original.checkedInAt),
      },
      {
        accessorKey: "checkedOutAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.checkOut")} />
        ),
        cell: ({ row }) => formatDateTime(row.original.checkedOutAt),
        sortingFn: (left, right) =>
          compareNullableDate(
            left.original.checkedOutAt,
            right.original.checkedOutAt,
          ),
      },
      {
        accessorKey: "absenceReason",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("table.absentReason")}
          />
        ),
        cell: ({ row }) => translateAbsenceReason(row.original.absenceReason, t),
        sortingFn: (left, right) =>
          compareText(left.original.absenceReason, right.original.absenceReason),
      },
      {
        id: "note",
        accessorFn: (record) => record.parentVisibleNote ?? record.staffNote ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.note")} />
        ),
        cell: ({ row }) => row.original.parentVisibleNote ?? row.original.staffNote ?? "-",
      },
    ],
    [t],
  );

  const query = search.trim().toLowerCase();
  const rows = query
    ? records.filter((record) => record.child.name.toLowerCase().includes(query))
    : records;

  return (
    <DataTable
      columns={columns}
      data={rows}
      pageSize={25}
      emptyMessage={t("noMatchesTitle")}
      toolbar={(table) => (
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("search")}
              className="h-9 w-[200px] pl-8"
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      )}
    />
  );
}

/** Segmented composition bar (one slice per status). */
function StatusBar({
  counts,
  total,
  className,
}: {
  counts: Record<AttendanceStatus, number>;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-2.5 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {total > 0
        ? STATUS_ORDER.map((status) =>
            counts[status] > 0 ? (
              <div
                key={status}
                className={statusBar(status)}
                style={{ width: `${(counts[status] / total) * 100}%` }}
              />
            ) : null,
          )
        : null}
    </div>
  );
}

/** The center-wide bar + a labelled legend with counts. */
function StatusMeter({
  counts,
  total,
  t,
}: {
  counts: Record<AttendanceStatus, number>;
  total: number;
  t: TFunction<"attendance">;
}) {
  if (total <= 0) return null;
  const rate = Math.round(((counts.present + counts.late) / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          {t("summary.rate")}
        </span>
        <span className="nums font-bold">{rate}%</span>
      </div>
      <StatusBar counts={counts} total={total} />
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
          <LegendItem
            key={status}
            status={status}
            label={t(`status.${status}`, attendanceStatusLabel(status))}
            value={counts[status]}
          />
        ))}
      </div>
    </div>
  );
}

function LegendItem({
  status,
  label,
  value,
}: {
  status: AttendanceStatus;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", statusBar(status))} />
      {label}
      <span className="nums font-semibold text-foreground">{value}</span>
    </span>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: AttendanceStatus;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5">
        {tone ? (
          <span className={cn("h-2 w-2 rounded-full", statusBar(tone))} />
        ) : null}
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
      <p className="nums mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

type ClassGroup = {
  key: string;
  name: string;
  records: AttendanceRecordSummary[];
};

function groupByClass(
  records: AttendanceRecordSummary[],
  noClassLabel: string,
): ClassGroup[] {
  const map = new Map<string, ClassGroup>();
  for (const record of records) {
    const key = record.classId ?? "__none__";
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: record.className ?? noClassLabel,
        records: [],
      });
    }
    map.get(key)!.records.push(record);
  }
  const groups = [...map.values()];
  // Alphabetical, with the "no class" bucket pinned last.
  groups.sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return a.name.localeCompare(b.name);
  });
  for (const group of groups) {
    group.records.sort((a, b) => a.child.name.localeCompare(b.child.name));
  }
  return groups;
}

function emptyCounts(): Record<AttendanceStatus, number> {
  return {
    not_checked_in: 0,
    present: 0,
    absent: 0,
    late: 0,
    left_early: 0,
    picked_up: 0,
    excused: 0,
  };
}

function countsFromRecords(records: AttendanceRecordSummary[]) {
  const counts = emptyCounts();
  for (const record of records) counts[record.status] += 1;
  return counts;
}

function summaryToCounts(summary: {
  notCheckedIn: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  leftEarly: number;
  pickedUp: number;
}): Record<AttendanceStatus, number> {
  return {
    not_checked_in: summary.notCheckedIn,
    present: summary.present,
    late: summary.late,
    absent: summary.absent,
    excused: summary.excused,
    left_early: summary.leftEarly,
    picked_up: summary.pickedUp,
  };
}

function statusBadge(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return "success" as const;
    case "late":
      return "warning" as const;
    case "absent":
      return "destructive" as const;
    case "excused":
      return "info" as const;
    case "picked_up":
    case "left_early":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusBar(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return "bg-mint";
    case "late":
      return "bg-sunshine";
    case "absent":
      return "bg-coral";
    case "excused":
      return "bg-sky";
    case "picked_up":
      return "bg-grape";
    case "left_early":
      return "bg-grape/70";
    default:
      return "bg-muted-foreground/25";
  }
}

function rateVariant(rate: number) {
  if (rate >= 90) return "success" as const;
  if (rate >= 60) return "warning" as const;
  return "destructive" as const;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return formatTime(value);
}

function compareText(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").localeCompare(right ?? "");
}

function compareNullableDate(left: string | null, right: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return new Date(left).getTime() - new Date(right).getTime();
}
