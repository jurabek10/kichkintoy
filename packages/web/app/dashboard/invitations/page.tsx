"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type {
  CenterClassSummary,
  InvitationKind,
  InvitationStatus,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/api";
import { formatDateTime, invitationKindLabel } from "@/lib/format";
import { useSession } from "@/lib/session";

type InvitationRow = {
  id: string;
  kind: InvitationKind;
  phone: string;
  childNameHint: string | null;
  class: { id: string; name: string } | null;
  expiresAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: InvitationStatus;
  invitedBy: { id: string; fullName: string };
  acceptedBy: { id: string; fullName: string } | null;
};

const statusVariant: Record<
  InvitationStatus,
  "default" | "success" | "secondary" | "destructive" | "warning"
> = {
  pending: "warning",
  accepted: "success",
  declined: "secondary",
  revoked: "secondary",
  expired: "destructive",
};

export default function InvitationsPage() {
  const { session } = useSession();
  const centerId = session?.membership.centerId ?? null;
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [classes, setClasses] = useState<CenterClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [kind, setKind] = useState<InvitationKind>("parent");
  const [phone, setPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [childNameHint, setChildNameHint] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<InvitationRow[]>(
        `/director/centers/${centerId}/invitations`,
        { auth: true },
      );
      setRows(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load invitations.",
      );
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!centerId) return;
    apiRequest<CenterClassSummary[]>(`/centers/${centerId}/classes`)
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [centerId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId) return;
    setError(null);
    if (!phone.trim()) return setError("Phone number is required.");
    if (kind === "parent" && !classId)
      return setError("Pick a class for parent invitations.");

    setSubmitting(true);
    try {
      await apiRequest(`/director/centers/${centerId}/invitations`, {
        method: "POST",
        auth: true,
        body: {
          kind,
          phone: phone.trim(),
          classId: classId || undefined,
          childNameHint:
            kind === "parent" && childNameHint.trim()
              ? childNameHint.trim()
              : undefined,
        },
      });
      toast.success(`Invitation SMS sent to ${phone.trim()}.`);
      setPhone("");
      setChildNameHint("");
      setClassId("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(row: InvitationRow) {
    if (!centerId) return;
    setBusyId(row.id);
    try {
      await apiRequest(
        `/director/centers/${centerId}/invitations/${row.id}/resend`,
        { method: "POST", auth: true },
      );
      toast.success(`Resent invitation to ${row.phone}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend.");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(row: InvitationRow) {
    if (!centerId) return;
    setBusyId(row.id);
    try {
      await apiRequest(
        `/director/centers/${centerId}/invitations/${row.id}`,
        { method: "DELETE", auth: true },
      );
      toast(`Revoked invitation to ${row.phone}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not revoke.");
    } finally {
      setBusyId(null);
    }
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invitations</CardTitle>
          <CardDescription>
            Invite a parent or teacher by phone number. They will get an SMS
            link to sign up.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send a new invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-kind">Invitation type</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    setKind(value as InvitationKind);
                    setClassId("");
                  }}
                >
                  <SelectTrigger id="invite-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-phone">Phone number</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            {kind === "parent" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-class">Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="invite-class">
                      <SelectValue placeholder="Pick a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((klass) => (
                        <SelectItem key={klass.id} value={klass.id}>
                          {klass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-hint">
                    Child name hint (optional)
                  </Label>
                  <Input
                    id="invite-hint"
                    value={childNameHint}
                    onChange={(event) => setChildNameHint(event.target.value)}
                    placeholder="Aziza"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-class-teacher">
                    Class (optional)
                  </Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="invite-class-teacher">
                      <SelectValue placeholder="No class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((klass) => (
                        <SelectItem key={klass.id} value={klass.id}>
                          {klass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div>
              <Button type="submit" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No invitations yet. Send one above.
            </p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-24 px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="w-28 px-4 py-3 font-semibold">Status</th>
                  <th className="w-40 px-4 py-3 font-semibold">Created</th>
                  <th className="w-40 px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen =
                    row.status === "pending" &&
                    !row.acceptedAt &&
                    !row.revokedAt;
                  return (
                    <tr key={row.id} className="border-t hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Badge variant="default">
                          {invitationKindLabel(row.kind)}
                        </Badge>
                      </td>
                      <td className="truncate px-4 py-3 font-semibold">
                        {row.phone}
                      </td>
                      <td className="truncate px-4 py-3 text-muted-foreground">
                        {row.class?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[row.status]}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isOpen ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => resend(row)}
                              disabled={busyId === row.id}
                            >
                              Resend
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revoke(row)}
                              disabled={busyId === row.id}
                            >
                              Revoke
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
