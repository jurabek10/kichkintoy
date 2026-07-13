"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth-shell";
import { FieldError } from "@/components/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { persistSession, persistTelegramSession, routeForMembership } from "@/lib/session";

export function LoginScreen() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegram, setTelegram] = useState<{ nonce: string; deepLink: string; qr: string; expired: boolean } | null>(null);
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
  const telegramStart = useMutation({ mutationFn: () => orpc.auth.telegramLoginStart({}), onSuccess: async (result) => {
    setTelegram({ nonce: result.nonce, deepLink: result.deepLink, qr: await QRCode.toDataURL(result.deepLink, { width: 208, margin: 1 }), expired: false });
  }, onError: (error) => setErrors({ form: toApiError(error).message }) });
  useEffect(() => { if (!telegram || telegram.expired) return; const interval = setInterval(async () => {
    try { const result = await orpc.auth.telegramLoginPoll({ nonce: telegram.nonce });
      if (result.status === "approved") { clearInterval(interval); await persistTelegramSession(result.token); router.replace("/dashboard"); }
      if (result.status === "expired") setTelegram((value) => value ? { ...value, expired: true } : value);
    } catch { /* retry transient failures */ }
  }, 2000); return () => clearInterval(interval); }, [telegram?.nonce, telegram?.expired, router]);

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
          <Link href="/signup" className="font-bold text-primary hover:underline">
            {t("login.createAccount")}
          </Link>
        </>
      }
    >
      <Card className="border bg-card shadow-pop">
        <CardContent className="flex flex-col gap-5 p-6 sm:p-7">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("login.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("login.description")}
            </p>
          </div>

          {errors.form ? (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          ) : null}

          {telegram ? <div className="flex flex-col items-center gap-4 text-center">
            {telegram.expired ? <><p className="font-semibold">{t("telegram.expired")}</p><Button className="w-full" onClick={() => { setTelegram(null); telegramStart.mutate(); }}>{t("telegram.tryAgain")}</Button></> : <><img src={telegram.qr} alt={t("telegram.scanQr")} className="h-52 w-52 rounded-xl" /><p className="text-sm text-muted-foreground">{t("telegram.waiting")}</p><Button asChild variant="outline" className="w-full"><a href={telegram.deepLink} target="_blank" rel="noreferrer">{t("telegram.openTelegram")}</a></Button></>}
            <Button variant="ghost" onClick={() => setTelegram(null)}>{t("actions.cancel")}</Button>
          </div> : <><form className="flex flex-col gap-4" onSubmit={submit} noValidate>
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
              className="mt-1 w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>

          <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{t("telegram.or")}</span><div className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" size="lg" className="w-full border-[#229ED9] text-[#168AC0]" disabled={telegramStart.isPending} onClick={() => telegramStart.mutate()}>{t("telegram.continue")}</Button></>}

          <p className="text-center text-xs leading-5 text-muted-foreground">
            {t("login.centerHelpText")}
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
