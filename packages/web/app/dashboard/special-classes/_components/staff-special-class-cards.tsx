"use client";

import { CalendarPlus, Check, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClassSubjectFields } from "./class-subject-fields";

export function SpecialClassesHeader() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Special classes</CardTitle>
        <CardDescription>
          Record specialist lessons, child strengths, practice areas, videos,
          parent comments, and monthly development drafts.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export const weekdayOptions = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "7", label: "Sun" },
];

export function SetupCard({
  subjectName,
  specialistName,
  subjects,
  onSubjectNameChange,
  onSpecialistNameChange,
  onCreateSubject,
  onCreateSpecialist,
  creatingSubject,
  creatingSpecialist,
}: {
  subjectName: string;
  specialistName: string;
  subjects: Array<{ id: string; name: string }>;
  onSubjectNameChange: (value: string) => void;
  onSpecialistNameChange: (value: string) => void;
  onCreateSubject: () => void;
  onCreateSpecialist: () => void;
  creatingSubject: boolean;
  creatingSpecialist: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setup</CardTitle>
        <CardDescription>Create subjects and specialists.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Music, English, Math"
            value={subjectName}
            onChange={(event) => onSubjectNameChange(event.target.value)}
          />
          <Button
            size="icon"
            disabled={!subjectName.trim() || creatingSubject}
            onClick={onCreateSubject}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <Badge key={subject.id} variant="outline">
              {subject.name}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Specialist teacher"
            value={specialistName}
            onChange={(event) => onSpecialistNameChange(event.target.value)}
          />
          <Button
            size="icon"
            disabled={!specialistName.trim() || creatingSpecialist}
            onClick={onCreateSpecialist}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleCard({
  classId,
  subjectId,
  specialistTeacherId,
  weekdays,
  classes,
  subjects,
  specialists,
  onClassChange,
  onSubjectChange,
  onSpecialistChange,
  onWeekdaysChange,
  onCreate,
  creating,
}: {
  classId: string;
  subjectId: string;
  specialistTeacherId: string;
  weekdays: string[];
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  specialists: Array<{ id: string; fullName: string }>;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onSpecialistChange: (value: string) => void;
  onWeekdaysChange: (value: string[]) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Class plan</CardTitle>
        <CardDescription>Assign a subject to a class schedule.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ClassSubjectFields
          classId={classId}
          subjectId={subjectId}
          specialistTeacherId={specialistTeacherId}
          classes={classes}
          subjects={subjects}
          specialists={specialists}
          onClassChange={onClassChange}
          onSubjectChange={onSubjectChange}
          onSpecialistChange={onSpecialistChange}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {weekdayOptions.map((day) => {
            const checked = weekdays.includes(day.value);
            return (
              <label
                key={day.value}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    onWeekdaysChange(
                      value === true
                        ? [...weekdays, day.value]
                        : weekdays.filter((item) => item !== day.value),
                    )
                  }
                />
                {day.label}
              </label>
            );
          })}
        </div>
        <Button
          className="w-full"
          disabled={!classId || !subjectId || weekdays.length === 0 || creating}
          onClick={onCreate}
        >
          <CalendarPlus className="h-4 w-4" />
          Save fixed schedule
        </Button>
      </CardContent>
    </Card>
  );
}

export function PlannedSchedulesCard({
  selectedScheduleId,
  schedules,
  onSelect,
}: {
  selectedScheduleId: string;
  schedules: Array<{
    id: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    specialistTeacherId: string | null;
    specialistTeacherName: string | null;
    weekday: number;
    startTime: string;
    endTime: string;
  }>;
  onSelect: (schedule: {
    id: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    specialistTeacherId: string | null;
  }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fixed weekly classes</CardTitle>
        <CardDescription>
          Choose the planned special class before writing today&apos;s lesson.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No special class schedule has been created yet.
          </p>
        ) : (
          schedules.map((schedule) => (
            <button
              key={schedule.id}
              type="button"
              onClick={() => onSelect(schedule)}
              className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left transition hover:bg-muted ${
                selectedScheduleId === schedule.id ? "border-primary bg-accent" : ""
              }`}
            >
              <div>
                <p className="font-semibold">
                  {schedule.subjectName} · {schedule.className}
                </p>
                <p className="text-sm text-muted-foreground">
                  {weekdayOptions[schedule.weekday - 1]?.label ?? schedule.weekday}{" "}
                  {schedule.startTime}-{schedule.endTime}
                  {schedule.specialistTeacherName
                    ? ` · ${schedule.specialistTeacherName}`
                    : ""}
                </p>
              </div>
              {selectedScheduleId === schedule.id ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function NewLessonCard({
  sessionDate,
  sessionTitle,
  classSummary,
  canCreate,
  creating,
  onDateChange,
  onTitleChange,
  onSummaryChange,
  onCreate,
}: {
  sessionDate: string;
  sessionTitle: string;
  classSummary: string;
  canCreate: boolean;
  creating: boolean;
  onDateChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New lesson record</CardTitle>
        <CardDescription>
          The normal classroom teacher records what happened.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="date"
          value={sessionDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Input
          placeholder="Lesson title"
          value={sessionTitle}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <Textarea
          placeholder="Short class summary"
          value={classSummary}
          onChange={(event) => onSummaryChange(event.target.value)}
        />
        <Button
          className="w-full"
          disabled={!canCreate || creating}
          onClick={onCreate}
        >
          <Sparkles className="h-4 w-4" />
          Create lesson
        </Button>
      </CardContent>
    </Card>
  );
}

export function SessionsCard({
  selectedSessionId,
  sessions,
  onSelect,
}: {
  selectedSessionId: string;
  sessions: Array<{
    id: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    specialistTeacherId: string | null;
    sessionDate: string;
    title: string;
    status: string;
    observationCount: number;
    mediaCount: number;
  }>;
  onSelect: (session: {
    id: string;
    classId: string;
    subjectId: string;
    specialistTeacherId: string | null;
  }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This month</CardTitle>
        <CardDescription>
          Select a lesson, add photos/videos, write child observations, then
          publish to parents.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className={`rounded-md border p-3 text-left transition hover:bg-muted ${
              selectedSessionId === session.id ? "border-primary bg-accent" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{session.title}</p>
              <Badge
                variant={session.status === "published" ? "success" : "outline"}
              >
                {session.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.sessionDate} · {session.className} · {session.subjectName}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {session.observationCount} observations · {session.mediaCount} media
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
