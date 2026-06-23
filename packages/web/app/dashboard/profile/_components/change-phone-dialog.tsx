"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProfileView } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

type Step = "phone" | "code";

export function ChangePhoneDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLayoutTranslation("profile");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  function reset() {
    setStep("phone");
    setPhone("");
    setCode("");
    setError(null);
    setHint(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const sendCode = useMutation({
    mutationFn: () => orpc.auth.sendCode({ phoneNumber: phone.trim() }),
    onSuccess: (result) => {
      setError(null);
      setStep("code");
      setHint(
        result.debugCode
          ? t("phoneDialog.debugCode", { code: result.debugCode })
          : t("phoneDialog.codeSent"),
      );
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const verifyAndSave = useMutation({
    mutationFn: async () => {
      const verified = await orpc.auth.verifyCode({
        phoneNumber: phone.trim(),
        code: code.trim(),
      });
      return orpc.profile.updatePhone({
        phoneNumber: verified.phoneNumber,
        phoneVerificationToken: verified.verificationToken,
      });
    },
    onSuccess: (next: ProfileView) => {
      queryClient.setQueryData(queryKeys.profile.me(), next);
      toast.success(t("phoneDialog.changed"));
      close(false);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("phoneDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("phoneDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-phone">{t("phoneDialog.newPhone")}</Label>
            <Input
              id="new-phone"
              type="tel"
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              disabled={step === "code"}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          {step === "code" ? (
            <div className="space-y-2">
              <Label htmlFor="otp-code">{t("phoneDialog.code")}</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => sendCode.mutate()}
                disabled={sendCode.isPending}
              >
                {t("phoneDialog.resend")}
              </button>
            </div>
          ) : null}

          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {t("actions.cancel")}
          </Button>
          {step === "phone" ? (
            <Button
              type="button"
              disabled={!phone.trim() || sendCode.isPending}
              onClick={() => sendCode.mutate()}
            >
              {t("phoneDialog.sendCode")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!code.trim() || verifyAndSave.isPending}
              onClick={() => verifyAndSave.mutate()}
            >
              {t("phoneDialog.verify")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
