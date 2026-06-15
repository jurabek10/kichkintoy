"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import type { CompleteMedicationRequestInput } from "@kichkintoy/shared";
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
import { SignedMedicationImage } from "./signed-medication-image";
import { medicationStatusLabelKey } from "./medication-labels";

export function MedicationDetailScreen({ requestId }: { requestId: string }) {
  const { t } = useLayoutTranslation("medications");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const staff = session?.user.role !== "parent";
  const [completionStatus, setCompletionStatus] =
    useState<CompleteMedicationRequestInput["status"]>("administered");
  const [administeredAt, setAdministeredAt] = useState(currentLocalDateTime());
  const [administeredDose, setAdministeredDose] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [skippedReason, setSkippedReason] = useState("");

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

  const cancelMutation = useMutation({
    mutationFn: () => orpc.medications.cancel({ requestId }),
    onSuccess: async () => {
      toast.success(t("toast.requestCancelled"));
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      orpc.medications.complete({
        requestId,
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
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
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
    return (
      <LoadingCard label={t("loading")} />
    );
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

  const pending = request.status === "pending";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard/medications">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        {!staff && pending ? (
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            <Ban className="h-4 w-4" />
            {t("detail.cancelRequest")}
          </Button>
        ) : null}
      </div>

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
              [
                t("detail.class"),
                request.child.className ?? t("detail.noClass"),
              ],
              [t("detail.parent"), request.parentName],
              [t("detail.symptoms"), request.symptoms],
              [t("detail.medicineType"), request.medicationType],
              [t("detail.dosage"), request.dosage],
              [t("detail.countFrequency"), request.medicationCount ?? "—"],
              [t("detail.storage"), request.storageMethod ?? "—"],
              [t("detail.instructions"), request.instructions ?? "—"],
              [t("detail.specialNote"), request.specialNote ?? "—"],
              [t("detail.signature"), request.parentSignature],
              [t("detail.submitted"), formatDateTime(request.createdAt)],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("detail.reportTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pending && staff ? (
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
                      onChange={(event) =>
                        setAdministeredAt(event.target.value)
                      }
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
          ) : request.status === "pending" ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.noReportYet")}
            </p>
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
    </div>
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

function currentLocalDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
