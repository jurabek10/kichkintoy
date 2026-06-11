"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Plus, Save, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  DailyReportItemInput,
  DailyReportItemType,
  MediaAsset,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { reportItemTypeLabel } from "@/lib/format";
import {
  ClassParticipationSection,
  classParticipationRowsToItems,
  type ClassParticipationRow,
} from "./class-participation-section";
import { todayIsoDate } from "./report-utils";

const itemTypes: DailyReportItemType[] = [
  "meal",
  "sleep",
  "mood",
  "temperature",
  "activity",
  "health",
  "custom",
];

export function ReportComposer({
  childId,
  centerId,
  initialReportDate,
}: {
  childId: string;
  centerId?: string | null;
  initialReportDate?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reportDate, setReportDate] = useState(initialReportDate ?? todayIsoDate());
  const [mood, setMood] = useState("");
  const [healthNote, setHealthNote] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [classParticipationRows, setClassParticipationRows] = useState<
    ClassParticipationRow[]
  >([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [items, setItems] = useState<DailyReportItemInput[]>([
    { itemType: "meal", title: "Lunch", value: "", note: "" },
    { itemType: "sleep", title: "Nap", value: "", note: "" },
    { itemType: "activity", title: "Activity", value: "", note: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (mode: "draft" | "publish" | "schedule") =>
      orpc.reports.create({
        childId,
        reportDate,
        mood: mood || undefined,
        healthNote: healthNote || undefined,
        teacherNote: teacherNote || undefined,
        items: compactItems([
          ...items,
          ...classParticipationRowsToItems(classParticipationRows),
        ]),
        photoAssetIds: mediaAssets.map((asset) => asset.id),
        publish: mode === "publish",
        scheduledAt:
          mode === "schedule" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
      }),
    onSuccess: async (created, mode) => {
      toast.success(successMessage(mode));
      // Refresh teacher report lists/statuses before navigating to the new report.
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      router.push(`/dashboard/reports/${created.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const submitting = createMutation.isPending;

  function submit(mode: "draft" | "publish" | "schedule") {
    if (!childId) {
      setError("Child id is missing.");
      return;
    }
    setError(null);
    createMutation.mutate(mode);
  }

  function updateItem(index: number, patch: Partial<DailyReportItemInput>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    if (!centerId) {
      setError("Center id is missing. Open this report from the class reports page.");
      return;
    }
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
        const response = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);
        const asset = await orpc.media.completeUpload({
          mediaAssetId: signed.mediaAssetId,
        });
        uploaded.push(asset);
      }
      setMediaAssets((current) => [...current, ...uploaded]);
      if (uploaded.length > 0) toast.success(`${uploaded.length} file(s) uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function removeMedia(assetId: string) {
    setMediaAssets((current) => current.filter((asset) => asset.id !== assetId));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submit("draft");
      }}
    >
      <BackToReports />
      <ComposerHeader />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ReportBasics
        healthNote={healthNote}
        mood={mood}
        reportDate={reportDate}
        teacherNote={teacherNote}
        onHealthNoteChange={setHealthNote}
        onMoodChange={setMood}
        onReportDateChange={setReportDate}
        onTeacherNoteChange={setTeacherNote}
      />

      <ReportItems
        items={items}
        onAdd={() =>
          setItems((current) => [
            ...current,
            { itemType: "custom", title: "", value: "", note: "" },
          ])
        }
        onRemove={removeItem}
        onUpdate={updateItem}
      />

      <ClassParticipationSection
        rows={classParticipationRows}
        onChange={setClassParticipationRows}
      />

      <ReportMediaUpload
        disabled={!centerId}
        mediaAssets={mediaAssets}
        onRemove={removeMedia}
        onUpload={uploadFiles}
      />

      <ComposerActions
        scheduledAt={scheduledAt}
        submitting={submitting}
        onSchedule={() => submit("schedule")}
        onScheduledAtChange={setScheduledAt}
        onPublish={() => submit("publish")}
      />
    </form>
  );
}

function ReportMediaUpload({
  disabled,
  mediaAssets,
  onRemove,
  onUpload,
}: {
  disabled: boolean;
  mediaAssets: MediaAsset[];
  onRemove: (assetId: string) => void;
  onUpload: (files: FileList | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Photos/videos</CardTitle>
          <CardDescription>
            Attach child-safe report media. Videos can be up to 100MB.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} asChild>
          <Label className="cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload files
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
              multiple
              className="sr-only"
              onChange={(event) => {
                onUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </Label>
        </Button>
      </CardHeader>
      <CardContent>
        {disabled ? (
          <p className="text-sm text-muted-foreground">
            Open a child from the class reports page to upload report media.
          </p>
        ) : mediaAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No report media uploaded yet.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mediaAssets.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {asset.mediaType === "video" ? "Video" : "Photo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMediaSize(asset.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemove(asset.id)}
                    aria-label="Remove media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BackToReports() {
  return (
    <Link
      href="/dashboard/reports"
      className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Reports
    </Link>
  );
}

function ComposerHeader() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">New daily report</CardTitle>
        <CardDescription>
          Save a draft, publish now, or schedule for later.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ReportBasics({
  healthNote,
  mood,
  onHealthNoteChange,
  onMoodChange,
  onReportDateChange,
  onTeacherNoteChange,
  reportDate,
  teacherNote,
}: {
  healthNote: string;
  mood: string;
  onHealthNoteChange: (value: string) => void;
  onMoodChange: (value: string) => void;
  onReportDateChange: (value: string) => void;
  onTeacherNoteChange: (value: string) => void;
  reportDate: string;
  teacherNote: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-date">Date</Label>
          <Input
            id="report-date"
            type="date"
            value={reportDate}
            onChange={(event) => onReportDateChange(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mood">Mood</Label>
          <Input
            id="mood"
            value={mood}
            onChange={(event) => onMoodChange(event.target.value)}
            placeholder="Happy, calm, tired..."
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="teacher-note">Teacher note</Label>
          <Textarea
            id="teacher-note"
            value={teacherNote}
            onChange={(event) => onTeacherNoteChange(event.target.value)}
            placeholder="Share the child's day with parents."
            rows={5}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="health-note">Health note</Label>
          <Textarea
            id="health-note"
            value={healthNote}
            onChange={(event) => onHealthNoteChange(event.target.value)}
            placeholder="Optional health notes."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ReportItems({
  items,
  onAdd,
  onRemove,
  onUpdate,
}: {
  items: DailyReportItemInput[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<DailyReportItemInput>) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Items</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item, index) => (
          <ReportItemEditor
            key={index}
            index={index}
            item={item}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ReportItemEditor({
  index,
  item,
  onRemove,
  onUpdate,
}: {
  index: number;
  item: DailyReportItemInput;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<DailyReportItemInput>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[160px_1fr_1fr_auto]">
      <Select
        value={item.itemType}
        onValueChange={(value) =>
          onUpdate(index, { itemType: value as DailyReportItemType })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {itemTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {reportItemTypeLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={item.title ?? ""}
        onChange={(event) => onUpdate(index, { title: event.target.value })}
        placeholder="Title"
      />
      <Input
        value={item.value ?? ""}
        onChange={(event) => onUpdate(index, { value: event.target.value })}
        placeholder="Value"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Textarea
        className="sm:col-span-4"
        value={item.note ?? ""}
        onChange={(event) => onUpdate(index, { note: event.target.value })}
        placeholder="Note"
      />
    </div>
  );
}

function ComposerActions({
  onPublish,
  onSchedule,
  onScheduledAtChange,
  scheduledAt,
  submitting,
}: {
  onPublish: () => void;
  onSchedule: () => void;
  onScheduledAtChange: (value: string) => void;
  scheduledAt: string;
  submitting: boolean;
}) {
  return (
    <Card className="sticky bottom-4">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Label htmlFor="schedule-at">Schedule time</Label>
          <Input
            id="schedule-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => onScheduledAtChange(event.target.value)}
            className="w-[230px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" disabled={submitting}>
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting || !scheduledAt}
            onClick={onSchedule}
          >
            Schedule
          </Button>
          <Button type="button" disabled={submitting} onClick={onPublish}>
            <Send className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function compactItems(items: DailyReportItemInput[]) {
  return items.filter(
    (item) =>
      item.title?.trim() ||
      item.value?.trim() ||
      item.note?.trim() ||
      item.itemType === "mood",
  );
}

function successMessage(mode: "draft" | "publish" | "schedule") {
  if (mode === "publish") return "Report published.";
  if (mode === "schedule") return "Report scheduled.";
  return "Draft saved.";
}

function formatMediaSize(sizeBytes: number | null) {
  if (!sizeBytes) return "Uploaded";
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}
