"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ApiError, apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  clearSession,
  logoutAndClear,
  readSession,
  useSession,
} from "@/lib/session";

export default function PendingPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

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
            Loading…
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const requestId = session.membership.joinRequestId;
  const centerName = session.membership.centerName ?? "your kindergarten";

  async function cancel() {
    if (!requestId) return;
    setWorking(true);
    setError(null);
    try {
      await apiRequest(`/auth/me/join-requests/${requestId}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success("Request cancelled.");
      clearSession();
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not cancel the request.",
      );
      setWorking(false);
    }
  }

  async function signOut() {
    setWorking(true);
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
          <CardTitle>Awaiting director approval</CardTitle>
          <CardDescription>
            Your request to join <strong>{centerName}</strong> was sent. We will
            notify you here and by SMS as soon as it is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </dt>
            <dd className="font-bold">{session.user.fullName}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </dt>
            <dd className="font-bold capitalize">{session.user.role}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kindergarten
            </dt>
            <dd className="font-bold">{centerName}</dd>

            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted
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
                {working ? "Cancelling…" : "Cancel request"}
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
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
