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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import {
  AbsenceReasonForm,
  absenceReasonOptions,
} from "./absence-reason-form";
import { AttendanceCard } from "./attendance-card";

export function ParentAttendance() {
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState("all");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [absenceDate, setAbsenceDate] = useState(todayIso());
  const [absenceReason, setAbsenceReason] = useState<string>(
    absenceReasonOptions[0],
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
            <CardTitle className="text-xl">Attendance</CardTitle>
            <CardDescription>
              Check your child's daily arrival and departure record.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All children</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-[155px]"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-[155px]"
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report absence</CardTitle>
          <CardDescription>
            Send a quick absence reason to the teacher.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select child</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={absenceDate}
              onChange={(event) => setAbsenceDate(event.target.value)}
              className="w-[155px]"
            />
          </div>
          <AbsenceReasonForm
            reason={absenceReason}
            note={absenceNote}
            notePlaceholder="Optional note for teacher"
            submitLabel="Submit absence"
            isPending={submitAbsence.isPending || !selectedChildId}
            onReasonChange={setAbsenceReason}
            onNoteChange={setAbsenceNote}
            onSubmit={() => submitAbsence.mutate()}
          />
          {!selectedChildId ? (
            <p className="text-xs text-muted-foreground">
              Choose a child before submitting.
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
        <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>
      ) : records.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No attendance records</p>
          <p className="text-sm text-muted-foreground">
            Check-in and check-out records will appear here.
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
