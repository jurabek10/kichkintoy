"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { MediaAsset } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
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
import {
  ClassParticipationSection,
  classParticipationRowsToItems,
  type ClassParticipationRow,
} from "./class-participation-section";
import { todayIsoDate } from "./report-utils";

// ─── Dropdown option keys ────────────────────────────────────────────────────

const moodOptionKeys = ["happy", "calm", "tired", "sad", "irritable", "excited"] as const;
const mealOptionKeys = ["all", "most", "half", "little", "none"] as const;
const sleepOptionKeys = ["well_2h", "well_1h30", "well_1h", "briefly", "no_sleep", "restless"] as const;
const activityOptionKeys = ["very_active", "active", "moderate", "passive", "solo"] as const;
const healthOptionKeys = ["healthy", "slight_fever", "cough", "stomach", "unwell"] as const;

// ─── State shape ─────────────────────────────────────────────────────────────

type ObservationState = {
  mood: string;
  breakfast: string;
  lunch: string;
  snack: string;
  sleep: string;
  activity: string;
  healthStatus: string;
  healthNote: string;
};

function emptyObservations(): ObservationState {
  return {
    mood: "",
    breakfast: "",
    lunch: "",
    snack: "",
    sleep: "",
    activity: "",
    healthStatus: "",
    healthNote: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportComposer({
  childId,
  childName,
  centerId,
  initialReportDate,
}: {
  childId: string;
  childName?: string | null;
  centerId?: string | null;
  initialReportDate?: string | null;
}) {
  const { t, i18n } = useLayoutTranslation("reports");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [reportDate, setReportDate] = useState(initialReportDate ?? todayIsoDate());
  const [obs, setObs] = useState<ObservationState>(emptyObservations);
  const [teacherNote, setTeacherNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [classParticipationRows, setClassParticipationRows] = useState<ClassParticipationRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof ObservationState>(key: K, value: ObservationState[K]) {
    setObs((prev) => ({ ...prev, [key]: value }));
  }

  // Build items array from dropdown state for saving. Titles and values are
  // stored as language-neutral tokens ("breakfast", "half") — never display
  // text — so each parent reads the report in their own language. See
  // report-item-i18n.ts for the render-time translation.
  function buildItems() {
    const items: Array<{ itemType: "meal" | "sleep" | "activity" | "health" | "class_participation"; title?: string; value?: string; note?: string }> = [];
    if (obs.breakfast) items.push({ itemType: "meal", title: "breakfast", value: obs.breakfast });
    if (obs.lunch)     items.push({ itemType: "meal", title: "lunch",     value: obs.lunch });
    if (obs.snack)     items.push({ itemType: "meal", title: "snack",     value: obs.snack });
    if (obs.sleep)     items.push({ itemType: "sleep", title: "nap",      value: obs.sleep });
    if (obs.activity)  items.push({ itemType: "activity", title: "mainActivity", value: obs.activity });
    if (obs.healthStatus) items.push({ itemType: "health", value: obs.healthStatus, note: obs.healthNote || undefined });
    for (const raw of classParticipationRowsToItems(classParticipationRows)) {
      items.push({ itemType: raw.itemType as "class_participation", title: raw.title ?? undefined, value: raw.value ?? undefined, note: raw.note ?? undefined });
    }
    return items;
  }

  const createMutation = useMutation({
    mutationFn: (mode: "draft" | "publish" | "schedule") =>
      orpc.reports.create({
        childId,
        reportDate,
        mood: obs.mood || undefined,
        healthNote: obs.healthNote || undefined,
        teacherNote: teacherNote || undefined,
        items: buildItems(),
        photoAssetIds: mediaAssets.map((a) => a.id),
        publish: mode === "publish",
        scheduledAt:
          mode === "schedule" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
      }),
    onSuccess: async (created, mode) => {
      toast.success(successMessage(mode, t));
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      router.push(`/dashboard/reports/${created.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const submitting = createMutation.isPending;

  function submit(mode: "draft" | "publish" | "schedule") {
    if (!childId) { setError(t("composer.childIdMissing")); return; }
    setError(null);
    createMutation.mutate(mode);
  }

  async function generateWithAI() {
    if (teacherNote.trim() && !window.confirm(t("composer.replaceNote"))) return;

    const language = i18n.language === "ru" ? "ru" : "uz";
    const placeholder = language === "ru" ? "ребёнок" : "bola";

    // The stored state holds tokens; translate them to readable labels in the
    // note's language so the AI has real words to work with, not "half".
    const aiItems: Array<{ itemType: "meal" | "sleep" | "activity" | "health"; title?: string; value?: string }> = [];
    if (obs.breakfast) aiItems.push({ itemType: "meal", title: t("composer.breakfast"), value: t(`composer.mealOptions.${obs.breakfast}`) });
    if (obs.lunch)     aiItems.push({ itemType: "meal", title: t("composer.lunch"),     value: t(`composer.mealOptions.${obs.lunch}`) });
    if (obs.snack)     aiItems.push({ itemType: "meal", title: t("composer.snack"),     value: t(`composer.mealOptions.${obs.snack}`) });
    if (obs.sleep)     aiItems.push({ itemType: "sleep", title: t("composer.nap"),      value: t(`composer.sleepOptions.${obs.sleep}`) });
    if (obs.activity)  aiItems.push({ itemType: "activity", title: t("composer.mainActivity"), value: t(`composer.activityOptions.${obs.activity}`) });
    if (obs.healthStatus) aiItems.push({ itemType: "health", value: t(`composer.healthOptions.${obs.healthStatus}`) });

    const participation = classParticipationRows
      .filter((row) => row.subject.trim() || row.customSubject.trim())
      .map((row) => ({
        subject: row.subject === "Other" ? row.customSubject : row.subject,
        level: row.participation,
        interest: row.interest,
        strengths: row.strengths || undefined,
        needsPractice: row.needsPractice || undefined,
      }));

    setAiGenerating(true);
    try {
      const result = await orpc.reports.generateNote({
        language,
        mood: obs.mood ? t(`composer.moodOptions.${obs.mood}`) : undefined,
        items: aiItems.length > 0 ? aiItems : undefined,
        classParticipation: participation.length > 0 ? participation : undefined,
      });
      const name = childName?.trim() || placeholder;
      setTeacherNote(
        formatGeneratedNote({
          note: result.teacherNote,
          placeholder,
          childName: name,
          language,
          hasMedia: mediaAssets.length > 0,
        }),
      );
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    if (!centerId) { setError(t("composer.centerIdMissing")); return; }
    setError(null);
    try {
      const uploaded: MediaAsset[] = [];
      for (const file of Array.from(files).slice(0, 20 - mediaAssets.length)) {
        const signed = await orpc.media.createUploadUrl({
          centerId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: "daily_report",
        });
        const res = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(t("composer.uploadFailedFor", { file: file.name }));
        uploaded.push(await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId }));
      }
      setMediaAssets((cur) => [...cur, ...uploaded]);
      if (uploaded.length > 0) toast.success(t("composer.filesUploaded", { count: uploaded.length }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("composer.uploadFailed"));
    }
  }

  const hasObservations =
    !!obs.mood || !!obs.breakfast || !!obs.lunch || !!obs.snack ||
    !!obs.sleep || !!obs.activity || !!obs.healthStatus ||
    classParticipationRows.some((r) => r.subject || r.customSubject);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); submit("draft"); }}
    >
      {/* Back link */}
      <Link
        href="/dashboard/reports"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("composer.newReport")}</CardTitle>
          <CardDescription>{t("composer.description")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-2 max-w-xs">
            <Label htmlFor="report-date">{t("composer.date")}</Label>
            <DatePicker id="report-date" value={reportDate} onValueChange={setReportDate} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Day Observations — all dropdowns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("composer.dayObservations")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mood */}
          <ObservationDropdown
            label={t("detail.mood")}
            value={obs.mood}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("mood", v)}
            options={moodOptionKeys.map((k) => ({ value: k, label: t(`composer.moodOptions.${k}`) }))}
          />
          {/* Breakfast */}
          <ObservationDropdown
            label={t("composer.breakfast")}
            value={obs.breakfast}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("breakfast", v)}
            options={mealOptionKeys.map((k) => ({ value: k, label: t(`composer.mealOptions.${k}`) }))}
          />
          {/* Lunch */}
          <ObservationDropdown
            label={t("composer.lunch")}
            value={obs.lunch}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("lunch", v)}
            options={mealOptionKeys.map((k) => ({ value: k, label: t(`composer.mealOptions.${k}`) }))}
          />
          {/* Snack */}
          <ObservationDropdown
            label={t("composer.snack")}
            value={obs.snack}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("snack", v)}
            options={mealOptionKeys.map((k) => ({ value: k, label: t(`composer.mealOptions.${k}`) }))}
          />
          {/* Sleep */}
          <ObservationDropdown
            label={t("composer.nap")}
            value={obs.sleep}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("sleep", v)}
            options={sleepOptionKeys.map((k) => ({ value: k, label: t(`composer.sleepOptions.${k}`) }))}
          />
          {/* Activity */}
          <ObservationDropdown
            label={t("composer.mainActivity")}
            value={obs.activity}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("activity", v)}
            options={activityOptionKeys.map((k) => ({ value: k, label: t(`composer.activityOptions.${k}`) }))}
          />
          {/* Health status */}
          <ObservationDropdown
            label={t("composer.healthStatus")}
            value={obs.healthStatus}
            placeholder={t("composer.selectOption")}
            onChange={(v) => setField("healthStatus", v)}
            options={healthOptionKeys.map((k) => ({ value: k, label: t(`composer.healthOptions.${k}`) }))}
          />
          {/* Health note — only when there is something to note */}
          {obs.healthStatus && obs.healthStatus !== "healthy" && (
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="health-note">{t("composer.healthNoteLabel")}</Label>
              <Textarea
                id="health-note"
                value={obs.healthNote}
                onChange={(e) => setField("healthNote", e.target.value)}
                placeholder={t("composer.healthNotePlaceholderShort")}
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Participation — stays fully manual */}
      <ClassParticipationSection
        rows={classParticipationRows}
        onChange={setClassParticipationRows}
      />

      {/* Media Upload */}
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("composer.photosVideos")}</CardTitle>
            <CardDescription>{t("composer.mediaDescription")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!centerId} asChild>
            <Label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              {t("composer.uploadFiles")}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
                multiple
                className="sr-only"
                onChange={(e) => { uploadFiles(e.target.files); e.currentTarget.value = ""; }}
              />
            </Label>
          </Button>
        </CardHeader>
        {mediaAssets.length > 0 && (
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {mediaAssets.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {asset.mediaType === "video" ? t("composer.video") : t("composer.photo")}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatMediaSize(asset.sizeBytes, t)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <Button
                      type="button" size="icon" variant="ghost"
                      onClick={() => setMediaAssets((cur) => cur.filter((a) => a.id !== asset.id))}
                      aria-label={t("composer.removeMedia")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      {/* ── AI-generated teacher note — LAST content section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("composer.aiNoteTitle")}</CardTitle>
          <CardDescription>{t("composer.aiNoteDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            id="teacher-note"
            value={teacherNote}
            readOnly={aiGenerating}
            onChange={(e) => setTeacherNote(e.target.value)}
            placeholder={t("composer.teacherNotePlaceholder")}
            rows={6}
          />
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-fit"
            disabled={aiGenerating || !hasObservations}
            onClick={generateWithAI}
          >
            {aiGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {aiGenerating ? t("composer.generating") : t("composer.generateWithAI")}
          </Button>
        </CardContent>
      </Card>

      {/* Sticky actions */}
      <Card className="sticky bottom-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Label htmlFor="schedule-at">{t("composer.scheduleTime")}</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-[230px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={submitting}>
              <Save className="h-4 w-4" />
              {t("composer.saveDraft")}
            </Button>
            <Button type="button" variant="outline" disabled={submitting || !scheduledAt} onClick={() => submit("schedule")}>
              {t("composer.schedule")}
            </Button>
            <Button type="button" disabled={submitting} onClick={() => submit("publish")}>
              <Send className="h-4 w-4" />
              {t("composer.publish")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Reusable dropdown ────────────────────────────────────────────────────────

function ObservationDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function successMessage(mode: "draft" | "publish" | "schedule", t: TFunction<"reports">) {
  if (mode === "publish") return t("detail.reportPublished");
  if (mode === "schedule") return t("composer.reportScheduled");
  return t("composer.draftSaved");
}

function formatMediaSize(sizeBytes: number | null, t: TFunction<"reports">) {
  if (!sizeBytes) return t("composer.uploaded");
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function formatGeneratedNote({
  note,
  placeholder,
  childName,
  language,
  hasMedia,
}: {
  note: string;
  placeholder: string;
  childName: string;
  language: "uz" | "ru";
  hasMedia: boolean;
}) {
  const personalized = note
    .trim()
    .replace(new RegExp(placeholder, "gi"), childName);
  const greeting = pickVariant(
    language === "ru"
      ? [
          `Здравствуйте, родители ${childName}.`,
          `Добрый день, семья ${childName}.`,
          `Здравствуйте, мама и папа ${childName}.`,
        ]
      : [
          `Assalomu alaykum, ${childName}ning ota-onasi. 😊`,
          `Assalomu alaykum, ${childName}ning aziz yaqinlari. 🌿`,
          `Assalomu alaykum, ${childName}ning onasi va otasi. 😊`,
        ],
  );
  const mediaNote = hasMedia
    ? pickVariant(
        language === "ru"
          ? [
              "Сегодняшние фото и видео тоже прикрепляю, чтобы вы могли увидеть моменты дня.",
              "К отчёту добавила фото и видео с сегодняшнего дня.",
              "Несколько сегодняшних фото и видео отправляю вместе с отчётом.",
            ]
          : [
              "Bugungi kundan rasm va videolarni ham biriktirdim, ko'rib quvonasiz degan umiddaman. 📷",
              "Hisobotga bugungi jarayondan bir nechta rasm va videolarni ham qo'shdim. 🎥",
              "Bugungi kunidan kichik lavhalar sifatida rasm va videolarni ham yuboryapman. 📷",
            ],
      )
    : null;

  return [greeting, personalized, mediaNote].filter(Boolean).join("\n\n");
}

function pickVariant(values: string[]) {
  return values[Math.floor(Math.random() * values.length)] ?? values[0] ?? "";
}
