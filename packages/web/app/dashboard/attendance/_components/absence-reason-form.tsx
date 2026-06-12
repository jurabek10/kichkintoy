"use client";

import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

export const absenceReasonOptions = [
  { value: "Sick", key: "sick" },
  { value: "Doctor visit", key: "doctorVisit" },
  { value: "Family reason", key: "familyReason" },
  { value: "Travel", key: "travel" },
] as const;

export function defaultAbsenceReason(t: TFunction<"attendance">) {
  return t("absenceReasons.sick");
}

function findAbsenceReasonOption(
  value: string,
  t: TFunction<"attendance">,
) {
  return absenceReasonOptions.find(
    (item) => item.value === value || t(`absenceReasons.${item.key}`) === value,
  );
}

export function translateAbsenceReason(
  value: string | null | undefined,
  t: TFunction<"attendance">,
) {
  if (!value) return "-";
  const option = findAbsenceReasonOption(value, t);
  return option ? t(`absenceReasons.${option.key}`) : value;
}

export function absenceReasonForForm(
  value: string | null | undefined,
  t: TFunction<"attendance">,
) {
  if (!value) return defaultAbsenceReason(t);
  const option = findAbsenceReasonOption(value, t);
  return option ? t(`absenceReasons.${option.key}`) : value;
}

function isPresetSelected(
  reason: string,
  item: (typeof absenceReasonOptions)[number],
  t: TFunction<"attendance">,
) {
  return (
    reason === item.value || reason === t(`absenceReasons.${item.key}`)
  );
}

export function AbsenceReasonForm({
  reason,
  note,
  notePlaceholder,
  submitLabel,
  isPending,
  onReasonChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: {
  reason: string;
  note: string;
  notePlaceholder?: string;
  submitLabel: string;
  isPending: boolean;
  onReasonChange: (reason: string) => void;
  onNoteChange: (note: string) => void;
  onCancel?: () => void;
  onSubmit: () => void;
}) {
  const { t } = useLayoutTranslation("attendance");
  const { t: tApp } = useLayoutTranslation("app");
  const canSubmit = reason.trim().length > 0;

  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        {absenceReasonOptions.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={isPresetSelected(reason, item, t) ? "default" : "outline"}
            onClick={() => onReasonChange(t(`absenceReasons.${item.key}`))}
          >
            {t(`absenceReasons.${item.key}`)}
          </Button>
        ))}
      </div>
      <Input
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder={t("reason")}
        maxLength={300}
      />
      <Input
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder={notePlaceholder ?? t("shortNote")}
        maxLength={500}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {tApp("actions.cancel")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
