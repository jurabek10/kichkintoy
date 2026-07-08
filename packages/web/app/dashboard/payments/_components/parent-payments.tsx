"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import type {
  PaymentProvider,
  PaymentsHistoryItem,
  PaymentsOverview,
} from "@kichkintoy/shared";
import type { TFunction } from "i18next";
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
import { Input } from "@/components/ui/input";
import { ChildAvatar } from "@/components/child-avatar";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { dateLocale } from "@/lib/date";
import { formatDateNumeric, formatMoney } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

/**
 * Parent tuition payments. The current month's invoice per child sits on top
 * (one card each, with the Payme / Click pay buttons), the full invoice
 * history below as a table. While the merchant credentials are missing the
 * backend runs in sandbox mode: the pay buttons then open a "simulated
 * payment" dialog instead of redirecting, exercising the same settlement path.
 */

// Remembers which invoice a checkout redirect left pending, so returning from
// the provider resumes polling that invoice until the callback lands.
const PENDING_INVOICE_KEY = "kichkintoy.pending-payment-invoice";

// Brand colors of the two providers, used only on their pay buttons.
const PROVIDER_BUTTON: Record<PaymentProvider, string> = {
  payme: "bg-[#33CCCC] hover:bg-[#29b3b3] text-white",
  click: "bg-[#0073EF] hover:bg-[#0061c9] text-white",
};

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  payme: "Payme",
  click: "Click",
};

type SandboxTarget = {
  invoiceId: string;
  provider: PaymentProvider;
  amount: number;
  childName: string;
};

