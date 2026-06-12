"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import type {
  CalendarAudienceType,
  CalendarEventSummary,
  CalendarReminderMinutes,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { queryKeys } from "@/lib/query-keys";

const reminderOptions = [
  { value: "none", label: "No reminder" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "4320", label: "3 days before" },
] as const;

export function EventComposer({
  centerId,
  role,
  event,
}: {
  centerId: string | null;
  role: string;
  event?: CalendarEventSummary;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const director = role === "director" || role === "organization_owner";
  const [audienceType, setAudienceType] = useState<CalendarAudienceType>(
    event?.audienceType ?? (director ? "center" : "class"),
  );
  const [classId, setClassId] = useState(event?.classIds[0] ?? "");
  const [childId, setChildId] = useState(event?.childIds[0] ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [locationText, setLocationText] = useState(event?.locationText ?? "");
  const [date, setDate] = useState(
    event?.startsAt ? event.startsAt.slice(0, 10) : todayIso(),
  );
  const [startTime, setStartTime] = useState(
    event?.allDay ? "09:00" : event?.startsAt.slice(11, 16) ?? "09:00",
  );
  const [endTime, setEndTime] = useState(event?.endsAt?.slice(11, 16) ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [reminder, setReminder] = useState(
    event?.reminderMinutesBefore ? String(event.reminderMinutesBefore) : "none",
  );
  const [error, setError] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId ?? "" }),
    enabled: !!centerId,
  });

  const children = useMemo(() => {
    const rows = childrenQuery.data?.children ?? [];
    if (audienceType !== "child" || !classId) return rows;
    return rows.filter((child) => child.classId === classId);
  }, [audienceType, childrenQuery.data, classId]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        audienceType,
        classIds: audienceType === "class" && classId ? [classId] : undefined,
        childIds: audienceType === "child" && childId ? [childId] : undefined,
        title,
        description: description || undefined,
        locationText: locationText || undefined,
        startsAt: toDateTime(date, allDay ? "00:00" : startTime),
        endsAt: endTime && !allDay ? toDateTime(date, endTime) : undefined,
        allDay,
        reminderMinutesBefore: parseReminder(reminder),
      };
      return event
        ? orpc.calendar.update({ eventId: event.id, body: payload })
        : orpc.calendar.create({ centerId: centerId!, ...payload });
    },
    onSuccess: async (saved) => {
      toast.success(event ? "Event updated." : "Event created.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
      router.push(`/dashboard/calendar/${saved.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    if (!centerId) return setError("Your account is not linked to a center.");
    if (!title.trim()) return setError("Title is required.");
    if (audienceType === "center" && !director) {
      return setError("Only directors can create center-wide events.");
    }
    if (audienceType === "class" && !classId) return setError("Choose a class.");
    if (audienceType === "child" && !childId) return setError("Choose a child.");
    mutation.mutate();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/calendar">
          <ArrowLeft className="h-4 w-4" />
          Back to calendar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {event ? "Edit event" : "New event"}
          </CardTitle>
          <CardDescription>
            Add center, class, or child-specific schedule information.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="event-date">Date</Label>
              <DatePicker
                id="event-date"
                value={date}
                onValueChange={setDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-start">Start time</Label>
              <Input
                id="event-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={allDay}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-end">End time</Label>
              <Input
                id="event-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={allDay}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <Checkbox
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked === true)}
            />
            All day
          </label>

          <div className="grid gap-3">
            <Label>Audience</Label>
            <RadioGroup
              value={audienceType}
              onValueChange={(value) => {
                setAudienceType(value as CalendarAudienceType);
                setClassId("");
                setChildId("");
              }}
              className="grid gap-3 sm:grid-cols-3"
            >
              <AudienceOption
                value="center"
                label="Whole center"
                disabled={!director}
              />
              <AudienceOption value="class" label="Class" />
              <AudienceOption value="child" label="Child" />
            </RadioGroup>
          </div>

          {audienceType === "class" ? (
            <div className="grid gap-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  {(classesQuery.data ?? []).map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {klass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {audienceType === "child" ? (
            <div className="grid gap-2">
              <Label>Child</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} {child.className ? `· ${child.className}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              maxLength={300}
              placeholder="Meeting room, park, address, or map note"
            />
          </div>

          <div className="grid gap-2">
            <Label>Reminder</Label>
            <Select value={reminder} onValueChange={setReminder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-description">Details</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="h-4 w-4" />
              {event ? "Save changes" : "Create event"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function AudienceOption({
  value,
  label,
  disabled,
}: {
  value: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
      <RadioGroupItem value={value} disabled={disabled} />
      {label}
    </label>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function parseReminder(value: string): CalendarReminderMinutes | null {
  if (value === "60") return 60;
  if (value === "1440") return 1440;
  if (value === "4320") return 4320;
  return null;
}
