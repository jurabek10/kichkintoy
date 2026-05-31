"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AuthResponse, RelationshipType } from "@kichkintoy/shared";
import { FieldError } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { persistSession, routeForMembership } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

const options: Array<{ value: RelationshipType; label: string }> = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

export default function RelationshipStep() {
  const router = useRouter();
  const { draft, setDraft, reset } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});
  function pick(value: RelationshipType) {
    setDraft((current) => ({ ...current, relationshipType: value }));
    setErrors({});
  }

  const registerMutation = useMutation({
    mutationFn: () => {
      const childPayload = {
        name: draft.childName,
        image: draft.childImageUrl?.startsWith("http")
          ? draft.childImageUrl
          : undefined,
        dateOfBirth: draft.childDateOfBirth,
        gender: draft.childGender as Exclude<typeof draft.childGender, "">,
        relationshipType: draft.relationshipType as Exclude<
          typeof draft.relationshipType,
          ""
        >,
        customRelationshipLabel:
          draft.relationshipType === "other"
            ? draft.customRelationshipLabel.trim() || undefined
            : undefined,
      };

      const body = draft.invitationId
        ? {
            fullName: draft.fullName,
            phoneNumber: draft.phoneNumber,
            phoneVerificationToken: draft.phoneVerificationToken,
            username: draft.username,
            password: draft.password,
            role: "parent" as const,
            invitationId: draft.invitationId,
            child: childPayload,
          }
        : {
            fullName: draft.fullName,
            phoneNumber: draft.phoneNumber,
            phoneVerificationToken: draft.phoneVerificationToken,
            username: draft.username,
            password: draft.password,
            role: "parent" as const,
            centerSelection: {
              centerId: draft.centerId!,
              classId: draft.classId ?? undefined,
            },
            child: childPayload,
          };

      return orpc.auth.register(body);
    },
    onSuccess: (response) => {
      persistSession(response);
      reset();
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    },
    onError: (error) => setErrors({ form: toApiError(error).message }),
  });

  const submitting = registerMutation.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.relationshipType)
      return setErrors({ relationshipType: "Choose your relationship." });
    registerMutation.mutate();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          You are the child's…
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick the relationship you'd like teachers to see.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = draft.relationshipType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {draft.relationshipType === "other" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-custom-rel">Custom label (optional)</Label>
          <Input
            id="signup-custom-rel"
            value={draft.customRelationshipLabel}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                customRelationshipLabel: event.target.value,
              }))
            }
            placeholder="e.g. Family friend"
          />
        </div>
      ) : null}

      <FieldError message={errors.relationshipType} />

      {errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
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
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Complete registration"}
          </Button>
        }
      />
    </form>
  );
}
