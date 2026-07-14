"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function RunNowDialog({ jobName }: { jobName: string }) {
  const { t } = useLayoutTranslation("admin");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [runDate, setRunDate] = useState("");

  useEffect(() => {
    if (!open) return;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    setRunDate(today);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => orpc.admin.crons.runNow({ jobName, runDate }),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.crons.all(),
      });
      if (run.status === "failed") {
        toast.error(t("crons.runNow.failedToast"));
      } else {
        toast.success(t("crons.runNow.successToast", { count: run.sentCount }));
      }
      setOpen(false);
    },
    onError: () => toast.error(t("crons.runNow.errorToast")),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !mutation.isPending && setOpen(next)}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0 gap-2">
          <Play className="h-3.5 w-3.5" />
          {t("crons.runNow.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TimerReset className="h-5 w-5 text-primary" />
            {t("crons.runNow.title")}
          </DialogTitle>
          <DialogDescription>{t("crons.runNow.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="rounded-xl border bg-muted/35 p-3">
            <p className="text-sm font-semibold">
              {t(`crons.jobNames.${jobName}`)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {jobName}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`cron-date-${jobName}`}>
              {t("crons.runNow.date")}
            </Label>
            <Input
              id={`cron-date-${jobName}`}
              type="date"
              value={runDate}
              onChange={(event) => setRunDate(event.target.value)}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {t("crons.runNow.dedupeHint")}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            {t("crons.runNow.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!runDate || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {mutation.isPending
              ? t("crons.runNow.running")
              : t("crons.runNow.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
