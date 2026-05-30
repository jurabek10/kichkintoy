"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  SendCodeResponse,
  VerifyCodeResponse,
} from "@kichkintoy/shared";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { useSignup } from "./SignupContext";

type CodeStatus = "idle" | "sending" | "sent" | "verifying" | "verified";

export default function PhoneStep() {
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<CodeStatus>(
    draft.phoneVerificationToken ? "verified" : "idle",
  );

  const sendCodeMutation = useMutation({
    mutationFn: () =>
      apiRequest<SendCodeResponse>("/auth/send-code", {
        method: "POST",
        body: { phoneNumber: draft.phoneNumber },
      }),
    onSuccess: (response) => {
      setStatus("sent");
      toast.success(
        response.debugCode
          ? `Demo code: ${response.debugCode}`
          : "Verification code sent. Check your SMS.",
      );
    },
    onError: (error) => {
      setStatus("idle");
      setErrors({
        phoneNumber:
          error instanceof ApiError ? error.message : "Could not send code.",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest<VerifyCodeResponse>("/auth/verify-code", {
        method: "POST",
        body: { phoneNumber: draft.phoneNumber, code: draft.verificationCode },
      }),
    onSuccess: (response) => {
      setDraft((current) => ({
        ...current,
        phoneVerificationToken: response.verificationToken,
      }));
      setStatus("verified");
      router.push("/signup/credentials");
    },
    onError: (error) => {
      setStatus("sent");
      setErrors({
        verificationCode:
          error instanceof ApiError
            ? error.message
            : "Verification code is incorrect.",
      });
    },
  });

  function sendCode() {
    setErrors({});
    if (!draft.phoneNumber.trim()) {
      setErrors({ phoneNumber: "Phone number is required." });
      return;
    }
    setStatus("sending");
    sendCodeMutation.mutate();
  }

  function verifyAndContinue() {
    setErrors({});
    const next: Record<string, string> = {};
    if (!draft.fullName.trim()) next.fullName = "Full name is required.";
    if (!draft.phoneNumber.trim())
      next.phoneNumber = "Phone number is required.";
    if (!draft.verificationCode.trim())
      next.verificationCode = "Verification code is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("verifying");
    verifyMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          We will send a one-time code to your phone.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-fullName">Full name</Label>
        <Input
          id="signup-fullName"
          autoComplete="name"
          value={draft.fullName}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              fullName: event.target.value,
            }))
          }
          placeholder="Aziz Karimov"
        />
        <FieldError message={errors.fullName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-phone">Phone number</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="signup-phone"
            type="tel"
            autoComplete="tel"
            value={draft.phoneNumber}
            placeholder="+998 90 123 45 67"
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                phoneNumber: event.target.value,
                phoneVerificationToken: "",
              }));
              setStatus("idle");
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={sendCode}
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send code"}
          </Button>
        </div>
        <FieldError message={errors.phoneNumber} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-code">Verification code</Label>
        <Input
          id="signup-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={draft.verificationCode}
          placeholder="6-digit code"
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              verificationCode: event.target.value,
              phoneVerificationToken: "",
            }));
            if (status === "verified") setStatus("sent");
          }}
        />
        {errors.verificationCode ? (
          <FieldError message={errors.verificationCode} />
        ) : (
          <FieldHelper>Enter the code we sent by SMS.</FieldHelper>
        )}
      </div>

      <FormActions
        back={
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        }
        next={
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={verifyAndContinue}
            disabled={status === "verifying"}
          >
            {status === "verifying" ? "Verifying…" : "Continue"}
          </Button>
        }
      />
    </div>
  );
}
