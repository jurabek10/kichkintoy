"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  ClassParticipationInterest,
  ClassParticipationLevel,
  ClassParticipationNote,
  DailyReportItemInput,
} from "@kichkintoy/shared";
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
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import {
  participationInterestLabel,
  participationLevelLabel,
} from "@/lib/format";

export type ClassParticipationRow = {
  id: string;
  subject: string;
  customSubject: string;
  participation: ClassParticipationLevel;
  interest: ClassParticipationInterest;
  strengths: string;
  needsPractice: string;
  homeSuggestion: string;
  teacherNote: string;
};

const subjectOptions = [
  "English",
  "Russian",
  "Uzbek",
  "Math",
  "Music",
  "Art",
  "PE",
  "Speech",
  "Reading",
  "Logic",
  "Dance",
  "Other",
] as const;

const participationOptions: ClassParticipationLevel[] = [
  "excellent",
  "good",
  "needs_support",
  "not_observed",
  "absent",
];

const interestOptions: ClassParticipationInterest[] = [
  "high",
  "medium",
  "low",
  "not_observed",
];

export function ClassParticipationSection({
  rows,
  onChange,
}: {
  rows: ClassParticipationRow[];
  onChange: (rows: ClassParticipationRow[]) => void;
}) {
  const { t } = useLayoutTranslation("reports");

  function addRow() {
    onChange([...rows, createClassParticipationRow()]);
  }

  function updateRow(id: string, patch: Partial<ClassParticipationRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{t("participation.title")}</CardTitle>
          <CardDescription>{t("participation.description")}</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {t("participation.addSubject")}
        </Button>
      </CardHeader>
      {rows.length > 0 ? (
        <CardContent className="flex flex-col gap-3">
          {rows.map((row) => (
            <ClassParticipationEditor
              key={row.id}
              row={row}
              onRemove={() => removeRow(row.id)}
              onUpdate={(patch) => updateRow(row.id, patch)}
            />
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ClassParticipationEditor({
  onRemove,
  onUpdate,
  row,
}: {
  onRemove: () => void;
  onUpdate: (patch: Partial<ClassParticipationRow>) => void;
  row: ClassParticipationRow;
}) {
  const { t } = useLayoutTranslation("reports");
  const customSubject = row.subject === "Other";

  return (
    <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-4">
      <div className="flex flex-col gap-2">
        <Label>{t("participation.subject")}</Label>
        <Select
          value={row.subject}
          onValueChange={(subject) => onUpdate({ subject })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {t(`participation.subjects.${subject}`, subject)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t("participation.participation")}</Label>
        <Select
          value={row.participation}
          onValueChange={(participation) =>
            onUpdate({ participation: participation as ClassParticipationLevel })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {participationOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {t(
                  `participationLevels.${value}`,
                  participationLevelLabel(value),
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t("participation.interest")}</Label>
        <Select
          value={row.interest}
          onValueChange={(interest) =>
            onUpdate({ interest: interest as ClassParticipationInterest })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {interestOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {t(
                  `participationInterests.${value}`,
                  participationInterestLabel(value),
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t("participation.removeSubject")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {customSubject ? (
        <div className="flex flex-col gap-2 lg:col-span-4">
          <Label>{t("participation.customSubject")}</Label>
          <Input
            value={row.customSubject}
            onChange={(event) => onUpdate({ customSubject: event.target.value })}
            placeholder={t("participation.subjectName")}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>{t("participation.strengths")}</Label>
        <Input
          value={row.strengths}
          onChange={(event) => onUpdate({ strengths: event.target.value })}
          placeholder={t("participation.strengthsPlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>{t("participation.needsPractice")}</Label>
        <Input
          value={row.needsPractice}
          onChange={(event) => onUpdate({ needsPractice: event.target.value })}
          placeholder={t("participation.needsPracticePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>{t("participation.homeSuggestion")}</Label>
        <Input
          value={row.homeSuggestion}
          onChange={(event) => onUpdate({ homeSuggestion: event.target.value })}
          placeholder={t("participation.homeSuggestionPlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-2 lg:col-span-2">
        <Label>{t("participation.teacherNote")}</Label>
        <Textarea
          value={row.teacherNote}
          onChange={(event) => onUpdate({ teacherNote: event.target.value })}
          placeholder={t("participation.teacherNotePlaceholder")}
          rows={2}
        />
      </div>
    </div>
  );
}

export function createClassParticipationRow(): ClassParticipationRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    subject: "English",
    customSubject: "",
    participation: "good",
    interest: "medium",
    strengths: "",
    needsPractice: "",
    homeSuggestion: "",
    teacherNote: "",
  };
}

export function classParticipationRowsToItems(
  rows: ClassParticipationRow[],
): DailyReportItemInput[] {
  return rows
    .map((row) => {
      const subject =
        row.subject === "Other" ? row.customSubject.trim() : row.subject.trim();
      const note: ClassParticipationNote = {
        interest: row.interest,
        strengths: blankToUndefined(row.strengths),
        needsPractice: blankToUndefined(row.needsPractice),
        homeSuggestion: blankToUndefined(row.homeSuggestion),
        teacherNote: blankToUndefined(row.teacherNote),
      };
      return {
        itemType: "class_participation" as const,
        title: subject,
        value: row.participation,
        note: JSON.stringify(note),
      };
    })
    .filter((item) => item.title.trim());
}

function blankToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
