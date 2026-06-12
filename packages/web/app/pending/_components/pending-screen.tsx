"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import {
  clearSession,
  logoutAndClear,
  readSession,
  useSession,
} from "@/lib/session";

export function PendingScreen() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { session, loading } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () =>
      orpc.auth.cancelJoinRequest({
        id: session?.membership.joinRequestId ?? "",
    }),
    onSuccess: () => {
      toast.success(t("pending.cancelled"));
      clearSession();
      router.replace("/login");
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const working = cancelMutation.isPending || signingOut;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.membership.status === "active") {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <AuthShell>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const requestId = session.membership.joinRequestId;
  const centerName = session.membership.centerName ?? "your kindergarten";

  function cancel() {
    if (!requestId) return;
    setError(null);
    cancelMutation.mutate();
  }

  async function signOut() {
    setSigningOut(true);
    const stored = readSession();
    await logoutAndClear(stored?.token ?? null);
    router.replace("/login");
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-warning/10">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <CardTitle>{t("pending.title")}</CardTitle>
          <CardDescription>
            {t("pending.description", { center: centerName })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pending.name")}
            </dt>
            <dd className="font-bold">{session.user.fullName}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pending.role")}
            </dt>
            <dd className="font-bold capitalize">{session.user.role}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pending.kindergarten")}
            </dt>
            <dd className="font-bold">{centerName}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("pending.submitted")}
            </dt>
            <dd className="font-bold">{formatDate(new Date())}</dd>
          </dl>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            {requestId ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={cancel}
                disabled={working}
              >
                {working ? t("pending.cancelling") : t("pending.cancelRequest")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={signOut}
              disabled={working}
            >
              {t("actions.signOut")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
