"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { KidsLoader } from "@/components/kids-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { AbsenceReasonForm, defaultAbsenceReason } from "./absence-reason-form";
import { AttendanceCard } from "./attendance-card";

export function ParentAttendance() {
  const { t } = useLayoutTranslation("attendance");
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState("all");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [absenceDate, setAbsenceDate] = useState(todayIso());
  const [absenceReason, setAbsenceReason] = useState(() =>
    defaultAbsenceReason(t),
  );
  const [absenceNote, setAbsenceNote] = useState("");
  const input = {
    childId: childId === "all" ? undefined : childId,
    from,
    to,
  };

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children(),
  });

  const { data: records = [], isPending, error } = useQuery({
    queryKey: queryKeys.attendance.parentList(input),
    queryFn: () => orpc.attendance.parentList(input),
  });

  const children = useMemo(
    () => childrenQuery.data?.children ?? [],
    [childrenQuery.data],
  );
  const selectedChildId =
    childId === "all" ? (children.length === 1 ? children[0].id : "") : childId;

  useEffect(() => {
    if (childId === "all" && children.length === 1) {
      setChildId(children[0].id);
    }
  }, [childId, children]);

  const submitAbsence = useMutation({
    mutationFn: () =>
      orpc.attendance.parentSubmitAbsence({
        childId: selectedChildId,
        attendanceDate: absenceDate,
        absenceReason,
        parentVisibleNote: absenceNote,
      }),
    onSuccess: async () => {
      setFrom(absenceDate);
      setTo(absenceDate);
      setAbsenceNote("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.all(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("parentDescription")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allChildren")}</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={from}
              onValueChange={setFrom}
              className="w-[155px]"
            />
            <DatePicker
              value={to}
              onValueChange={setTo}
              className="w-[155px]"
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reportAbsence")}</CardTitle>
          <CardDescription>{t("reportAbsenceDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("selectChild")}</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={absenceDate}
              onValueChange={setAbsenceDate}
              className="w-[155px]"
            />
          </div>
          <AbsenceReasonForm
            reason={absenceReason}
            note={absenceNote}
            notePlaceholder={t("noteForTeacher")}
            submitLabel={t("submitAbsence")}
            isPending={submitAbsence.isPending || !selectedChildId}
            onReasonChange={setAbsenceReason}
            onNoteChange={setAbsenceNote}
            onSubmit={() => submitAbsence.mutate()}
          />
          {!selectedChildId ? (
            <p className="text-xs text-muted-foreground">
              {t("chooseChildFirst")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}
      {submitAbsence.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {toApiError(submitAbsence.error).message}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </Card>
      ) : records.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("parentEmptyTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("parentEmptyDescription")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <AttendanceCard key={record.id ?? record.child.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
