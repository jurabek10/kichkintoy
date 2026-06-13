"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CenterClassSummary } from "@kichkintoy/shared";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import {
  joinRequestKindLabelKey,
  joinRequestStatusLabelKey,
} from "./request-labels";

type JoinRequestRow = {
  id: string;
  kind: "parent" | "teacher" | "director";
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  reviewedAt: string | null;
  reviewerMessage: string | null;
  requester: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    username: string | null;
  };
  child: {
    name: string;
    dateOfBirth: string | null;
    gender: string | null;
    photoUrl: string | null;
    relationship: string | null;
    customRelationshipLabel: string | null;
    requestedClass: { id: string; name: string } | null;
  } | null;
  message: string | null;
};

type Filter = "pending" | "approved" | "rejected" | "cancelled";

const statusVariant: Record<
  Filter,
  "default" | "success" | "destructive" | "secondary"
> = {
  pending: "default",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
};

export function RequestsScreen({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("requests");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JoinRequestRow | null>(null);
  const [pickedClassId, setPickedClassId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");

  const {
    data: requests = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.director.joinRequests(centerId ?? "", filter),
    queryFn: () =>
      orpc.director.joinRequests({ centerId: centerId!, status: filter }),
    enabled: !!centerId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });

  // Invalidate every status list for this center (a request changes status).
  const invalidateRequests = () =>
    queryClient.invalidateQueries({
      queryKey: ["director", centerId ?? "", "join-requests"],
    });

  const approveMutation = useMutation({
    mutationFn: (row: JoinRequestRow) =>
      orpc.director.approveJoinRequest({
        centerId: centerId!,
        requestId: row.id,
        classId: pickedClassId || undefined,
      }),
    onSuccess: async (_data, row) => {
      toast.success(t("toast.approved", { name: row.requester.fullName }));
      setSelected(null);
      setPickedClassId("");
      await invalidateRequests();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: (row: JoinRequestRow) =>
      orpc.director.rejectJoinRequest({
        centerId: centerId!,
        requestId: row.id,
        reason: rejectReason.trim() || undefined,
      }),
    onSuccess: async (_data, row) => {
      toast(t("toast.rejected", { name: row.requester.fullName }));
      setSelected(null);
      setRejectReason("");
      await invalidateRequests();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const acting = approveMutation.isPending || rejectMutation.isPending;
  const error =
    actionError ?? (loadError ? toApiError(loadError).message : null);

  function approve(row: JoinRequestRow) {
    if (!centerId) return;
    const needsClass =
      row.kind === "parent" && !row.child?.requestedClass && !pickedClassId;
    if (needsClass) {
      setActionError(t("validation.pickClass"));
      return;
    }
    approveMutation.mutate(row);
  }

  function reject(row: JoinRequestRow) {
    if (!centerId) return;
    rejectMutation.mutate(row);
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
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "cancelled"] as const).map(
              (value) => (
                <Button
                  key={value}
                  type="button"
                  variant={filter === value ? "default" : "secondary"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setFilter(value)}
                >
                  {t(`filters.${value}`)}
                </Button>
              ),
            )}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("empty", { filter: t(`filters.${filter}`) })}
            </p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-24 px-4 py-3 font-semibold">
                    {t("table.type")}
                  </th>
                  <th className="px-4 py-3 font-semibold">{t("table.name")}</th>
                  <th className="px-4 py-3 font-semibold">
                    {t("table.contact")}
                  </th>
                  <th className="w-32 px-4 py-3 font-semibold">
                    {t("table.submitted")}
                  </th>
                  <th className="w-32 px-4 py-3 text-right font-semibold">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[row.status]}>
                        {t(joinRequestKindLabelKey(row.kind))}
                      </Badge>
                    </td>
                    <td className="truncate px-4 py-3 font-semibold">
                      {row.requester.fullName}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {row.kind === "parent" && row.child?.name
                        ? row.child.name
                        : (row.requester.phoneNumber ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelected(row);
                          setPickedClassId("");
                          setRejectReason("");
                          setActionError(null);
                        }}
                      >
                        {t("actions.review")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected ? (
          <DialogContent>
            <DialogHeader>
              <div>
                <Badge variant="default" className="mb-2">
                  {t(joinRequestKindLabelKey(selected.kind))}
                </Badge>
                <DialogTitle>{selected.requester.fullName}</DialogTitle>
                <DialogDescription>
                  {selected.requester.phoneNumber ?? t("detail.noPhone")} ·{" "}
                  {selected.requester.username ?? t("detail.noUsername")}
                </DialogDescription>
              </div>
            </DialogHeader>

            {selected.kind === "parent" && selected.child ? (
              <dl className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2">
                <Detail
                  label={t("detail.childName")}
                  value={selected.child.name}
                />
                <Detail
                  label={t("detail.dateOfBirth")}
                  value={formatDate(selected.child.dateOfBirth)}
                />
                <Detail
                  label={t("detail.gender")}
                  value={selected.child.gender ?? "—"}
                />
                <Detail
                  label={t("detail.requestedClass")}
                  value={
                    selected.child.requestedClass?.name ?? t("detail.notPicked")
                  }
                />
                <Detail
                  label={t("detail.relationship")}
                  value={
                    selected.child.relationship ??
                    selected.child.customRelationshipLabel ??
                    "—"
                  }
                />
              </dl>
            ) : null}

            {selected.message ? (
              <Alert>
                <AlertDescription>{selected.message}</AlertDescription>
              </Alert>
            ) : null}

            {selected.status === "pending" &&
            selected.kind === "parent" &&
            !selected.child?.requestedClass ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="approve-class">{t("detail.assignClass")}</Label>
                <Select value={pickedClassId} onValueChange={setPickedClassId}>
                  <SelectTrigger id="approve-class">
                    <SelectValue placeholder={t("detail.pickClass")} />
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
            ) : null}

            {selected.status === "pending" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="reject-reason">
                  {t("detail.rejectionNote")}
                </Label>
                <Textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder={t("detail.rejectionPlaceholder")}
                />
              </div>
            ) : null}

            {selected.status === "pending" ? (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reject(selected)}
                  disabled={acting}
                >
                  {acting ? t("actions.working") : t("actions.reject")}
                </Button>
                <Button
                  type="button"
                  onClick={() => approve(selected)}
                  disabled={acting}
                >
                  {acting ? t("actions.working") : t("actions.approve")}
                </Button>
              </DialogFooter>
            ) : (
              <Alert>
                <AlertDescription>
                  <span className="font-semibold capitalize">
                    {t(joinRequestStatusLabelKey(selected.status))}
                  </span>
                  {selected.reviewerMessage ? (
                    <>
                      <br />
                      {selected.reviewerMessage}
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}
