"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type ConfirmSummaryRow = { label: string; value: string };

/**
 * A small confirm step shared by the parent flows — submitting a request and
 * cancelling one. It mirrors the mobile ConfirmModal: a title, a plain-language
 * consequence, an optional read-back of what's being confirmed, and two
 * buttons. `tone` swaps the primary action to destructive for cancellations.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  summary,
  confirmLabel,
  cancelLabel,
  tone = "default",
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  summary?: ConfirmSummaryRow[];
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (loading ? null : onOpenChange(next))}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        {summary && summary.length > 0 ? (
          <dl className="grid gap-2 rounded-xl bg-muted/50 p-3 text-sm">
            {summary.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium">
                  {row.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