export function ParentPayments() {
  const { t, i18n } = useLayoutTranslation("payments");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sandboxTarget, setSandboxTarget] = useState<SandboxTarget | null>(
    null,
  );
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    setPendingInvoiceId(sessionStorage.getItem(PENDING_INVOICE_KEY));
  }, []);

  const {
    data: overview,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.payments.overview(),
    queryFn: () => orpc.payments.overview(),
  });

  const { data: history = [], isPending: historyPending } = useQuery({
    queryKey: queryKeys.payments.history(),
    queryFn: () => orpc.payments.history(),
  });

  // After a redirect checkout the provider confirms server-to-server, so we
  // poll the invoice until the callback flips it to paid.
  const { data: pendingStatus } = useQuery({
    queryKey: queryKeys.payments.invoiceStatus(pendingInvoiceId ?? ""),
    queryFn: () => orpc.payments.invoiceStatus({ invoiceId: pendingInvoiceId! }),
    enabled: Boolean(pendingInvoiceId),
    refetchInterval: 4000,
  });
  useEffect(() => {
    if (!pendingStatus || !pendingInvoiceId) return;
    if (pendingStatus.status === "paid") {
      toast.success(t("toast.paid"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    }
    if (pendingStatus.status !== "issued") {
      sessionStorage.removeItem(PENDING_INVOICE_KEY);
      setPendingInvoiceId(null);
    }
  }, [pendingStatus, pendingInvoiceId, queryClient, t]);

  const checkout = useMutation({
    mutationFn: (input: {
      invoiceId: string;
      provider: PaymentProvider;
      amount: number;
      childName: string;
    }) =>
      orpc.payments.checkout({
        invoiceId: input.invoiceId,
        provider: input.provider,
        language: normalizeLanguage(i18n.language),
      }),
    onSuccess: (result, input) => {
      if (result.mode === "redirect") {
        sessionStorage.setItem(PENDING_INVOICE_KEY, input.invoiceId);
        window.location.assign(result.url);
        return;
      }
      setSandboxTarget({
        invoiceId: input.invoiceId,
        provider: input.provider,
        amount: input.amount,
        childName: input.childName,
      });
    },
    onError: (mutationError) =>
      toast.error(toApiError(mutationError).message || t("toast.error")),
  });

  const sandboxPay = useMutation({
    mutationFn: (input: { invoiceId: string; provider: PaymentProvider }) =>
      orpc.payments.sandboxPay(input),
    onSuccess: () => {
      setSandboxTarget(null);
      toast.success(t("toast.paid"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    },
    onError: (mutationError) =>
      toast.error(toApiError(mutationError).message || t("toast.error")),
  });

  const columns = useMemo(() => buildColumns(t), [t]);

  const query = search.trim().toLowerCase();
  const rows = history.filter((item) =>
    query ? item.child.name.toLowerCase().includes(query) : true,
  );

  const monthTitle = overview
    ? formatMonthLabel(overview.month.label, i18n.language)
    : "";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={Wallet}
            tone="grape"
            title={t("title")}
            description={t("description")}
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold">{t("currentMonth")}</h2>
          <span className="text-sm font-medium capitalize text-muted-foreground">
            {monthTitle}
          </span>
        </div>

        {isPending ? (
          <LoadingCard label={t("loading")} />
        ) : !overview || overview.children.length === 0 ? (
          <Card className="grid place-items-center gap-2 p-8 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("empty.body")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {overview.children.map(({ child, invoice }) => {
              const paid = invoice.status === "paid";
              const polling = pendingInvoiceId === invoice.id && !paid;
              return (
                <Card key={invoice.id} className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <ChildAvatar
                      name={child.name}
                      photoUrl={child.photoUrl}
                      className="h-12 w-12 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{child.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {child.centerName}
                        {child.className ? ` · ${child.className}` : ""}
                      </p>
                    </div>
                    <InvoiceBadge
                      status={invoice.status}
                      paidAmount={invoice.paidAmount}
                      t={t}
                    />
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("monthFee")}
                      </p>
                      <p className="text-2xl font-bold tracking-tight">
                        {formatMoney(invoice.amount)}
                      </p>
                    </div>
                    {paid ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("status.paid")}
                      </span>
                    ) : null}
                  </div>

                  {paid ? null : polling ? (
                    <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("waitingConfirmation")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {(["payme", "click"] as const).map((provider) => {
                        const available =
                          overview.providers[provider] ||
                          overview.providers.sandbox;
                        return (
                          <Button
                            key={provider}
                            disabled={!available || checkout.isPending}
                            className={PROVIDER_BUTTON[provider]}
                            onClick={() =>
                              checkout.mutate({
                                invoiceId: invoice.id,
                                provider,
                                amount: invoice.amount,
                                childName: child.name,
                              })
                            }
                          >
                            {t("payWith", {
                              provider: PROVIDER_LABEL[provider],
                            })}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("history.title")}</CardTitle>
          <CardDescription>{t("history.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {historyPending ? (
            <LoadingCard label={t("loading")} />
          ) : history.length === 0 ? (
            <Card className="grid place-items-center gap-2 p-8 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("history.empty")}
              </p>
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              emptyMessage={t("table.empty")}
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("table.search")}
                      className="h-9 w-[190px] pl-8"
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
        open={sandboxTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSandboxTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sandbox.title")}</DialogTitle>
            <DialogDescription>
              {sandboxTarget
                ? t("sandbox.body", {
                    provider: PROVIDER_LABEL[sandboxTarget.provider],
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          {sandboxTarget ? (
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {sandboxTarget.childName}
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatMoney(sandboxTarget.amount)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSandboxTarget(null)}
              disabled={sandboxPay.isPending}
            >
              {t("sandbox.cancel")}
            </Button>
            <Button
              onClick={() =>
                sandboxTarget &&
                sandboxPay.mutate({
                  invoiceId: sandboxTarget.invoiceId,
                  provider: sandboxTarget.provider,
                })
              }
              disabled={sandboxPay.isPending}
            >
              {sandboxPay.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("sandbox.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceBadge({
  status,
  paidAmount,
  t,
}: {
  status: PaymentsOverview["children"][number]["invoice"]["status"];
  paidAmount: number;
  t: TFunction<"payments">;
}) {
  if (status === "paid") {
    return <Badge variant="success">{t("status.paid")}</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="secondary">{t("status.cancelled")}</Badge>;
  }
  if (paidAmount > 0) {
    return <Badge variant="warning">{t("status.partial")}</Badge>;
  }
  return <Badge variant="warning">{t("status.issued")}</Badge>;
}

function buildColumns(
  t: TFunction<"payments">,
): ColumnDef<PaymentsHistoryItem>[] {
  return [
    {
      id: "row",
      enableSorting: false,
      enableHiding: false,
      header: () => <span>{t("table.row")}</span>,
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return (
          <span className="text-sm text-muted-foreground">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      id: "child",
      accessorFn: (item) => item.child.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.child")} />
      ),
      cell: ({ row }) => {
        const { child } = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <ChildAvatar name={child.name} photoUrl={child.photoUrl} />
            <div className="min-w-0 max-w-[220px]">
              <p className="truncate font-medium">{child.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {child.className ?? child.centerName}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "month",
      accessorFn: (item) => item.invoice.monthLabel,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.month")} />
      ),
      cell: ({ row }) => (
        <MonthCell label={row.original.invoice.monthLabel} />
      ),
    },
    {
      id: "amount",
      accessorFn: (item) => item.invoice.amount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.amount")} />
      ),
      cell: ({ row }) => (
        <span className="nums text-sm font-medium">
          {formatMoney(row.original.invoice.amount)}
        </span>
      ),
    },
    {
      id: "provider",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.provider")} />
      ),
      cell: ({ row }) => {
        const paidPayment = row.original.payments.find(
          (payment) => payment.status === "paid",
        );
        if (!paidPayment) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm">
            {providerLabel(paidPayment.provider)}
            {paidPayment.sandbox ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {t("table.sandboxTag")}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: "status",
      accessorFn: (item) => item.invoice.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => (
        <InvoiceBadge
          status={row.original.invoice.status}
          paidAmount={row.original.invoice.paidAmount}
          t={t}
        />
      ),
    },
    {
      id: "paidAt",
      accessorFn: (item) =>
        item.payments.find((payment) => payment.status === "paid")?.paidAt ??
        "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.paidAt")} />
      ),
      cell: ({ row }) => {
        const paidAt = row.original.payments.find(
          (payment) => payment.status === "paid",
        )?.paidAt;
        return (
          <span className="nums text-sm text-muted-foreground">
            {paidAt ? formatDateNumeric(paidAt) : "—"}
          </span>
        );
      },
    },
  ];
}

/** "2026-07" → a localized month title like "Iyul 2026". */
function formatMonthLabel(label: string, language: string): string {
  const [year, month] = label.split("-").map(Number);
  if (!year || !month) return label;
  return format(new Date(year, month - 1, 1), "LLLL yyyy", {
    locale: dateLocale(language),
  });
}

function MonthCell({ label }: { label: string }) {
  const { i18n } = useLayoutTranslation("payments");
  return (
    <span className="text-sm capitalize">
      {formatMonthLabel(label, i18n.language)}
    </span>
  );
}

function providerLabel(provider: string): string {
  if (provider === "payme") return "Payme";
  if (provider === "click") return "Click";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function normalizeLanguage(language: string): "uz" | "ru" | "en" {
  const short = language.slice(0, 2);
  return short === "ru" || short === "en" ? short : "uz";
}
