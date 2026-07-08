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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChildAvatar } from "@/components/child-avatar";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
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
  const [classId, setClassId] = useState("all");

  const directorView = role === "director";

  // Both roles fetch the full day for the chosen scope; the teacher's table
  // filters by status and sex on the client, so it stays instant and the
  // running count always reflects the whole class.
  const input = {
    centerId: centerId ?? "",
    date,
    status: undefined,
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
    onSuccess: invalidate,
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
          <PageHeading
            Icon={ClipboardCheck}
            tone="mint"
            title={t("title")}
            description={
              directorView ? t("directorDescription") : t("staffDescription")
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[155px]"
            />
            {!directorView ? (
              // Status now filters inside the table (with the roster) rather
              // than re-fetching; only the class scope stays in the header.
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
            ) : null}
          </div>
        </CardHeader>
        {directorView && summary ? (
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
        <TeacherAttendanceTable
          records={records}
          summary={summary ?? null}
          onCheckIn={(childId) => checkIn.mutate(childId)}
          onCheckOut={(childId) => checkOut.mutate(childId)}
          onMarkAbsent={(values) => markAbsent.mutateAsync(values)}
          checkInPending={checkIn.isPending}
          checkOutPending={checkOut.isPending}
          markAbsentPending={markAbsent.isPending}
          t={t}
        />
      )}
    </div>
  );
}

type AttendanceSummary = {
  total: number;
  notCheckedIn: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  leftEarly: number;
  pickedUp: number;
};

type AbsenceDraft = {
  childId: string;
  name: string;
  reason: string;
  note: string;
};

/**
 * The teacher's day as one scannable roster table: a running number, the child
 * (with sex), status, the in/out times, who picked the child up and how they're
 * related, an optional note, and inline check-in / check-out / absent actions.
 * Status and sex filter live in the toolbar (with the table, not above it), so a
 * 30-child class is searchable instead of a wall of cards.
 */
