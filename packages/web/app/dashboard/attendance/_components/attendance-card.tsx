"use client";

import type { ReactNode } from "react";
import type { AttendanceRecordSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { attendanceStatusLabel } from "@/lib/format";
import { translateAbsenceReason } from "./absence-reason-form";

export function AttendanceCard({
  record,
  actions,
}: {
  record: AttendanceRecordSummary;
  actions?: ReactNode;
}) {
  const { t } = useLayoutTranslation("attendance");

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{record.child.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {record.className ?? t("noClass")} · {record.attendanceDate}
            </p>
          </div>
          <Badge variant={badgeVariant(record.status)}>
            {t(`status.${record.status}`, attendanceStatusLabel(record.status))}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <TimeBlock label={t("checkInLabel")} value={record.checkedInAt} />
          <TimeBlock label={t("checkOutLabel")} value={record.checkedOutAt} />
        </div>
        {record.absenceReason ? (
          <p className="text-muted-foreground">
            {translateAbsenceReason(record.absenceReason, t)}
          </p>
        ) : null}
        {record.parentVisibleNote ? (
          <p className="text-muted-foreground">{record.parentVisibleNote}</p>
        ) : null}
        {record.staffNote ? (
          <p className="text-xs text-muted-foreground">{record.staffNote}</p>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

function TimeBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="font-bold">{value ? formatTime(value) : "-"}</p>
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeVariant(status: string) {
  if (status === "present" || status === "picked_up") return "success";
  if (status === "late" || status === "left_early") return "warning";
  if (status === "absent" || status === "excused") return "destructive";
  return "secondary";
}
