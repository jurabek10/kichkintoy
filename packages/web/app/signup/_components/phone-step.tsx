"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { useSignup } from "../SignupContext";

type CodeStatus = "idle" | "sending" | "sent" | "verifying" | "verified";

export function PhoneStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<CodeStatus>(
    draft.phoneVerificationToken ? "verified" : "idle",
  );

  const sendCodeMutation = useMutation({
    mutationFn: () => orpc.auth.sendCode({ phoneNumber: draft.phoneNumber }),
    onSuccess: (response) => {
      setStatus("sent");
      toast.success(
        response.debugCode
          ? t("signup.demoCode", { code: response.debugCode })
          : t("signup.codeSent"),
      );
    },
    onError: (error) => {
      setStatus("idle");
      setErrors({ phoneNumber: toApiError(error).message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      orpc.auth.verifyCode({
        phoneNumber: draft.phoneNumber,
        code: draft.verificationCode,
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
      setErrors({ verificationCode: toApiError(error).message });
    },
  });

  function sendCode() {
    setErrors({});
    if (!draft.phoneNumber.trim()) {
      setErrors({ phoneNumber: t("signup.errors.phoneRequired") });
      return;
    }
    setStatus("sending");
    sendCodeMutation.mutate();
  }

  function verifyAndContinue() {
    setErrors({});
    const next: Record<string, string> = {};
    if (!draft.fullName.trim()) next.fullName = t("signup.errors.fullNameRequired");
    if (!draft.phoneNumber.trim())
      next.phoneNumber = t("signup.errors.phoneRequired");
    if (!draft.verificationCode.trim())
      next.verificationCode = t("signup.errors.codeRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("verifying");
    verifyMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.phoneTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.phoneDescription")}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-fullName">{t("signup.fullName")}</Label>
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
        <Label htmlFor="signup-phone">{t("signup.phoneNumber")}</Label>
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
            {status === "sending" ? t("signup.sending") : t("signup.sendCode")}
          </Button>
        </div>
        <FieldError message={errors.phoneNumber} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-code">{t("signup.verificationCode")}</Label>
        <Input
          id="signup-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={draft.verificationCode}
          placeholder={t("signup.codePlaceholder")}
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
          <FieldHelper>{t("signup.codeHelper")}</FieldHelper>
        )}
      </div>

      <FormActions
        back={
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link href="/login">{t("signup.backToLogin")}</Link>
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
            {status === "verifying" ? t("signup.verifying") : t("actions.continue")}
          </Button>
        }
      />
    </div>
  );
}
