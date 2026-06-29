"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  FlaskConical,
  type LucideIcon,
  Repeat,
  Save,
  Snowflake,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CompleteMedicationRequestInput,
  MedicationRequestDetail,
} from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { ConfirmDialog } from "./confirm-dialog";
import { SignedMedicationImage } from "./signed-medication-image";
import { medicationStatusLabelKey } from "./medication-labels";

const SIGNATURE_MEDIA_PREFIX = "media:";

export function MedicationDetailScreen({ requestId }: { requestId: string }) {
  const { t } = useLayoutTranslation("medications");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const staff = session?.user.role !== "parent";

  const {
    data: request,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.medications.detail(requestId),
    queryFn: () => orpc.medications.detail({ requestId }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.medications.all(),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.medications.detail(requestId),
    });
  }

  if (isPending) {
    return <LoadingCard label={t("loading")} />;
  }

  if (error || !request) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/medications">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      {staff ? (
        <StaffDetail request={request} t={t} onChanged={invalidate} />
      ) : (
        <ParentDetail
          request={request}
          requestId={requestId}
          t={t}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Parent view — mirrors the mobile detail screen: a coral banner, identity-led
 * info rows, the parent's own notes and signature, and the center's outcome
 * once it lands. A pending request can be cancelled behind a confirm step.
 * -------------------------------------------------------------------------- */

function ParentDetail({
  request,
  requestId,
  t,
  onChanged,
}: {
  request: MedicationRequestDetail;
  requestId: string;
  t: TFunction<"medications">;
  onChanged: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const pending = request.status === "pending";
  const isMediaSignature = request.parentSignature.startsWith(
    SIGNATURE_MEDIA_PREFIX,
  );

  const cancelMutation = useMutation({
    mutationFn: () => orpc.medications.cancel({ requestId }),
    onSuccess: async () => {
      setConfirming(false);
      toast.success(t("toast.requestCancelled"));
      await onChanged();
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(toApiError(err).message);
    },
  });

  const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: User, label: t("detail.child"), value: request.child.name },
    ...(request.child.className
      ? [
          {
            icon: Users,
            label: t("detail.class"),
            value: request.child.className,
          },
        ]
      : []),
    {
      icon: Calendar,
      label: t("composer.date"),
      value: formatDate(request.requestedForDate),
    },
    {
      icon: FlaskConical,
      label: t("detail.medicineType"),
      value: request.medicationType,
    },
    { icon: Droplet, label: t("detail.dosage"), value: request.dosage },
    {
      icon: Clock,
      label: t("composer.medicationTime"),
      value: request.medicationTime,
    },
    ...(request.medicationCount
      ? [
          {
            icon: Repeat,
            label: t("detail.countFrequency"),
            value: request.medicationCount,
          },
        ]
      : []),
    ...(request.storageMethod
      ? [
          {
            icon: Snowflake,
            label: t("detail.storage"),
            value: request.storageMethod,
          },
        ]
      : []),
  ];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 bg-coral/50 p-5">
          <div className="min-w-0">
            <Badge variant={statusVariant(request.status)}>
              {t(medicationStatusLabelKey(request.status))}
            </Badge>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight">
              {request.medicineName}
            </h1>
          </div>
        </div>

        <dl className="divide-y">
          {facts.map((fact) => (
            <InfoRow
              key={fact.label}
              Icon={fact.icon}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </dl>
      </Card>

      <NoteCard label={t("detail.symptoms")} value={request.symptoms} />
      {request.instructions ? (
        <NoteCard
          label={t("detail.instructions")}
          value={request.instructions}
        />
      ) : null}
      {request.specialNote ? (
        <NoteCard
          label={t("detail.specialNote")}
          value={request.specialNote}
        />
      ) : null}

      {request.photo ? (
        <Card>
          <CardContent className="grid gap-2 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("composer.medicationPhoto")}
            </p>
            <div className="overflow-hidden rounded-xl border bg-muted">
              <SignedMedicationImage
                mediaAssetId={request.photo.assetId}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            {request.photoCaption ? (
              <p className="text-sm text-muted-foreground">
                {request.photoCaption}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-2 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("detail.signature")}
          </p>
          {isMediaSignature ? (
            <div className="grid h-28 place-items-center rounded-xl border bg-white">
              <SignedMedicationImage
                mediaAssetId={request.parentSignature.slice(
                  SIGNATURE_MEDIA_PREFIX.length,
                )}
                className="h-full w-auto object-contain"
              />
            </div>
          ) : (
            <p className="text-sm font-semibold">
              {request.parentSignature || "—"}
            </p>
          )}
        </CardContent>
      </Card>

      <Outcome request={request} t={t} />

      {pending ? (
        <Button
          variant="outline"
          className="border-coral-ink text-coral-ink hover:bg-coral/40 hover:text-coral-ink"
          onClick={() => setConfirming(true)}
        >
          <Ban className="h-4 w-4" />
          {t("detail.cancelRequest")}
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("cancelConfirm.title")}
        body={t("cancelConfirm.body")}
        confirmLabel={t("cancelConfirm.yes")}
        cancelLabel={t("cancelConfirm.no")}
        tone="destructive"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />
    </>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-coral-ink">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
          {label}
        </dt>
        <dd className="text-[15px] font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function NoteCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="grid gap-1.5 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="whitespace-pre-wrap text-[15px] leading-6">{value}</p>
      </CardContent>
    </Card>
  );
}

function Outcome({
  request,
  t,
}: {
  request: MedicationRequestDetail;
  t: TFunction<"medications">;
}) {
  if (request.status === "administered") {
    return (
      <Card className="border-mint">
        <CardContent className="grid gap-2 p-5">
          <div className="flex items-center gap-2 text-mint-ink">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-bold">{t("detail.reportTitle")}</p>
          </div>
          <OutcomeLine
            label={t("detail.staff")}
            value={request.administeredBy?.fullName}
          />
          <OutcomeLine
            label={t("detail.administeredAt")}
            value={
              request.administeredAt
                ? formatDateTime(request.administeredAt)
                : null
            }
          />
          <OutcomeLine
            label={t("detail.administeredDose")}
            value={request.administeredDose}
          />
          <OutcomeLine
            label={t("detail.staffNote")}
            value={request.staffNote}
          />
        </CardContent>
      </Card>
    );
  }

  if (request.status === "skipped") {
    return (
      <Card>
        <CardContent className="grid gap-2 p-5">
          <p className="text-sm font-bold text-muted-foreground">
            {t("detail.reportTitle")}
          </p>
          <OutcomeLine
            label={t("detail.skippedReason")}
            value={request.skippedReason}
          />
          <OutcomeLine
            label={t("detail.staffNote")}
            value={request.staffNote}
          />
        </CardContent>
      </Card>
    );
  }

  if (request.status === "pending") {
    return (
      <p className="px-1 text-sm text-muted-foreground">
        {t("detail.noReportYet")}
      </p>
    );
  }

  return null;
}

function OutcomeLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="font-semibold">{label}: </span>
      {value}
    </p>
  );
}

/* ----------------------------------------------------------------------------
 * Staff view — review the request and file the administration report.
 * -------------------------------------------------------------------------- */

function StaffDetail({
  request,
  t,
  onChanged,
}: {
  request: MedicationRequestDetail;
  t: TFunction<"medications">;
  onChanged: () => Promise<void>;
}) {
  const [completionStatus, setCompletionStatus] =
    useState<CompleteMedicationRequestInput["status"]>("administered");
  const [administeredAt, setAdministeredAt] = useState(currentLocalDateTime());
  const [administeredDose, setAdministeredDose] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [skippedReason, setSkippedReason] = useState("");

  const pending = request.status === "pending";

  const completeMutation = useMutation({
    mutationFn: () =>
      orpc.medications.complete({
        requestId: request.id,
        body: {
          status: completionStatus,
          administeredAt:
            completionStatus === "administered"
              ? new Date(administeredAt).toISOString()
              : undefined,
          administeredDose: administeredDose || undefined,
          staffNote: staffNote || undefined,
          skippedReason:
            completionStatus === "skipped" ? skippedReason : undefined,
        },
      }),
    onSuccess: async () => {
      toast.success(t("toast.reportSaved"));
      await onChanged();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <>
      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{t(medicationStatusLabelKey(request.status))}</Badge>
            <Badge variant="outline">
              {formatDate(request.requestedForDate)}
            </Badge>
            <Badge variant="outline">{request.medicationTime}</Badge>
          </div>
          <CardTitle className="text-xl">{request.medicineName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {request.photo ? (
            <div className="overflow-hidden rounded-md border bg-muted">
              <SignedMedicationImage
                mediaAssetId={request.photo.assetId}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ) : null}
          {request.photoCaption ? (
            <p className="text-sm text-muted-foreground">
              {request.photoCaption}
            </p>
          ) : null}

          <InfoGrid
            items={[
              [t("detail.child"), request.child.name],
              [t("detail.class"), request.child.className ?? t("detail.noClass")],
              [t("detail.parent"), request.parentName],
              [t("detail.symptoms"), request.symptoms],
              [t("detail.medicineType"), request.medicationType],
              [t("detail.dosage"), request.dosage],
              [t("detail.countFrequency"), request.medicationCount ?? "—"],
              [t("detail.storage"), request.storageMethod ?? "—"],
              [t("detail.instructions"), request.instructions ?? "—"],
              [t("detail.specialNote"), request.specialNote ?? "—"],
              [t("detail.submitted"), formatDateTime(request.createdAt)],
            ]}
          />

          <div className="grid gap-1.5">
            <p className="text-sm font-medium">{t("detail.signature")}</p>
            {request.parentSignature.startsWith(SIGNATURE_MEDIA_PREFIX) ? (
              <div className="w-fit overflow-hidden rounded-md border bg-white">
                <SignedMedicationImage
                  mediaAssetId={request.parentSignature.slice(
                    SIGNATURE_MEDIA_PREFIX.length,
                  )}
                  className="h-28 w-auto object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {request.parentSignature || "—"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("detail.reportTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pending ? (
            <>
              <RadioGroup
                value={completionStatus}
                onValueChange={(value) =>
                  setCompletionStatus(
                    value as CompleteMedicationRequestInput["status"],
                  )
                }
                className="grid gap-2 sm:grid-cols-2"
              >
                <ReportOption
                  value="administered"
                  label={t("status.administered")}
                />
                <ReportOption value="skipped" label={t("status.skipped")} />
              </RadioGroup>

              {completionStatus === "administered" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="administered-at">
                      {t("detail.administeredTime")}
                    </Label>
                    <Input
                      id="administered-at"
                      type="datetime-local"
                      value={administeredAt}
                      onChange={(event) => setAdministeredAt(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="administered-dose">
                      {t("detail.administeredDose")}
                    </Label>
                    <Input
                      id="administered-dose"
                      value={administeredDose}
                      placeholder={request.dosage}
                      onChange={(event) =>
                        setAdministeredDose(event.target.value)
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="skipped-reason">
                    {t("detail.skippedReason")}
                  </Label>
                  <Textarea
                    id="skipped-reason"
                    value={skippedReason}
                    onChange={(event) => setSkippedReason(event.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="staff-note">{t("detail.staffNote")}</Label>
                <Textarea
                  id="staff-note"
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-fit"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {t("detail.saveReport")}
              </Button>
            </>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {t(medicationStatusLabelKey(request.status))}
                </span>
              </div>
              <InfoGrid
                items={[
                  [t("detail.staff"), request.administeredBy?.fullName ?? "—"],
                  [
                    t("detail.administeredAt"),
                    request.administeredAt
                      ? formatDateTime(request.administeredAt)
                      : "—",
                  ],
                  [t("detail.dose"), request.administeredDose ?? "—"],
                  [t("detail.skippedReason"), request.skippedReason ?? "—"],
                  [t("detail.staffNote"), request.staffNote ?? "—"],
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border p-3">
          <dt className="text-xs font-semibold text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportOption({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-md border p-3">
      <RadioGroupItem value={value} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}

function statusVariant(status: MedicationRequestDetail["status"]) {
  if (status === "administered") return "success" as const;
  if (status === "skipped") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function currentLocalDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
