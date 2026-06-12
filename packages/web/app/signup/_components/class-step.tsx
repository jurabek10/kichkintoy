"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import type { CenterClassSummary } from "@kichkintoy/shared";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

export function ClassStep() {
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [skip, setSkip] = useState(draft.classId === null);

  const { data: classes = [], isPending: loading } = useQuery({
    queryKey: queryKeys.centers.classes(draft.centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: draft.centerId! }),
    enabled: !!draft.centerId,
  });

  useEffect(() => {
    if (!draft.centerId) {
      router.replace("/signup/center");
    }
  }, [draft.centerId, router]);

  function pick(klass: CenterClassSummary) {
    setDraft((current) => ({
      ...current,
      classId: klass.id,
      className: klass.name,
    }));
    setSkip(false);
  }

  function chooseUnknown() {
    setDraft((current) => ({ ...current, classId: null, className: null }));
    setSkip(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Which class is your child in?
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick the class at <strong>{draft.centerName}</strong>. The director
          can change it later if needed.
        </p>
      </header>

      {loading ? (
        <Alert variant="info">
          <AlertDescription>Loading classes…</AlertDescription>
        </Alert>
      ) : classes.length === 0 ? (
        <Alert variant="warning">
          <AlertDescription>
            This center has no classes yet. Choose "I don't know yet" and the
            director will assign one.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-2">
          {classes.map((klass) => {
            const selected = draft.classId === klass.id && !skip;
            return (
              <button
                key={klass.id}
                type="button"
                onClick={() => pick(klass)}
                className={cn(
                  "flex w-full flex-col rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span className="text-base font-bold">{klass.name}</span>
                <span className="text-sm text-muted-foreground">
                  {[klass.ageGroup, klass.academicYear]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={chooseUnknown}
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          skip
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-primary/40",
        )}
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-sand-50">
          <HelpCircle className="h-5 w-5 text-warning" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold">I don't know yet</span>
          <span className="text-xs text-muted-foreground">
            The director will pick the class when approving.
          </span>
        </span>
      </button>

      <FormActions
        back={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.back()}
          >
            Back
          </Button>
        }
        next={
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.push("/signup/child")}
          >
            Continue
          </Button>
        }
      />
    </div>
  );
}
