"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  GraduationCap,
  Heart,
  Pause,
  Pencil,
  Play,
  School,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AdminCenterDetail,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KidsLoader } from "@/components/kids-loader";
import { SignedAvatar } from "@/components/signed-avatar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import {
  facilityTypeLabel,
  formatDateNumeric,
  formatMoney,
} from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { centerStatusVariant } from "../../_components/center-status";
import {
  CenterForm,
  emptyCenterForm,
  toAdminCenterFields,
  type CenterFormValues,
} from "./center-form";

const invitationStatusVariant: Record<
  InvitationStatus,
  "default" | "success" | "secondary" | "destructive" | "warning"
> = {
  pending: "warning",
  accepted: "success",
  declined: "secondary",
  revoked: "secondary",
  expired: "destructive",
};

export function AdminCenterDetailScreen({ centerId }: { centerId: string }) {
  const { t } = useLayoutTranslation("admin");
  const queryClient = useQueryClient();
  const detailKey = queryKeys.admin.centerDetail(centerId);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: center,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () => orpc.admin.centers.get({ centerId }),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: detailKey });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.centers() });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.admin.overview(),
    });
  }

  const statusMutation = useMutation({
    mutationFn: (status: "active" | "suspended") =>
      orpc.admin.centers.setStatus({ centerId, status }),
    onSuccess: async (result) => {
      toast.success(
        result.status === "suspended"
          ? t("detail.toast.suspended")
          : t("detail.toast.activated"),
      );
      await refresh();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  if (isPending) {
    return <KidsLoader label={t("loading")} size="sm" className="p-6" />;
  }

  if (loadError || !center) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink label={t("detail.back")} />
        <Alert variant="destructive">
          <AlertDescription>
            {loadError ? toApiError(loadError).message : t("detail.loadFailed")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const suspended = center.status === "suspended";

  return (
    <div className="flex flex-col gap-4">
      <BackLink label={t("detail.back")} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent text-lg font-bold text-accent-foreground">
              {center.name.trim().charAt(0).toUpperCase() || "—"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{center.name}</CardTitle>
                <Badge variant={centerStatusVariant[center.status]}>
                  {t(`status.${center.status}`)}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                <span className="font-mono">{center.centerCode}</span> ·{" "}
                {facilityTypeLabel(center.facilityType)}
                {center.region ? ` · ${center.region}` : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <EditCenterDialog center={center} onSaved={refresh} />
            <Button
              variant={suspended ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-2",
                !suspended &&
                  "text-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
              disabled={statusMutation.isPending}
              onClick={() => {
                setActionError(null);
                statusMutation.mutate(suspended ? "active" : "suspended");
              }}
            >
              {suspended ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {suspended
                ? t("detail.actions.activate")
                : t("detail.actions.suspend")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {t("detail.actions.suspendHint")}
          </p>
        </CardContent>
      </Card>

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("detail.stats.children")}
          value={center.stats.children}
          Icon={Users}
          tone="sky"
        />
        <StatCard
          label={t("detail.stats.teachers")}
          value={center.stats.teachers}
          Icon={GraduationCap}
          tone="coral"
        />
        <StatCard
          label={t("detail.stats.classes")}
          value={center.stats.classes}
          Icon={School}
          tone="mint"
        />
        <StatCard
          label={t("detail.stats.parents")}
          value={center.stats.parents}
          Icon={Heart}
          tone="grape"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InfoCard center={center} t={t} />
        <DirectorCard center={center} t={t} />
      </section>

      <ClassesCard center={center} t={t} />
      <InvitationsCard
        center={center}
        t={t}
        onChanged={refresh}
        onError={setActionError}
      />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="gap-1 px-2">
        <Link href="/admin/centers">
          <ArrowLeft className="h-4 w-4" />
          {label}
        </Link>
      </Button>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: "sky" | "mint" | "coral" | "grape";
}) {
  const toneClass = {
    sky: "bg-sky/15 text-sky-ink",
    mint: "bg-mint/20 text-mint-ink",
    coral: "bg-coral/15 text-coral-ink",
    grape: "bg-grape/15 text-grape-ink",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            {label}
          </p>
          <span
            className={cn("grid h-9 w-9 place-items-center rounded-lg", toneClass)}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="nums mt-3 text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function InfoCard({
  center,
  t,
}: {
  center: AdminCenterDetail;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("detail.info.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <InfoRow
            label={t("detail.info.code")}
            value={<span className="font-mono">{center.centerCode}</span>}
          />
          <InfoRow
            label={t("detail.info.facilityType")}
            value={facilityTypeLabel(center.facilityType)}
          />
          <InfoRow
            label={t("detail.info.region")}
            value={
              [center.region, center.district].filter(Boolean).join(" / ") || "—"
            }
          />
          <InfoRow
            label={t("detail.info.phone")}
            value={
              center.phone ? (
                <span dir="ltr" className="nums">
                  {center.phone}
                </span>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label={t("detail.info.address")}
            value={center.address || "—"}
          />
          <InfoRow
            label={t("detail.info.tuition")}
            value={
              <span className="nums font-bold">
                {formatMoney(center.monthlyTuitionUzs)}
              </span>
            }
          />
          <InfoRow
            label={t("detail.info.created")}
            value={
              <span className="nums">{formatDateNumeric(center.createdAt)}</span>
            }
          />
          <InfoRow
            label={t("detail.info.organization")}
            value={center.organization.name}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function DirectorCard({
  center,
  t,
}: {
  center: AdminCenterDetail;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("detail.director.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {center.director ? (
          <div className="flex items-center gap-4">
            <SignedAvatar
              mediaAssetId={center.director.avatarUrl}
              name={center.director.fullName}
              className="h-16 w-16 shrink-0"
              textClassName="text-xl"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">
                {center.director.fullName}
              </p>
              <p
                dir="ltr"
                className="nums truncate text-left text-sm text-muted-foreground"
              >
                {t("detail.director.phone")}: {center.director.phone ?? "—"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {t("detail.director.email")}: {center.director.email ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-5">
            <Badge variant="warning">{t("centers.noDirector")}</Badge>
            <p className="text-sm text-muted-foreground">
              {t("detail.director.empty")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassesCard({
  center,
  t,
}: {
  center: AdminCenterDetail;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("detail.classes.title")}</CardTitle>
        <CardDescription>{t("detail.classes.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {center.classes.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("detail.classes.empty")}
          </p>
        ) : (
          <table className="nums w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="border-b py-2.5 pr-4 font-semibold">
                  {t("detail.classes.class")}
                </th>
                <th className="w-32 border-b px-4 py-2.5 text-right font-semibold">
                  {t("detail.classes.teachers")}
                </th>
                <th className="w-32 border-b py-2.5 pl-4 text-right font-semibold">
                  {t("detail.classes.children")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {center.classes.map((klass) => (
                <tr key={klass.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
                        {klass.name.trim().charAt(0).toUpperCase() || "—"}
                      </span>
                      <span className="font-semibold">{klass.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{klass.teacherCount}</td>
                  <td className="py-3 pl-4 text-right">{klass.childCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function InvitationsCard({
  center,
  t,
  onChanged,
  onError,
}: {
  center: AdminCenterDetail;
  t: ReturnType<typeof useLayoutTranslation>["t"];
  onChanged: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      orpc.admin.invitations.createDirector({
        centerId: center.id,
        phone: phone.trim(),
      }),
    onSuccess: async () => {
      toast.success(t("detail.toast.invited", { phone: phone.trim() }));
      setPhone("");
      await onChanged();
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      orpc.admin.invitations.resend({ invitationId }),
    onSuccess: async (_data, invitationId) => {
      const row = center.invitations.find((item) => item.id === invitationId);
      toast.success(t("detail.toast.resent", { phone: row?.phone ?? "" }));
      await onChanged();
    },
    onError: (err) => onError(toApiError(err).message),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      orpc.admin.invitations.revoke({ invitationId }),
    onSuccess: async () => {
      toast(t("detail.toast.revoked"));
      await onChanged();
    },
    onError: (err) => onError(toApiError(err).message),
  });

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!phone.trim()) {
      setFormError(t("detail.invitations.validation.phoneRequired"));
      return;
    }
    sendMutation.mutate();
  }

  const rowBusy = (id: string) =>
    (resendMutation.isPending && resendMutation.variables === id) ||
    (revokeMutation.isPending && revokeMutation.variables === id);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          {t("detail.invitations.title")}
        </CardTitle>
        <CardDescription>{t("detail.invitations.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={send} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="director-invite-phone">
                {t("detail.invitations.phone")}
              </Label>
              <Input
                id="director-invite-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t("detail.invitations.phonePlaceholder")}
              />
            </div>
            <Button
              type="submit"
              disabled={sendMutation.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendMutation.isPending
                ? t("detail.invitations.sending")
                : t("detail.invitations.send")}
            </Button>
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
        </form>

        {center.invitations.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("detail.invitations.empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {t("detail.invitations.table.phone")}
                  </th>
                  <th className="w-32 px-4 py-3 font-semibold">
                    {t("detail.invitations.table.status")}
                  </th>
                  <th className="hidden w-32 px-4 py-3 font-semibold sm:table-cell">
                    {t("detail.invitations.table.created")}
                  </th>
                  <th className="hidden w-32 px-4 py-3 font-semibold lg:table-cell">
                    {t("detail.invitations.table.expires")}
                  </th>
                  <th className="w-44 px-4 py-3 text-right font-semibold">
                    {t("detail.invitations.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {center.invitations.map((row) => {
                  const open = row.status === "pending";
                  return (
                    <tr key={row.id} className="border-t hover:bg-muted/40">
                      <td
                        dir="ltr"
                        className="nums truncate px-4 py-3 text-left font-semibold"
                      >
                        {row.phone}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={invitationStatusVariant[row.status]}>
                          {t(`detail.invitations.status.${row.status}`)}
                        </Badge>
                      </td>
                      <td className="nums hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDateNumeric(row.createdAt)}
                      </td>
                      <td className="nums hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {formatDateNumeric(row.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {open ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => resendMutation.mutate(row.id)}
                              disabled={rowBusy(row.id)}
                            >
                              {t("detail.invitations.resend")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeMutation.mutate(row.id)}
                              disabled={rowBusy(row.id)}
                            >
                              {t("detail.invitations.revoke")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditCenterDialog({
  center,
  onSaved,
}: {
  center: AdminCenterDetail;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLayoutTranslation("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CenterFormValues>(emptyCenterForm);
  const [error, setError] = useState<string | null>(null);

  function openWithCurrentValues(next: boolean) {
    if (next) {
      setValues({
        name: center.name,
        facilityType: center.facilityType,
        regionId: center.regionId ?? "",
        districtId: center.districtId ?? "",
        address: center.address ?? "",
        phone: center.phone ?? "",
        monthlyTuitionUzs: String(Math.round(center.monthlyTuitionUzs)),
      });
      setError(null);
    }
    setOpen(next);
  }

  // Deep link from the centers table ("Edit" action): open the dialog straight
  // away, then strip ?edit=1 so closing/refreshing doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("edit") !== "1") return;
    openWithCurrentValues(true);
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router]);

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.admin.centers.update({
        centerId: center.id,
        body: toAdminCenterFields(values),
      }),
    onSuccess: async () => {
      toast.success(t("detail.toast.updated"));
      setOpen(false);
      await onSaved();
    },
    onError: (err) => setError(toApiError(err).message),
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => openWithCurrentValues(true)}
      >
        <Pencil className="h-4 w-4" />
        {t("detail.actions.edit")}
      </Button>
      <Dialog open={open} onOpenChange={openWithCurrentValues}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("form.editTitle")}</DialogTitle>
          </DialogHeader>
          <CenterForm
            idPrefix="edit-center"
            values={values}
            onChange={setValues}
            onSubmit={() => {
              setError(null);
              updateMutation.mutate();
            }}
            onCancel={() => setOpen(false)}
            submitLabel={t("form.save")}
            submittingLabel={t("form.saving")}
            submitting={updateMutation.isPending}
            error={error}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
