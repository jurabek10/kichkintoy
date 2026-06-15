"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, ClipboardCheck, LogOut, X } from "lucide-react";
import type { AttendanceRecordSummary, AttendanceStatus } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
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
  const input = {
    centerId: centerId ?? "",
    date,
    status: status === "all" ? undefined : (status as AttendanceStatus),
    classId: classId === "all" ? undefined : classId,
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
  const directorView = role === "director";

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
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <Summary label={t("summary.total")} value={summary.total} />
            <Summary
              label={t("summary.present")}
              value={summary.present + summary.late}
            />
            <Summary
              label={t("summary.absent")}
              value={summary.absent + summary.excused}
            />
            <Summary
              label={t("summary.pickedUp")}
              value={summary.pickedUp + summary.leftEarly}
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
        <DirectorAttendanceTable records={records} t={t} />
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

function DirectorAttendanceTable({
  records,
  t,
}: {
  records: AttendanceRecordSummary[];
  t: TFunction<"attendance">;
}) {
  const columns = useMemo<ColumnDef<AttendanceRecordSummary>[]>(
    () => [
      {
        accessorKey: "className",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.class")} />
        ),
        cell: ({ row }) => row.original.className ?? t("noClass"),
        sortingFn: (left, right) =>
          compareText(left.original.className, right.original.className),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id) ?? t("noClass")),
      },
      {
        id: "childName",
        accessorFn: (record) => record.child.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => row.original.child.name,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
            {t(
              `status.${row.original.status}`,
              attendanceStatusLabel(row.original.status),
            )}
          </span>
        ),
        sortingFn: (left, right) =>
          compareText(
            attendanceStatusLabel(left.original.status),
            attendanceStatusLabel(right.original.status),
          ),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
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

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.className ?? t("noClass"))),
      )
        .sort()
        .map((value) => ({ label: value, value })),
    [records, t],
  );

  return (
    <DataTable
      columns={columns}
      data={records}
      emptyMessage={t("emptyTitle")}
      toolbar={(table) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DataTableFacetedFilter
              column={table.getColumn("className")}
              title={t("table.class")}
              options={classOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title={t("table.status")}
              options={statusOptions.map((status) => ({
                label: t(`status.${status}`, attendanceStatusLabel(status)),
                value: status,
              }))}
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      )}
    />
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
