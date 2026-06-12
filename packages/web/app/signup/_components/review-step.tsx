"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { persistSession, routeForMembership } from "@/lib/session";
import { useSignup } from "../SignupContext";

export function ReviewStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, reset } = useSignup();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft.role !== "teacher") router.replace("/signup/role");
  }, [draft.role, router]);

  const registerMutation = useMutation({
    mutationFn: () =>
      orpc.auth.register({
        fullName: draft.fullName,
        phoneNumber: draft.phoneNumber,
        phoneVerificationToken: draft.phoneVerificationToken,
        username: draft.username,
        password: draft.password,
        role: "teacher",
        ...(draft.invitationId
          ? { invitationId: draft.invitationId }
          : draft.centerId
            ? { centerSelection: { centerId: draft.centerId } }
            : {}),
      }),
    onSuccess: (response) => {
      persistSession(response);
      reset();
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const submitting = registerMutation.isPending;

  function submit() {
    setError(null);
    registerMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.reviewTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.reviewDescription")}
        </p>
      </header>

      <dl className="grid gap-4 rounded-2xl border bg-muted/40 p-5 sm:grid-cols-2">
        <Detail label={t("signup.name")} value={draft.fullName} />
        <Detail label={t("signup.phone")} value={draft.phoneNumber} />
        <Detail label={t("signup.username")} value={draft.username} />
        <Detail
          label={t("signup.steps.role")}
          value={t("signup.roleTeacher")}
        />
        <Detail
          label={t("signup.steps.kindergarten")}
          value={draft.centerName ?? draft.invitationLabel ?? "—"}
        />
        <Detail
          label={t("signup.status")}
          value={
            draft.invitationId
              ? t("signup.activeInvited")
              : t("signup.pendingApproval")
          }
        />
      </dl>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FormActions
        back={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.back()}
          >
            {t("actions.back")}
          </Button>
        }
        next={
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={submitting}
          >
            {submitting
              ? t("signup.creating")
              : t("signup.completeRegistration")}
          </Button>
        }
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}
