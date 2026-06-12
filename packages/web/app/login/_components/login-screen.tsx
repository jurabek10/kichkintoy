"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth-shell";
import { FieldError } from "@/components/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { persistSession, routeForMembership } from "@/lib/session";

export function LoginScreen() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    form?: string;
  }>({});
  const loginMutation = useMutation({
    mutationFn: () => orpc.auth.login({ username, password }),
    onSuccess: (response) => {
      persistSession(response);
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    },
    onError: (error) => setErrors({ form: toApiError(error).message }),
  });

  const submitting = loginMutation.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: typeof errors = {};
    if (!username.trim()) next.username = t("login.usernameRequired");
    if (!password) next.password = t("login.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    loginMutation.mutate();
  }

  return (
    <AuthShell
      footer={
        <>
          {t("login.footerText")}{" "}
          <Link href="/signup" className="font-semibold text-primary">
            {t("login.createAccount")}
          </Link>
        </>
      }
    >
      <Card className="border bg-white shadow-pop">
        <CardHeader>
          <p className="text-xs font-extrabold uppercase text-primary">
            {t("login.eyebrow")}
          </p>
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.form ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-username">{t("login.username")}</Label>
              <Input
                id="login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("login.usernamePlaceholder")}
                aria-invalid={errors.username ? "true" : undefined}
              />
              <FieldError message={errors.username} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">{t("login.password")}</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                aria-invalid={errors.password ? "true" : undefined}
              />
              <FieldError message={errors.password} />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>

          <div id="center" className="mt-6 rounded-xl bg-accent p-4 text-sm">
            <p className="font-bold text-accent-foreground">
              {t("login.centerHelpTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("login.centerHelpText")}
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
