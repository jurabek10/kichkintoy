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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/errors";
import {
  formatDate,
  formatDateTime,
  medicationStatusLabel,
} from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { SignedMedicationImage } from "./signed-medication-image";

export function MedicationDetailScreen({ requestId }: { requestId: string }) {
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
      toast.success("Medication request cancelled.");
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
      toast.success("Medication report saved.");
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
    return <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>;
  }

  if (error || !request) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : "Medication request not found."}
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
            Back to medication
          </Link>
        </Button>
        {!staff && pending ? (
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            <Ban className="h-4 w-4" />
            Cancel request
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{medicationStatusLabel(request.status)}</Badge>
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
              ["Child", request.child.name],
              ["Class", request.child.className ?? "No class"],
              ["Parent", request.parentName],
              ["Symptoms", request.symptoms],
              ["Medicine type", request.medicationType],
              ["Dosage", request.dosage],
              ["Count/frequency", request.medicationCount ?? "—"],
              ["Storage", request.storageMethod ?? "—"],
              ["Instructions", request.instructions ?? "—"],
              ["Special note", request.specialNote ?? "—"],
              ["Signature", request.parentSignature],
              ["Submitted", formatDateTime(request.createdAt)],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medication report</CardTitle>
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
                <ReportOption value="administered" label="Administered" />
                <ReportOption value="skipped" label="Skipped" />
              </RadioGroup>

              {completionStatus === "administered" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="administered-at">Administered time</Label>
                    <Input
                      id="administered-at"
                      type="datetime-local"
                      value={administeredAt}
                      onChange={(event) => setAdministeredAt(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="administered-dose">Administered dose</Label>
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
                  <Label htmlFor="skipped-reason">Skipped reason</Label>
                  <Textarea
                    id="skipped-reason"
                    value={skippedReason}
                    onChange={(event) => setSkippedReason(event.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="staff-note">Staff note</Label>
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
                Save report
              </Button>
            </>
          ) : request.status === "pending" ? (
            <p className="text-sm text-muted-foreground">
              The center has not completed this medication report yet.
            </p>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {medicationStatusLabel(request.status)}
                </span>
              </div>
              <InfoGrid
                items={[
                  ["Staff", request.administeredBy?.fullName ?? "—"],
                  [
                    "Administered at",
                    request.administeredAt
                      ? formatDateTime(request.administeredAt)
                      : "—",
                  ],
                  ["Dose", request.administeredDose ?? "—"],
                  ["Skipped reason", request.skippedReason ?? "—"],
                  ["Staff note", request.staffNote ?? "—"],
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
