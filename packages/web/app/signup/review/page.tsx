"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthResponse } from "@kichkintoy/shared";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { persistSession, routeForMembership } from "@/lib/session";
import { useSignup } from "../SignupContext";

export default function ReviewStep() {
  const router = useRouter();
  const { draft, reset } = useSignup();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft.role !== "teacher") router.replace("/signup/role");
  }, [draft.role, router]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
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
        },
      });
      persistSession(response);
      reset();
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Review and finish
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm your account details below.
        </p>
      </header>

      <dl className="grid gap-4 rounded-2xl border bg-muted/40 p-5 sm:grid-cols-2">
        <Detail label="Name" value={draft.fullName} />
        <Detail label="Phone" value={draft.phoneNumber} />
        <Detail label="Username" value={draft.username} />
        <Detail label="Role" value="Teacher" />
        <Detail
          label="Kindergarten"
          value={draft.centerName ?? draft.invitationLabel ?? "—"}
        />
        <Detail
          label="Status"
          value={
            draft.invitationId
              ? "Active immediately (invited)"
              : "Pending director approval"
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
            Back
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
            {submitting ? "Creating account…" : "Complete registration"}
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
