"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  DailyReportDetail,
  DailyReportItemInput,
  DailyReportItemType,
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
  initialReportDate,
}: {
  childId: string;
  initialReportDate?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reportDate, setReportDate] = useState(initialReportDate ?? todayIsoDate());
  const [mood, setMood] = useState("");
  const [healthNote, setHealthNote] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
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
        items: compactItems(items),
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
