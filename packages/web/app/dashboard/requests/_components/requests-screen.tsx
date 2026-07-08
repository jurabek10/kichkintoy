"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
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
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import { ChildAvatar } from "@/components/child-avatar";
import { KidsLoader } from "@/components/kids-loader";
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
import { useErrorText } from "@/lib/api/error-text";
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

export function RequestsScreen({
  centerId,
  canApprove,
}: {
  centerId: string | null;
  /** Directors and approver-teachers can act; everyone else is read-only. */
  canApprove: boolean;
}) {
  const { t } = useLayoutTranslation("requests");
  const errorText = useErrorText();
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
    onError: (err) => setActionError(errorText(err)),
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
    onError: (err) => setActionError(errorText(err)),
  });

  const acting = approveMutation.isPending || rejectMutation.isPending;
  const error =
    actionError ?? (loadError ? errorText(loadError) : null);

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

  function openReview(row: JoinRequestRow) {
    setSelected(row);
    setPickedClassId("");
    setRejectReason("");
    setActionError(null);
  }

  const columns = useMemo<ColumnDef<JoinRequestRow>[]>(
    () => [
      {
        id: "type",
        accessorFn: (row) => row.kind,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.type")} />
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>
            {t(joinRequestKindLabelKey(row.original.kind))}
          </Badge>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => row.requester.fullName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.name")} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.requester.fullName}</span>
        ),
      },
      {
        id: "child",
        accessorFn: (row) => row.child?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) =>
          row.original.child?.name ? (
            <span className="flex items-center gap-2">
              <ChildAvatar
                name={row.original.child.name}
                photoUrl={row.original.child.photoUrl}
              />
              {row.original.child.name}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "class",
        accessorFn: (row) => row.child?.requestedClass?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.class")} />
        ),
        cell: ({ row }) =>
          row.original.child?.requestedClass?.name ? (
            <Badge variant="secondary">
              {row.original.child.requestedClass.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "phone",
        accessorFn: (row) => row.requester.phoneNumber ?? "",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.phone")} />
        ),
        cell: ({ row }) =>
          row.original.requester.phoneNumber ? (
            <a
              href={`tel:${row.original.requester.phoneNumber}`}
              dir="ltr"
              className="nums text-muted-foreground hover:text-primary hover:underline"
            >
              {row.original.requester.phoneNumber}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "submitted",
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.submitted")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <span className="block text-right">{t("table.actions")}</span>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openReview(row.original)}
            >
              {canApprove ? t("actions.review") : t("actions.view")}
            </Button>
          </div>
        ),
      },
    ],
    [t, canApprove],
  );

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

      {!canApprove ? (
        <Alert>
          <AlertDescription>{t("readOnly.banner")}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <KidsLoader label={t("loading")} size="sm" className="p-6" />
          ) : (
            <DataTable
              columns={columns}
              data={requests}
              emptyMessage={t("empty", { filter: t(`filters.${filter}`) })}
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={
                        (table.getColumn("name")?.getFilterValue() as string) ??
                        ""
                      }
                      onChange={(event) =>
                        table
                          .getColumn("name")
                          ?.setFilterValue(event.target.value)
                      }
                      placeholder={t("table.searchName")}
                      className="h-9 pl-9 sm:w-[240px]"
                    />
                  </div>
                  <DataTableViewOptions table={table} />
                </div>
              )}
            />
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
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <ChildAvatar
                    name={selected.child.name}
                    photoUrl={selected.child.photoUrl}
                    className="h-11 w-11 text-sm"
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("detail.childName")}
                    </p>
                    <p className="font-bold">{selected.child.name}</p>
                  </div>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
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
              </div>
            ) : null}

            {selected.message ? (
              <Alert>
                <AlertDescription>{selected.message}</AlertDescription>
              </Alert>
            ) : null}

            {canApprove &&
            selected.status === "pending" &&
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

            {canApprove && selected.status === "pending" ? (
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

            {canApprove && selected.status === "pending" ? (
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
            ) : selected.status === "pending" ? (
              // Read-only viewer looking at a pending request.
              <Alert>
                <AlertDescription>{t("readOnly.pending")}</AlertDescription>
              </Alert>
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
