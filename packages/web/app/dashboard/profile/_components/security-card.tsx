"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { ProfileView } from "@kichkintoy/shared";
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

export function SecurityCard({ profile }: { profile: ProfileView }) {
  const { t } = useLayoutTranslation("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      orpc.profile.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("toasts.passwordChanged"));
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("security.mismatch"));
      return;
    }
    mutation.mutate();
  }

  // Telegram-born accounts have no password; show how they sign in instead of a dead form.
  if (!profile.hasPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("security.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#229ED9]/10 text-[#229ED9]">
              <Send className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                {t("security.telegramOnlyTitle")}
                {profile.telegramUsername ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    @{profile.telegramUsername}
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("security.telegramOnly")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("security.title")}</CardTitle>
        <CardDescription>{t("security.subtitle")}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t("security.currentPassword")}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("security.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("security.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("security.requirement")}
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {t("actions.changePassword")}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
