"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IoAddCircleOutline,
  IoAirplaneOutline,
  IoEllipsisHorizontalCircleOutline,
  IoMedicalOutline,
  IoMedkitOutline,
  IoPaperPlaneOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useErrorText } from "@/lib/api/error-text";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const REASONS: Array<{ key: string; Icon: IconType }> = [
  { key: "sick", Icon: IoMedkitOutline },
  { key: "doctorVisit", Icon: IoMedicalOutline },
  { key: "familyReason", Icon: IoPeopleOutline },
  { key: "travel", Icon: IoAirplaneOutline },
  { key: "other", Icon: IoEllipsisHorizontalCircleOutline },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Report Absence — a fast, friendly way for a parent to tell the teacher their
 * child won't come. Pick the child (when there's more than one), the day (today
 * or tomorrow in a tap, or any date), and a reason as a chip; "Other" reveals a
 * free-text line. One submit sends it straight to the teacher.
 */
export function ReportAbsenceDialog({
  childrenList,
  defaultChildId,
  onReported,
}: {
  childrenList: Array<{ id: string; name: string }>;
  defaultChildId?: string;
  onReported?: (date: string) => void;
}) {
  const { t } = useLayoutTranslation("attendance");
  const errorText = useErrorText();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState(defaultChildId ?? "");
  const [date, setDate] = useState(todayIso());
  const [reasonKey, setReasonKey] = useState("sick");
  const [customReason, setCustomReason] = useState("");
  const [note, setNote] = useState("");

  const NOTE_MAX = 500;

  const effectiveChildId =
    childId || (childrenList.length === 1 ? childrenList[0]?.id : "") || "";

  const reason =
    reasonKey === "other"
      ? customReason.trim()
      : t(`absenceReasons.${reasonKey}`);

  const submit = useMutation({
    mutationFn: () =>
      orpc.attendance.parentSubmitAbsence({
        childId: effectiveChildId,
        attendanceDate: date,
        absenceReason: reason,
        parentVisibleNote: note.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success(t("absenceSubmitted"));
      setOpen(false);
      setCustomReason("");
      setReasonKey("sick");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
      onReported?.(date);
    },
  });

  const canSubmit = !!effectiveChildId && reason.length > 0 && !submit.isPending;

  const dayChips = useMemo(
    () => [
      { value: todayIso(), label: t("today") },
      { value: tomorrowIso(), label: t("tomorrow") },
    ],
    [t],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <IoAddCircleOutline className="h-4 w-4" />
          {t("reportAbsence")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("reportAbsence")}</DialogTitle>
          <DialogDescription>{t("reportAbsenceDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {childrenList.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t("whichChild")}</Label>
              <Select value={effectiveChildId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectChild")} />
                </SelectTrigger>
                <SelectContent>
                  {childrenList.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>{t("whichDay")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {dayChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setDate(chip.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                    date === chip.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {chip.label}
                </button>
              ))}
              <DatePicker value={date} onValueChange={setDate} className="w-[150px]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("pickReason")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((item) => {
                const active = reasonKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setReasonKey(item.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors",
                      active
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <item.Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="truncate">{t(`absenceReasons.${item.key}`)}</span>
                  </button>
                );
              })}
            </div>
            {reasonKey === "other" ? (
              <Textarea
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder={t("otherReasonPlaceholder")}
                rows={2}
                maxLength={300}
                autoFocus
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="absence-note">{t("noteForTeacher")}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {note.length}/{NOTE_MAX}
              </span>
            </div>
            <Textarea
              id="absence-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              rows={3}
              maxLength={NOTE_MAX}
            />
          </div>

          {submit.error ? (
            <Alert variant="destructive">
              <AlertDescription>{errorText(submit.error)}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
          >
            <IoPaperPlaneOutline className="h-4 w-4" />
            {submit.isPending ? t("loading") : t("submitAbsence")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
