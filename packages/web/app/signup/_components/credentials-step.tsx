"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSignup } from "../SignupContext";

export function CredentialsStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!draft.phoneVerificationToken) router.replace("/signup");
  }, [draft.phoneVerificationToken, router]);

  function submit() {
    const next: Record<string, string> = {};
    if (draft.username.trim().length < 3)
      next.username = t("signup.errors.usernameMin");
    if (draft.password.length < 8)
      next.password = t("signup.errors.passwordMin");
    else if (!/[A-Za-z]/.test(draft.password))
      next.password = t("signup.errors.passwordLetter");
    else if (!/\d/.test(draft.password))
      next.password = t("signup.errors.passwordNumber");
    if (draft.password !== draft.confirmPassword)
      next.confirmPassword = t("signup.errors.passwordMismatch");

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    router.push("/signup/role");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.credentialsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.credentialsDescription")}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-username">{t("signup.username")}</Label>
        <Input
          id="signup-username"
          autoComplete="username"
          value={draft.username}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          placeholder="aziz_k"
        />
        {errors.username ? (
          <FieldError message={errors.username} />
        ) : (
          <FieldHelper>{t("signup.usernameHelper")}</FieldHelper>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">{t("signup.password")}</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={draft.password}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          placeholder={t("signup.passwordPlaceholder")}
        />
        <FieldError message={errors.password} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm-password">{t("signup.confirmPassword")}</Label>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          value={draft.confirmPassword}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          placeholder={t("signup.confirmPasswordPlaceholder")}
        />
        <FieldError message={errors.confirmPassword} />
      </div>

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
          >
            {t("actions.continue")}
          </Button>
        }
      />
    </div>
  );
}
