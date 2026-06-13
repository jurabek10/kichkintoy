"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type {
  CenterClassSummary,
  InvitationKind,
  InvitationStatus,
} from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
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
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDateTime } from "@/lib/format";
import {
  invitationKindLabelKey,
  invitationStatusLabelKey,
} from "./invitation-labels";

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

export function InvitationsScreen({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("invitations");
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const [kind, setKind] = useState<InvitationKind>("parent");
  const [phone, setPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [childNameHint, setChildNameHint] = useState("");

  const invitationsKey = queryKeys.director.invitations(centerId ?? "");

  const {
    data: rows = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: invitationsKey,
    queryFn: () => orpc.director.invitations({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      orpc.director.createInvitation({
        centerId: centerId!,
        kind,
        phone: phone.trim(),
        classId: classId || undefined,
        childNameHint:
          kind === "parent" && childNameHint.trim()
            ? childNameHint.trim()
            : undefined,
      }),
    onSuccess: async () => {
      toast.success(t("toast.sent", { phone: phone.trim() }));
      setPhone("");
      setChildNameHint("");
      setClassId("");
      await queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const resendMutation = useMutation({
    mutationFn: (row: InvitationRow) =>
      orpc.director.resendInvitation({
        centerId: centerId!,
        invitationId: row.id,
      }),
    onSuccess: async (_data, row) => {
      toast.success(t("toast.resent", { phone: row.phone }));
      await queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const revokeMutation = useMutation({
    mutationFn: (row: InvitationRow) =>
      orpc.director.revokeInvitation({
        centerId: centerId!,
        invitationId: row.id,
      }),
    onSuccess: async (_data, row) => {
      toast(t("toast.revoked", { phone: row.phone }));
      await queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const submitting = sendMutation.isPending;
  const error = formError ?? (loadError ? toApiError(loadError).message : null);
  const rowBusy = (id: string) =>
    (resendMutation.isPending && resendMutation.variables?.id === id) ||
    (revokeMutation.isPending && revokeMutation.variables?.id === id);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId) return;
    setFormError(null);
    if (!phone.trim()) {
      setFormError(t("validation.phoneRequired"));
      return;
    }
    if (kind === "parent" && !classId) {
      setFormError(t("validation.classRequired"));
      return;
    }
    sendMutation.mutate();
  }

  function resend(row: InvitationRow) {
    if (!centerId) return;
    resendMutation.mutate(row);
  }

  function revoke(row: InvitationRow) {
    if (!centerId) return;
    revokeMutation.mutate(row);
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("composer.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-kind">{t("composer.kind")}</Label>
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
                    <SelectItem value="parent">{t("kind.parent")}</SelectItem>
                    <SelectItem value="teacher">{t("kind.teacher")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-phone">{t("composer.phone")}</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("composer.phonePlaceholder")}
                />
              </div>
            </div>

            {kind === "parent" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-class">{t("composer.class")}</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="invite-class">
                      <SelectValue placeholder={t("composer.pickClass")} />
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
                  <Label htmlFor="invite-hint">{t("composer.childHint")}</Label>
                  <Input
                    id="invite-hint"
                    value={childNameHint}
                    onChange={(event) => setChildNameHint(event.target.value)}
                    placeholder={t("composer.childHintPlaceholder")}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-class-teacher">
                    {t("composer.classOptional")}
                  </Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="invite-class-teacher">
                      <SelectValue placeholder={t("composer.noClass")} />
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
                {submitting
                  ? t("actions.sending")
                  : t("actions.sendInvitation")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-24 px-4 py-3 font-semibold">
                    {t("table.type")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("table.phone")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("table.class")}
                  </th>
                  <th className="w-28 px-4 py-3 font-semibold">
                    {t("table.status")}
                  </th>
                  <th className="w-40 px-4 py-3 font-semibold">
                    {t("table.created")}
                  </th>
                  <th className="w-40 px-4 py-3 text-right font-semibold">
                    {t("table.actions")}
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
                          {t(invitationKindLabelKey(row.kind))}
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
                          {t(invitationStatusLabelKey(row.status))}
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
                              disabled={rowBusy(row.id)}
                            >
                              {t("actions.resend")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revoke(row)}
                              disabled={rowBusy(row.id)}
                            >
                              {t("actions.revoke")}
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
