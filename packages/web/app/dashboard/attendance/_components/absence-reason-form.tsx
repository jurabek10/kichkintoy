"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const absenceReasonOptions = [
  "Sick",
  "Doctor visit",
  "Family reason",
  "Travel",
] as const;

export function AbsenceReasonForm({
  reason,
  note,
  notePlaceholder = "Short note",
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
  const canSubmit = reason.trim().length > 0;

  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        {absenceReasonOptions.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={reason === item ? "default" : "outline"}
            onClick={() => onReasonChange(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <Input
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="Reason"
        maxLength={300}
      />
      <Input
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder={notePlaceholder}
        maxLength={500}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
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
