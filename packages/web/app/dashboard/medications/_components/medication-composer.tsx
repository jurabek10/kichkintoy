"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import { queryKeys } from "@/lib/query-keys";

export function MedicationComposer() {
  const { t } = useLayoutTranslation("medications");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState("");
  const [requestedForDate, setRequestedForDate] = useState(todayIso());
  const [symptoms, setSymptoms] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [medicationType, setMedicationType] = useState("");
  const [dosage, setDosage] = useState("");
  const [medicationTime, setMedicationTime] = useState("");
  const [medicationCount, setMedicationCount] = useState("");
  const [storageMethod, setStorageMethod] = useState("");
  const [instructions, setInstructions] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [photoMediaAssetId, setPhotoMediaAssetId] = useState<string | null>(
    null,
  );
  const [photoCaption, setPhotoCaption] = useState("");
  const [parentSignature, setParentSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.medications.children(),
    queryFn: () => orpc.medications.children({}),
  });

  useEffect(() => {
    if (!childId && audience?.children[0]) {
      setChildId(audience.children[0].id);
    }
  }, [audience, childId]);

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.medications.create({
        childId,
        requestedForDate,
        symptoms,
        medicineName,
        medicationType,
        dosage,
        medicationTime,
        medicationCount: medicationCount || undefined,
        storageMethod: storageMethod || undefined,
        instructions: instructions || undefined,
        specialNote: specialNote || undefined,
        photoMediaAssetId: photoMediaAssetId ?? undefined,
        photoCaption: photoCaption || undefined,
        parentSignature,
        consent: true,
      }),
    onSuccess: async (request) => {
      toast.success(t("toast.requestSent"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.medications.all(),
      });
      router.push(`/dashboard/medications/${request.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!childId) return setError(t("validation.childRequired"));
    if (!symptoms.trim()) return setError(t("validation.symptomsRequired"));
    if (!medicineName.trim())
      return setError(t("validation.medicineNameRequired"));
    if (!medicationType.trim())
      return setError(t("validation.medicationTypeRequired"));
    if (!dosage.trim()) return setError(t("validation.dosageRequired"));
    if (!medicationTime.trim())
      return setError(t("validation.medicationTimeRequired"));
    if (!parentSignature.trim())
      return setError(t("validation.parentSignatureRequired"));
    if (!consent) return setError(t("validation.consentRequired"));
    createMutation.mutate();
  }

  async function uploadFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const effectiveChildId = childId || audience?.children[0]?.id;
    if (!effectiveChildId) {
      return setError(t("validation.chooseChildBeforeUpload"));
    }
    if (!childId) setChildId(effectiveChildId);
    const child = audience?.children.find(
      (item) => item.id === effectiveChildId,
    );
    if (!child) return setError(t("validation.chooseChildBeforeUpload"));
    setError(null);
    try {
      const signed = await orpc.media.createUploadUrl({
        centerId: child.centerId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: "medication",
      });
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error(
          t("validation.uploadFailedForFile", { file: file.name }),
        );
      }
      const asset = await orpc.media.completeUpload({
        mediaAssetId: signed.mediaAssetId,
      });
      setPhotoMediaAssetId(asset.id);
      toast.success(t("toast.photoUploaded"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("validation.uploadFailed"),
      );
    }
  }

  const selectedChild = audience?.children.find((item) => item.id === childId);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/medications">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("composer.newTitle")}</CardTitle>
          <CardDescription>{t("composer.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("composer.child")}</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseChild")} />
                </SelectTrigger>
                <SelectContent>
                  {(audience?.children ?? []).map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChild ? (
                <p className="text-xs text-muted-foreground">
                  {selectedChild.className ?? t("detail.noClass")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medication-date">{t("composer.date")}</Label>
              <DatePicker
                id="medication-date"
                value={requestedForDate}
                onValueChange={setRequestedForDate}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="symptoms">{t("composer.symptoms")}</Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="medicine-name"
              label={t("composer.medicineName")}
              value={medicineName}
              onChange={setMedicineName}
            />
            <Field
              id="medication-type"
              label={t("composer.medicationType")}
              value={medicationType}
              onChange={setMedicationType}
            />
            <Field
              id="dosage"
              label={t("composer.dosage")}
              value={dosage}
              onChange={setDosage}
            />
            <Field
              id="medication-time"
              label={t("composer.medicationTime")}
              value={medicationTime}
              onChange={setMedicationTime}
            />
            <Field
              id="medication-count"
              label={t("composer.countFrequency")}
              value={medicationCount}
              onChange={setMedicationCount}
            />
            <Field
              id="storage-method"
              label={t("composer.storageMethod")}
              value={storageMethod}
              onChange={setStorageMethod}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">{t("composer.instructions")}</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="special-note">{t("composer.specialNote")}</Label>
            <Textarea
              id="special-note"
              value={specialNote}
              onChange={(event) => setSpecialNote(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="medication-photo">
              {t("composer.medicationPhoto")}
            </Label>
            <label
              className={`grid place-items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground transition ${
                selectedChild
                  ? "cursor-pointer hover:border-primary/50"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <Upload className="h-6 w-6" />
              <span>{t("composer.choosePhoto")}</span>
              <Input
                id="medication-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={!selectedChild}
                onChange={(event) => uploadFile(event.target.files)}
              />
            </label>
            {photoMediaAssetId ? (
              <p className="text-sm text-muted-foreground">
                {t("composer.photoUploaded")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo-caption">{t("composer.photoCaption")}</Label>
            <Input
              id="photo-caption"
              value={photoCaption}
              maxLength={50}
              disabled={!photoMediaAssetId}
              onChange={(event) => setPhotoCaption(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parent-signature">
              {t("composer.parentSignature")}
            </Label>
            <Input
              id="parent-signature"
              value={parentSignature}
              onChange={(event) => setParentSignature(event.target.value)}
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <span>{t("composer.consent")}</span>
          </label>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end rounded-md border bg-background p-3 shadow-pop">
        <Button type="submit" disabled={createMutation.isPending}>
          <Send className="h-4 w-4" />
          {t("composer.saveRequest")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
