"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { SignedSpecialMedia } from "./signed-special-media";
import {
  ScheduleCard,
  SessionsCard,
  SetupCard,
  SpecialClassesHeader,
  weekdayOptions,
} from "./staff-special-class-cards";
import { invalidateSpecial, monthEnd, monthStart, todayIso } from "./special-class-utils";

export function DirectorSpecialClasses({ centerId }: { centerId: string | null }) {
  const queryClient = useQueryClient();
  const [subjectName, setSubjectName] = useState("");
  const [specialistName, setSpecialistName] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [specialistTeacherId, setSpecialistTeacherId] = useState("none");
  const [weekdays, setWeekdays] = useState(["2", "4"]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const classesQuery = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const subjectsQuery = useQuery({
    queryKey: queryKeys.specialClasses.subjects(centerId ?? ""),
    queryFn: () => orpc.specialClasses.subjects({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const specialistsQuery = useQuery({
    queryKey: queryKeys.specialClasses.specialists(centerId ?? ""),
    queryFn: () => orpc.specialClasses.specialists({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const schedulesQuery = useQuery({
    queryKey: queryKeys.specialClasses.schedules({
      centerId: centerId ?? "",
      status: "active",
    }),
    queryFn: () =>
      orpc.specialClasses.schedules({
        centerId: centerId!,
        status: "active",
      }),
    enabled: !!centerId,
  });

  const sessionsInput = {
    centerId: centerId ?? "",
    from: monthStart(),
    to: monthEnd(),
  };
  const sessionsQuery = useQuery({
    queryKey: queryKeys.specialClasses.staffSessions(sessionsInput),
    queryFn: () =>
      orpc.specialClasses.staffSessions({
        centerId: centerId!,
        from: sessionsInput.from,
        to: sessionsInput.to,
      }),
    enabled: !!centerId,
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.specialClasses.session(selectedSessionId),
    queryFn: () =>
      orpc.specialClasses.sessionDetail({ sessionId: selectedSessionId }),
    enabled: !!selectedSessionId,
  });

  const createSubject = useMutation({
    mutationFn: () =>
      orpc.specialClasses.createSubject({
        centerId: centerId!,
        name: subjectName,
      }),
    onSuccess: async (subject) => {
      setSubjectName("");
      setSubjectId(subject.id);
      await invalidateSpecial(queryClient);
    },
  });

  const createSpecialist = useMutation({
    mutationFn: () =>
      orpc.specialClasses.createSpecialist({
        centerId: centerId!,
        fullName: specialistName,
      }),
    onSuccess: async (specialist) => {
      setSpecialistName("");
      setSpecialistTeacherId(specialist.id);
      await invalidateSpecial(queryClient);
    },
  });

  const createSchedules = useMutation({
    mutationFn: async () => {
      await Promise.all(
        weekdays.map((weekday) =>
          orpc.specialClasses.createSchedule({
            centerId: centerId!,
            classId,
            subjectId,
            specialistTeacherId:
              specialistTeacherId === "none" ? undefined : specialistTeacherId,
            weekday: Number(weekday),
            startTime: "10:00",
            endTime: "10:40",
            startDate: todayIso(),
            payrollType: "per_session",
            payrollAmount: 0,
          }),
        ),
      );
    },
    onSuccess: () => invalidateSpecial(queryClient),
  });

  const classRows = useMemo(
    () =>
      (classesQuery.data ?? []).map((klass) => {
        const children = (childrenQuery.data?.children ?? []).filter(
          (child) => child.classId === klass.id,
        );
        const schedules = (schedulesQuery.data ?? []).filter(
          (schedule) => schedule.classId === klass.id,
        );
        const sessions = (sessionsQuery.data ?? []).filter(
          (session) => session.classId === klass.id,
        );
        return {
          classId: klass.id,
          className: klass.name,
          childrenCount: children.length,
          scheduleText: schedules
            .map(
              (schedule) =>
                `${schedule.subjectName} ${weekdayOptions[schedule.weekday - 1]?.label ?? schedule.weekday}`,
            )
            .join(", "),
          sessionsCount: sessions.length,
          publishedCount: sessions.filter((session) => session.status === "published")
            .length,
          observationCount: sessions.reduce(
            (sum, session) => sum + session.observationCount,
            0,
          ),
          mediaCount: sessions.reduce((sum, session) => sum + session.mediaCount, 0),
        };
      }),
    [classesQuery.data, childrenQuery.data?.children, schedulesQuery.data, sessionsQuery.data],
  );

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  const error =
    classesQuery.error ??
    childrenQuery.error ??
    subjectsQuery.error ??
    specialistsQuery.error ??
    schedulesQuery.error ??
    sessionsQuery.error ??
    sessionQuery.error ??
    createSubject.error ??
    createSpecialist.error ??
    createSchedules.error;

  return (
    <div className="flex flex-col gap-4">
      <SpecialClassesHeader />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <SetupCard
            subjectName={subjectName}
            specialistName={specialistName}
            subjects={subjectsQuery.data ?? []}
            onSubjectNameChange={setSubjectName}
            onSpecialistNameChange={setSpecialistName}
            onCreateSubject={() => createSubject.mutate()}
            onCreateSpecialist={() => createSpecialist.mutate()}
            creatingSubject={createSubject.isPending}
            creatingSpecialist={createSpecialist.isPending}
          />
          <ScheduleCard
            classId={classId}
            subjectId={subjectId}
            specialistTeacherId={specialistTeacherId}
            weekdays={weekdays}
            classes={classesQuery.data ?? []}
            subjects={subjectsQuery.data ?? []}
            specialists={specialistsQuery.data ?? []}
            onClassChange={setClassId}
            onSubjectChange={setSubjectId}
            onSpecialistChange={setSpecialistTeacherId}
            onWeekdaysChange={setWeekdays}
            onCreate={() => createSchedules.mutate()}
            creating={createSchedules.isPending}
          />
        </div>

        <div className="flex flex-col gap-4">
          <DirectorClassTable rows={classRows} />
          <SessionsCard
            selectedSessionId={selectedSessionId}
            sessions={sessionsQuery.data ?? []}
            onSelect={(session) => setSelectedSessionId(session.id)}
          />
          <DirectorSessionReview session={sessionQuery.data ?? null} />
        </div>
      </div>
    </div>
  );
}

function DirectorClassTable({
  rows,
}: {
  rows: Array<{
    classId: string;
    className: string;
    childrenCount: number;
    scheduleText: string;
    sessionsCount: number;
    publishedCount: number;
    observationCount: number;
    mediaCount: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Class oversight</CardTitle>
        <CardDescription>
          General class statistics for checking whether special class work is being
          recorded consistently.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.classId}
              className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-[1.4fr_1.4fr_repeat(4,0.7fr)]"
            >
              <div>
                <p className="font-semibold">{row.className}</p>
                <p className="text-muted-foreground">{row.childrenCount} children</p>
              </div>
              <p className="text-muted-foreground">
                {row.scheduleText || "No fixed schedule"}
              </p>
              <Metric label="Sessions" value={row.sessionsCount} />
              <Metric label="Published" value={row.publishedCount} />
              <Metric label="Notes" value={row.observationCount} />
              <Metric label="Media" value={row.mediaCount} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DirectorSessionReview({
  session,
}: {
  session: Awaited<ReturnType<typeof orpc.specialClasses.sessionDetail>> | null;
}) {
  if (!session) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Select a lesson to review teacher notes, specialist attendance, photos, and
        videos.
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{session.status}</Badge>
          <Badge variant="outline">
            specialist {session.specialistAttendanceStatus}
          </Badge>
        </div>
        <CardTitle className="text-base">{session.title}</CardTitle>
        <CardDescription>
          {session.sessionDate} · {session.className} · {session.subjectName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.classSummary ? (
          <p className="rounded-md border p-3 text-sm">{session.classSummary}</p>
        ) : null}
        {session.media.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {session.media.map((media) => (
              <SignedSpecialMedia
                key={media.id}
                mediaAssetId={media.mediaAssetId}
                mediaType={media.mediaType}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photos or videos yet.</p>
        )}
        <div className="grid gap-2">
          {session.observations.map((observation) => (
            <div key={observation.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{observation.childName}</p>
                <Badge variant="outline">{observation.progressLevel}</Badge>
                <Badge variant="outline">{observation.interestLevel}</Badge>
              </div>
              {observation.teacherNote ? (
                <p className="mt-2 text-muted-foreground">
                  {observation.teacherNote}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
