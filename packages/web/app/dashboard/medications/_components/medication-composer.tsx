"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  PenLine,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { useSelectedChild } from "@/lib/selected-child";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { SignaturePad } from "./signature-pad";

const SIGNATURE_MEDIA_PREFIX = "media:";

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
  const [consent, setConsent] = useState(false);

  const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [signatureAssetId, setSignatureAssetId] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signOpen, setSignOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: audience } = useQuery({
    queryKey: queryKeys.medications.children(),
    queryFn: () => orpc.medications.children({}),
  });

  // Default to the globally selected kid (header switcher).
  const { childId: selectedChildId } = useSelectedChild();
  useEffect(() => {
    if (childId || !audience) return;
    const preferred =
      audience.children.find((c) => c.id === selectedChildId) ??
      audience.children[0];
    if (preferred) setChildId(preferred.id);
  }, [audience, childId, selectedChildId]);

  const selectedChild = audience?.children.find((item) => item.id === childId);

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.medications.create({
        childId,
        requestedForDate,
        symptoms: symptoms.trim(),
        medicineName: medicineName.trim(),
        medicationType: medicationType.trim(),
        dosage: dosage.trim(),
        medicationTime: medicationTime.trim(),
        medicationCount: medicationCount.trim() || undefined,
        storageMethod: storageMethod.trim() || undefined,
        instructions: instructions.trim() || undefined,
        specialNote: specialNote.trim() || undefined,
        photoMediaAssetId: photoAssetId ?? undefined,
        parentSignature: `${SIGNATURE_MEDIA_PREFIX}${signatureAssetId}`,
        consent: true,
      }),
    onSuccess: async (request) => {
      setConfirming(false);
      toast.success(t("toast.requestSent"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.medications.all(),
      });
      router.push(`/dashboard/medications/${request.id}`);
    },
    onError: (err) => {
      setConfirming(false);
      setError(toApiError(err).message);
    },
  });

  /** Upload a file to the selected child's center; returns the asset id. */
  async function uploadAsset(file: File): Promise<string> {
    if (!selectedChild) throw new Error(t("validation.childRequired"));
    const signed = await orpc.media.createUploadUrl({
      centerId: selectedChild.centerId,
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
      throw new Error(t("validation.uploadFailedForFile", { file: file.name }));
    }
    const asset = await orpc.media.completeUpload({
      mediaAssetId: signed.mediaAssetId,
    });
    return asset.id;
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!selectedChild) return setError(t("validation.chooseChildBeforeUpload"));
    setError(null);
    setPhotoUploading(true);
    try {
      const id = await uploadAsset(file);
      setPhotoAssetId(id);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      toast.success(t("toast.photoUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("validation.uploadFailed"));
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSignature(file: File) {
    if (!selectedChild) return setError(t("validation.childRequired"));
    setError(null);
    setSignatureUploading(true);
    try {
      const id = await uploadAsset(file);
      setSignatureAssetId(id);
      setSignaturePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("validation.uploadFailed"));
    } finally {
      setSignatureUploading(false);
    }
  }

  /** Validate, then open the confirm step — never submit directly. */
  function review() {
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
    if (!signatureAssetId) return setError(t("validation.signatureRequired"));
    if (!consent) return setError(t("validation.consentRequired"));
    setConfirming(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/medications">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-coral text-coral-ink">
          <PenLine className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {t("composer.newTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("composer.description")}
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Section title={t("sections.who")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>
              {t("composer.child")} <RequiredMark />
            </Label>
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
          <div className="grid gap-1.5">
            <Label htmlFor="medication-date">{t("composer.date")}</Label>
            <DatePicker
              id="medication-date"
              value={requestedForDate}
              onValueChange={setRequestedForDate}
            />
          </div>
        </div>
      </Section>

      <Section title={t("sections.medicine")}>
        <Field label={t("composer.symptoms")} required>
          <Textarea
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            rows={3}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("composer.medicineName")}
            value={medicineName}
            onChange={setMedicineName}
            required
          />
          <TextField
            label={t("composer.medicationType")}
            value={medicationType}
            onChange={setMedicationType}
            required
          />
          <TextField
            label={t("composer.dosage")}
            value={dosage}
            onChange={setDosage}
            required
          />
          <TextField
            label={t("composer.medicationTime")}
            value={medicationTime}
            onChange={setMedicationTime}
            required
          />
          <TextField
            label={t("composer.countFrequency")}
            value={medicationCount}
            onChange={setMedicationCount}
          />
          <TextField
            label={t("composer.storageMethod")}
            value={storageMethod}
            onChange={setStorageMethod}
          />
        </div>

        <Field label={t("composer.medicationPhoto")}>
          {photoPreview ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt=""
                className="h-16 w-16 rounded-xl border object-cover"
              />
              <label className="cursor-pointer text-sm font-semibold text-coral-ink hover:underline">
                {t("composer.changePhoto")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={photoUploading}
                  onChange={(event) => pickPhoto(event.target.files)}
                />
              </label>
            </div>
          ) : (
            <label
              className={cn(
                "grid place-items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground transition",
                selectedChild
                  ? "cursor-pointer hover:border-coral-ink/50"
                  : "cursor-not-allowed opacity-60",
              )}
            >
              {photoUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-coral-ink" />
              ) : (
                <Camera className="h-6 w-6 text-coral-ink" />
              )}
              <span>
                {photoUploading
                  ? t("composer.uploading")
                  : t("composer.addPhoto")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={!selectedChild || photoUploading}
                onChange={(event) => pickPhoto(event.target.files)}
              />
            </label>
          )}
        </Field>
      </Section>

      <Section title={t("sections.notes")}>
        <Field label={t("composer.instructions")}>
          <Textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
          />
        </Field>
        <Field label={t("composer.specialNote")}>
          <Textarea
            value={specialNote}
            onChange={(event) => setSpecialNote(event.target.value)}
            rows={3}
          />
        </Field>
      </Section>

      <Section title={t("sections.authorize")}>
        <Field label={t("composer.parentSignature")} required>
          {signaturePreview ? (
            <div className="flex flex-col gap-2">
              <div className="grid h-28 place-items-center rounded-2xl border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signaturePreview}
                  alt=""
                  className="h-full w-auto object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => setSignOpen(true)}
                disabled={signatureUploading}
                className="self-start text-sm font-semibold text-coral-ink hover:underline"
              >
                {t("composer.reSign")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                selectedChild
                  ? setSignOpen(true)
                  : setError(t("validation.childRequired"))
              }
              disabled={signatureUploading}
              className="grid h-28 w-full place-items-center gap-2 rounded-2xl border border-dashed border-coral-ink/60 bg-coral/40 text-coral-ink transition hover:bg-coral/60"
            >
              {signatureUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PenLine className="h-6 w-6" />
              )}
              <span className="text-sm font-semibold">
                {signatureUploading
                  ? t("composer.uploading")
                  : t("composer.tapToSign")}
              </span>
            </button>
          )}
        </Field>

        <button
          type="button"
          onClick={() => setConsent((value) => !value)}
          className="flex items-start gap-3 rounded-2xl bg-coral/40 p-3.5 text-left"
        >
          <span
            className={cn(
              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-coral-ink transition",
              consent ? "bg-coral-ink text-white" : "bg-background",
            )}
          >
            {consent ? <Check className="h-4 w-4" /> : null}
          </span>
          <span className="text-sm leading-5">{t("composer.consent")}</span>
        </button>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border bg-background/95 p-3 shadow-pop backdrop-blur">
        <Button onClick={review} disabled={createMutation.isPending}>
          <Send className="h-4 w-4" />
          {t("composer.saveRequest")}
        </Button>
      </div>

      <SignaturePad
        open={signOpen}
        onOpenChange={setSignOpen}
        onSave={handleSignature}
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("confirm.title")}
        body={t("confirm.body")}
        summary={[
          { label: t("composer.child"), value: selectedChild?.name ?? "" },
          { label: t("composer.date"), value: formatDate(requestedForDate) },
          { label: t("composer.medicineName"), value: medicineName },
          { label: t("composer.dosage"), value: dosage },
          { label: t("composer.medicationTime"), value: medicationTime },
        ]}
        confirmLabel={t("confirm.yes")}
        cancelLabel={t("confirm.no")}
        loading={createMutation.isPending}
        onConfirm={() => createMutation.mutate()}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-coral-ink">
          {title}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label} required={required}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function RequiredMark() {
  return <span className="text-coral-ink"> *</span>;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
