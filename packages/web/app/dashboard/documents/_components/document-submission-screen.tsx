"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  StudentDocumentAnswers,
  StudentDocumentAnswerValue,
  StudentDocumentField,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { SignedMedicationImage } from "../../medications/_components/signed-medication-image";
import { submissionStatusKey } from "./document-utils";

export function DocumentSubmissionScreen({
  submissionId,
}: {
  submissionId: string;
}) {
  const { t } = useLayoutTranslation("documents");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const isParent = session?.user.role === "parent";
  const [answers, setAnswers] = useState<StudentDocumentAnswers>({});
  const [correctionNote, setCorrectionNote] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.studentDocuments.submission(submissionId),
    queryFn: () =>
      isParent
        ? orpc.studentDocuments.parentSubmissionDetail({ submissionId })
        : orpc.studentDocuments.submissionDetail({ submissionId }),
  });

  const effectiveAnswers = useMemo(
    () => ({ ...(data?.answers ?? {}), ...answers }),
    [answers, data?.answers],
  );

  const saveDraft = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.parentSaveDraft({
        submissionId,
        answers: effectiveAnswers,
      }),
    onSuccess: async () => {
      toast.success(t("toast.draftSaved"));
      setAnswers({});
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const submit = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.parentSubmit({
        submissionId,
        answers: effectiveAnswers,
      }),
    onSuccess: async () => {
      toast.success(t("toast.submitted"));
      setAnswers({});
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const review = useMutation({
    mutationFn: (decision: "accepted" | "needs_correction") =>
      orpc.studentDocuments.reviewSubmission({
        submissionId,
        decision,
        correctionNote: decision === "needs_correction" ? correctionNote : undefined,
      }),
    onSuccess: async () => {
      toast.success(t("toast.reviewSaved"));
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.studentDocuments.all(),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.studentDocuments.submission(submissionId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount(),
    });
  }

  /** Open an uploaded file (PDF, image, …) in a new tab. The tab is opened
   *  synchronously on the click so popup blockers allow it, then redirected to
   *  the signed URL once it resolves. The stored content-type makes a PDF render
   *  inline instead of downloading. */
  async function openAttachment(mediaAssetId: string) {
    const tab = window.open("about:blank", "_blank");
    try {
      const signed = await orpc.media.getDownloadUrl({ mediaAssetId });
      if (tab) {
        tab.location.href = signed.downloadUrl;
      } else {
        window.open(signed.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      tab?.close();
      toast.error(toApiError(err).message);
    }
  }

  async function uploadFile(field: StudentDocumentField, event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!data || files.length === 0) return;
    setUploadingField(field.key);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, field.maxFiles ?? 5)) {
        const signed = await orpc.media.createUploadUrl({
          centerId: data.centerId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: "student_document",
        });
        await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
        uploaded.push(signed.mediaAssetId);
      }
      const current = effectiveAnswers[field.key];
      setAnswers((previous) => ({
        ...previous,
        [field.key]: [
          ...(Array.isArray(current) ? current.filter(isString) : []),
          ...uploaded,
        ],
      }));
      toast.success(t("toast.fileUploaded"));
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  }

  if (isPending) {
    return (
      <LoadingCard label={t("loading")} />
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  const editable =
    isParent &&
    ["not_started", "in_progress", "needs_correction"].includes(data.status);

  return (
    <div className="grid gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/documents">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge>{t(submissionStatusKey(data.status))}</Badge>
            {data.dueDate ? (
              <Badge variant="outline">
                {t("detail.dueDate", { date: data.dueDate })}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl">{data.requestTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.childName} {data.className ? `· ${data.className}` : ""}
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          {data.correctionNote ? (
            <Alert variant="warning">
              <AlertDescription>{data.correctionNote}</AlertDescription>
            </Alert>
          ) : null}
          {data.instructions ? (
            <p className="text-sm text-muted-foreground">{data.instructions}</p>
          ) : null}

          {data.fields.map((field) => (
            <FieldEditor
              key={field.key}
              field={field}
              value={effectiveAnswers[field.key]}
              editable={editable}
              uploading={uploadingField === field.key}
              onChange={(value) =>
                setAnswers((previous) => ({ ...previous, [field.key]: value }))
              }
              onUpload={(event) => uploadFile(field, event)}
            />
          ))}

          {data.attachments.length > 0 ? (
            <div className="grid gap-2">
              <Label>{t("detail.uploadedFiles")}</Label>
              <div className="grid gap-2">
                {data.attachments.map((attachment) => (
                  <Button
                    key={attachment.id}
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => openAttachment(attachment.mediaAssetId)}
                  >
                    {attachment.fieldKey} · {attachment.mimeType ?? t("detail.file")}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {editable ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saveDraft.isPending}
                onClick={() => saveDraft.mutate()}
              >
                {t("detail.saveDraft")}
              </Button>
              <Button
                type="button"
                disabled={submit.isPending}
                onClick={() => submit.mutate()}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("detail.submit")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isParent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("review.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={correctionNote}
              onChange={(event) => setCorrectionNote(event.target.value)}
              placeholder={t("review.correctionNote")}
              rows={3}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={review.isPending}
                onClick={() => review.mutate("needs_correction")}
              >
                {t("review.needsCorrection")}
              </Button>
              <Button
                disabled={review.isPending}
                onClick={() => review.mutate("accepted")}
              >
                {t("review.accept")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  editable,
  uploading,
  onChange,
  onUpload,
}: {
  field: StudentDocumentField;
  value: StudentDocumentAnswerValue | undefined;
  editable: boolean;
  uploading: boolean;
  onChange: (value: StudentDocumentAnswerValue) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useLayoutTranslation("documents");
  const stringValue = typeof value === "string" ? value : "";
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      {field.type === "long_text" ? (
        <Textarea
          id={field.key}
          value={stringValue}
          disabled={!editable}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value === true}
            disabled={!editable}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.helpText ?? field.label}
        </label>
      ) : field.type === "file" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={field.key}
            type="file"
            disabled={!editable || uploading}
            multiple={(field.maxFiles ?? 1) > 1}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onUpload}
          />
          <Badge variant="outline">
            {t("detail.uploadedCount", {
              count: Array.isArray(value) ? value.length : 0,
            })}
          </Badge>
          {uploading ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {t("detail.uploading")}
            </span>
          ) : null}
        </div>
      ) : field.type === "signature" && Array.isArray(value) && value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.filter(isString).map((id) => (
            <div key={id} className="overflow-hidden rounded-md border bg-white">
              <SignedMedicationImage
                mediaAssetId={id}
                className="h-24 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      ) : (
        <Input
          id={field.key}
          type={field.type === "date" ? "date" : "text"}
          value={stringValue}
          disabled={!editable}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
