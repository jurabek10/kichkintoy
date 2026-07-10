"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, Pencil, Search, Undo2, Wallet } from "lucide-react";
import type { AdminBillingRow, BillingStatus } from "@kichkintoy/shared";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KidsLoader } from "@/components/kids-loader";
import { toast } from "sonner";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { orpc } from "@/lib/orpc";

const statusVariant: Record<
  BillingStatus,
  "success" | "secondary" | "warning"
> = {
  paid: "success",
  due: "secondary",
  overdue: "warning",
};

export function AdminBillingScreen() {
  const { t } = useLayoutTranslation("admin");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminBillingRow | null>(null);

  const {
    data,
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.admin.billing(),
    queryFn: () => orpc.admin.billing.list({}),
  });

  const paidMutation = useMutation({
    mutationFn: (vars: { centerId: string; paid: boolean }) =>
      orpc.admin.billing.setPaid(vars),
    onSuccess: async (_data, vars) => {
      toast.success(vars.paid ? t("billing.paidToast") : t("billing.unpaidToast"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.billing(),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });
  const paidBusy = (id: string) =>
    paidMutation.isPending && paidMutation.variables?.centerId === id;

  const columns = useMemo<ColumnDef<AdminBillingRow>[]>(
    () => [
      {
        id: "number",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <span className="text-xs">{t("billing.table.number")}</span>
        ),
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          const visibleIndex = table
            .getRowModel()
            .rows.findIndex((candidate) => candidate.id === row.id);
          return (
            <span className="nums text-xs text-muted-foreground">
              {pageIndex * pageSize + visibleIndex + 1}
            </span>
          );
        },
      },
      {
        id: "center",
        accessorFn: (center) => `${center.name} ${center.centerCode}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.center")} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.original.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {row.original.centerCode}
            </p>
          </div>
        ),
      },
      {
        id: "base",
        accessorFn: (center) => center.baseFeeUzs,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.base")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">
            {formatMoney(row.original.baseFeeUzs)}
          </span>
        ),
      },
      {
        id: "perKid",
        accessorFn: (center) => center.perKidFeeUzs,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.perKid")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">
            {formatMoney(row.original.perKidFeeUzs)}
          </span>
        ),
      },
      {
        id: "kids",
        accessorFn: (center) => center.kidCount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.kids")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">{row.original.kidCount}</span>
        ),
      },
      {
        id: "day",
        accessorFn: (center) => center.billingDay,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.day")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm text-muted-foreground">
            {t("billing.table.dayValue", { day: row.original.billingDay })}
          </span>
        ),
      },
      {
        id: "total",
        accessorFn: (center) => center.total,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.total")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm font-bold">
            {formatMoney(row.original.total)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (center) => center.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("billing.table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>
            {t(`billing.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">{t("billing.edit.open")}</span>,
        cell: ({ row }) => {
          const paid = row.original.status === "paid";
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant={paid ? "ghost" : "outline"}
                className="h-8 gap-1"
                disabled={paidBusy(row.original.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  paidMutation.mutate({
                    centerId: row.original.id,
                    paid: !paid,
                  });
                }}
              >
                {paid ? (
                  <>
                    <Undo2 className="h-3.5 w-3.5" />
                    {t("billing.markUnpaid")}
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t("billing.markPaid")}
                  </>
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title={t("billing.edit.open")}
                aria-label={t("billing.edit.open")}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(row.original);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    // paidMutation identity changes per render; safe to omit — handlers read latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, paidMutation.isPending, paidMutation.variables],
  );

  const query = search.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((center) => {
    if (!query) return true;
    return `${center.name} ${center.centerCode}`.toLowerCase().includes(query);
  });

  const error = loadError ? toApiError(loadError).message : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("billing.title")}</CardTitle>
          <CardDescription>{t("billing.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label={t("billing.expected")}
              value={formatMoney(data?.grandTotal ?? 0)}
              tone="sky"
            />
            <SummaryTile
              label={t("billing.collected")}
              value={formatMoney(data?.collected ?? 0)}
              tone="mint"
            />
            <SummaryTile
              label={t("billing.outstanding")}
              value={formatMoney(data?.outstanding ?? 0)}
              tone="coral"
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              emptyMessage={t("billing.table.empty")}
              pageLabel={(page, total) =>
                t("billing.table.page", { page, total })
              }
              onRowClick={(row) => setEditing(row)}
              toolbar={() => (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("billing.table.search")}
                    className="h-9 w-[220px] pl-8"
                  />
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      <EditRatesDialog center={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "sky" | "mint" | "coral";
}) {
  const toneClass = {
    sky: "bg-sky/15 text-sky-ink",
    mint: "bg-mint/20 text-mint-ink",
    coral: "bg-coral/15 text-coral-ink",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent/60 p-4">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${toneClass}`}
      >
        <Wallet className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="nums truncate text-xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function EditRatesDialog({
  center,
  onClose,
}: {
  center: AdminBillingRow | null;
  onClose: () => void;
}) {
  const { t } = useLayoutTranslation("admin");
  const queryClient = useQueryClient();
  const [base, setBase] = useState("");
  const [perKid, setPerKid] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the fields whenever a different center opens the dialog.
  const [lastId, setLastId] = useState<string | null>(null);
  if (center && center.id !== lastId) {
    setLastId(center.id);
    setBase(String(Math.round(center.baseFeeUzs)));
    setPerKid(String(Math.round(center.perKidFeeUzs)));
    setDay(String(center.billingDay));
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: () =>
      orpc.admin.billing.setPricing({
        centerId: center!.id,
        baseFeeUzs: Number(base),
        perKidFeeUzs: Number(perKid),
        billingDay: Number(day),
      }),
    onSuccess: async () => {
      toast.success(t("billing.edit.saved"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.billing(),
      });
      onClose();
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function save() {
    const baseNum = Number(base);
    const perKidNum = Number(perKid);
    const dayNum = Number(day);
    if (
      !Number.isFinite(baseNum) ||
      baseNum < 0 ||
      !Number.isFinite(perKidNum) ||
      perKidNum < 0
    ) {
      setError(t("billing.edit.invalid"));
      return;
    }
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 28) {
      setError(t("form.validation.billingDayInvalid"));
      return;
    }
    setError(null);
    mutation.mutate();
  }

  const preview =
    center && Number.isFinite(Number(base)) && Number.isFinite(Number(perKid))
      ? Number(base) + center.kidCount * Number(perKid)
      : 0;

  return (
    <Dialog open={!!center} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("billing.edit.title", { name: center?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing-base">{t("billing.edit.base")}</Label>
              <Input
                id="billing-base"
                type="number"
                min={0}
                step={10000}
                inputMode="numeric"
                value={base}
                onChange={(event) => setBase(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing-per-kid">{t("billing.edit.perKid")}</Label>
              <Input
                id="billing-per-kid"
                type="number"
                min={0}
                step={5000}
                inputMode="numeric"
                value={perKid}
                onChange={(event) => setPerKid(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="billing-day">{t("billing.edit.day")}</Label>
            <Input
              id="billing-day"
              type="number"
              min={1}
              max={28}
              inputMode="numeric"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="sm:w-40"
            />
            <p className="text-xs text-muted-foreground">
              {t("form.platform.dayHint")}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-accent/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {t("billing.edit.preview", { kids: center?.kidCount ?? 0 })}
            </span>
            <span className="nums text-base font-bold">
              {formatMoney(preview)}
            </span>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("form.cancel")}
            </Button>
            <Button onClick={save} disabled={mutation.isPending}>
              {mutation.isPending ? t("form.saving") : t("form.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