function TeacherAttendanceTable({
  records,
  summary,
  onCheckIn,
  onCheckOut,
  onMarkAbsent,
  checkInPending,
  checkOutPending,
  markAbsentPending,
  t,
}: {
  records: AttendanceRecordSummary[];
  summary: AttendanceSummary | null;
  onCheckIn: (childId: string) => void;
  onCheckOut: (childId: string) => void;
  onMarkAbsent: (values: {
    childId: string;
    reason: string;
    note?: string;
  }) => Promise<unknown>;
  checkInPending: boolean;
  checkOutPending: boolean;
  markAbsentPending: boolean;
  t: TFunction<"attendance">;
}) {
  const { t: tApp } = useLayoutTranslation("app");
  const [absenceDraft, setAbsenceDraft] = useState<AbsenceDraft | null>(null);

  function openAbsence(record: AttendanceRecordSummary) {
    setAbsenceDraft({
      childId: record.child.id,
      name: record.child.name,
      reason: absenceReasonForForm(record.absenceReason, t),
      note: record.parentVisibleNote ?? "",
    });
  }

  async function submitAbsence() {
    if (!absenceDraft) return;
    await onMarkAbsent({
      childId: absenceDraft.childId,
      reason: absenceDraft.reason,
      note: absenceDraft.note,
    });
    setAbsenceDraft(null);
  }

  const columns: ColumnDef<AttendanceRecordSummary>[] = [
    {
      id: "index",
      header: () => (
        <span className="text-muted-foreground" aria-label={t("table.number")}>
          #
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row, table }) => {
        const position =
          table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) + 1;
        return (
          <span className="nums tabular-nums text-sm font-semibold text-muted-foreground">
            {position}
          </span>
        );
      },
    },
    {
      id: "child",
      accessorFn: (record) => record.child.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.child")} />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ChildAvatar
            name={row.original.child.name}
            photoUrl={row.original.child.photoUrl}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.original.child.name}</p>
            <p className="text-xs text-muted-foreground">
              {genderText(row.original.child.gender, t)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "gender",
      accessorFn: (record) => record.child.gender ?? "",
      filterFn: "equalsString",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.gender")} />
      ),
      cell: ({ row }) => genderText(row.original.child.gender, t),
    },
    {
      accessorKey: "status",
      filterFn: "equalsString",
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
      id: "times",
      enableSorting: false,
      header: () => <span>{t("table.times")}</span>,
      cell: ({ row }) => (
        <div className="nums flex flex-col gap-0.5 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("table.inShort")}</span>
            <span className="font-semibold">
              {row.original.checkedInAt
                ? formatTime(row.original.checkedInAt)
                : "—"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("table.outShort")}</span>
            <span className="font-semibold">
              {row.original.checkedOutAt
                ? formatTime(row.original.checkedOutAt)
                : "—"}
            </span>
          </span>
        </div>
      ),
    },
    {
      id: "pickedUp",
      enableSorting: false,
      header: () => <span>{t("table.pickedUp")}</span>,
      cell: ({ row }) => {
        const by = row.original.pickedUpBy;
        const rel = row.original.pickedUpRelationship;
        if (!by) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-foreground">{by}</span>
            {rel ? (
              <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                {tApp(`signup.relationshipOptions.${rel}`, { defaultValue: rel })}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "note",
      enableSorting: false,
      header: () => <span>{t("table.note")}</span>,
      cell: ({ row }) => {
        const note = row.original.parentVisibleNote ?? row.original.staffNote;
        const text =
          note ||
          (row.original.absenceReason
            ? translateAbsenceReason(row.original.absenceReason, t)
            : null);
        return text ? (
          <span className="text-xs text-muted-foreground">{text}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => (
        <span className="block text-right">{t("table.actions")}</span>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t("checkIn")}
            aria-label={t("checkIn")}
            className="h-8 w-8 text-mint-ink hover:bg-mint/40 hover:text-mint-ink"
            onClick={() => onCheckIn(row.original.child.id)}
            disabled={checkInPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t("checkOut")}
            aria-label={t("checkOut")}
            className="h-8 w-8 text-sky-ink hover:bg-sky/40 hover:text-sky-ink"
            onClick={() => onCheckOut(row.original.child.id)}
            disabled={checkOutPending}
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t("absent")}
            aria-label={t("absent")}
            className="h-8 w-8 text-coral-ink hover:bg-coral/40 hover:text-coral-ink"
            onClick={() => openAbsence(row.original)}
            disabled={markAbsentPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {summary && summary.total > 0 ? (
        <Card>
          <CardContent className="py-4">
            <StatusMeter
              counts={summaryToCounts(summary)}
              total={summary.total}
              t={t}
            />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={records}
        pageSize={60}
        initialColumnVisibility={{ gender: false, note: false }}
        emptyMessage={t("noMatchesTitle")}
        toolbar={(table) => {
          const statusFilter =
            (table.getColumn("status")?.getFilterValue() as string) ?? "all";
          const genderFilter =
            (table.getColumn("gender")?.getFilterValue() as string) ?? "all";
          return (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={
                      (table.getColumn("child")?.getFilterValue() as string) ?? ""
                    }
                    onChange={(event) =>
                      table
                        .getColumn("child")
                        ?.setFilterValue(event.target.value)
                    }
                    placeholder={t("search")}
                    className="h-9 w-[200px] pl-8"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    table
                      .getColumn("status")
                      ?.setFilterValue(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9 w-[160px]">
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
                <Select
                  value={genderFilter}
                  onValueChange={(value) =>
                    table
                      .getColumn("gender")
                      ?.setFilterValue(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allGenders")}</SelectItem>
                    <SelectItem value="boy">{t("gender.boy")}</SelectItem>
                    <SelectItem value="girl">{t("gender.girl")}</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      {t("gender.prefer_not_to_say")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DataTableViewOptions table={table} />
            </div>
          );
        }}
      />

      <Dialog
        open={!!absenceDraft}
        onOpenChange={(open) => {
          if (!open) setAbsenceDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("markAbsentFor", {
                name: absenceDraft?.name ?? "",
                defaultValue: t("absent"),
              })}
            </DialogTitle>
          </DialogHeader>
          {absenceDraft ? (
            <AbsenceReasonForm
              reason={absenceDraft.reason}
              note={absenceDraft.note}
              submitLabel={t("saveAbsent")}
              isPending={markAbsentPending}
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
              onSubmit={submitAbsence}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function genderText(
  gender: string | null | undefined,
  t: TFunction<"attendance">,
) {
  if (gender === "boy") return t("gender.boy");
  if (gender === "girl") return t("gender.girl");
  if (gender === "prefer_not_to_say") return t("gender.prefer_not_to_say");
  return "—";
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
