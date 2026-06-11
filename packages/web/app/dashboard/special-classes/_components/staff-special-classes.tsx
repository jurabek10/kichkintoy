"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { ObservationEditor } from "./observation-editor";
import {
  NewLessonCard,
  PlannedSchedulesCard,
  SessionsCard,
  SpecialClassesHeader,
} from "./staff-special-class-cards";
import {
  defaultObservation,
  invalidateSpecial,
  monthEnd,
  monthStart,
  splitSkills,
  todayIso,
  todayWeekday,
  type ObservationDraft,
} from "./special-class-utils";

export function TeacherSpecialClasses({ centerId }: { centerId: string | null }) {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [specialistTeacherId, setSpecialistTeacherId] = useState("none");
  const [sessionDate, setSessionDate] = useState(todayIso());
  const [sessionTitle, setSessionTitle] = useState("");
  const [classSummary, setClassSummary] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [observationDrafts, setObservationDrafts] = useState<
    Record<string, ObservationDraft>
  >({});

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId! }),
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

  const activeChildren = useMemo(
    () =>
      (childrenQuery.data?.children ?? []).filter(
        (child) => !classId || child.classId === classId,
      ),
    [childrenQuery.data?.children, classId],
  );
  const todaysSchedules = useMemo(
    () =>
      (schedulesQuery.data ?? []).filter(
        (schedule) => schedule.weekday === todayWeekday(),
      ),
    [schedulesQuery.data],
  );

  const createSession = useMutation({
    mutationFn: () =>
      orpc.specialClasses.createSession({
        centerId: centerId!,
        classId,
        subjectId,
        scheduleId: scheduleId || undefined,
        specialistTeacherId:
          specialistTeacherId === "none" ? undefined : specialistTeacherId,
        sessionDate,
        title: sessionTitle,
        classSummary,
        specialistAttendanceStatus: "present",
        payrollAmount: 0,
      }),
    onSuccess: async (session) => {
      setSessionTitle("");
      setClassSummary("");
      setSelectedSessionId(session.id);
      await invalidateSpecial(queryClient);
    },
  });

  const saveObservations = useMutation({
    mutationFn: (input?: { childId?: string }) => {
      if (!selectedSessionId) throw new Error("Choose a session first.");
      const targetChildren = input?.childId
        ? activeChildren.filter((child) => child.id === input.childId)
        : activeChildren;
      return orpc.specialClasses.upsertChildObservations({
        sessionId: selectedSessionId,
        observations: targetChildren.map((child) => {
          const draft = observationDrafts[child.id] ?? defaultObservation();
          return {
            childId: child.id,
            participation: draft.participation,
            progressLevel: draft.progressLevel,
            interestLevel: draft.interestLevel,
            strongSkillKeys: splitSkills(draft.strongSkillKeys),
            needsPracticeSkillKeys: splitSkills(draft.needsPracticeSkillKeys),
            teacherNote: draft.teacherNote,
            homePractice: draft.homePractice,
            visibleToParent: draft.visibleToParent,
          };
        }),
      });
    },
    onSuccess: () => invalidateSpecial(queryClient),
  });

  const publishSession = useMutation({
    mutationFn: (sessionId: string) =>
      orpc.specialClasses.publishSession({ sessionId }),
    onSuccess: () => invalidateSpecial(queryClient),
  });

  const attachMedia = useMutation({
    mutationFn: async (input: { files: FileList; childId?: string }) => {
      if (!selectedSessionId || !centerId) return;
      const mediaAssetIds: string[] = [];

      for (const file of Array.from(input.files)) {
        const signed = await orpc.media.createUploadUrl({
          centerId,
          purpose: "special_class",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
        await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
        mediaAssetIds.push(signed.mediaAssetId);
      }

      if (mediaAssetIds.length > 0) {
        await orpc.specialClasses.attachMedia({
          sessionId: selectedSessionId,
          mediaAssetIds,
          visibility: input.childId ? "tagged_children" : "session_children",
          childIds: input.childId ? [input.childId] : undefined,
        });
      }
    },
    onSuccess: () => invalidateSpecial(queryClient),
  });

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
    childrenQuery.error ??
    schedulesQuery.error ??
    sessionsQuery.error ??
    sessionQuery.error ??
    createSession.error ??
    saveObservations.error ??
    publishSession.error ??
    attachMedia.error;

  return (
    <div className="flex flex-col gap-4">
      <SpecialClassesHeader />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:flex xl:flex-col">
          <PlannedSchedulesCard
            selectedScheduleId={scheduleId}
            schedules={todaysSchedules}
            onSelect={(schedule) => {
              setScheduleId(schedule.id);
              setClassId(schedule.classId);
              setSubjectId(schedule.subjectId);
              setSpecialistTeacherId(schedule.specialistTeacherId ?? "none");
              setSessionTitle(`${schedule.subjectName} class`);
            }}
          />
          <NewLessonCard
            sessionDate={sessionDate}
            sessionTitle={sessionTitle}
            classSummary={classSummary}
            canCreate={Boolean(
              scheduleId && classId && subjectId && sessionTitle.trim(),
            )}
            creating={createSession.isPending}
            onDateChange={setSessionDate}
            onTitleChange={setSessionTitle}
            onSummaryChange={setClassSummary}
            onCreate={() => createSession.mutate()}
          />
        </div>

        <SessionsCard
          selectedSessionId={selectedSessionId}
          sessions={sessionsQuery.data ?? []}
          onSelect={(session) => {
            setSelectedSessionId(session.id);
            setClassId(session.classId);
            setSubjectId(session.subjectId);
            setScheduleId("");
            setSpecialistTeacherId(session.specialistTeacherId ?? "none");
          }}
        />
      </div>

      <ObservationEditor
        session={sessionQuery.data ?? null}
        children={activeChildren}
        drafts={observationDrafts}
        setDrafts={setObservationDrafts}
        onSave={() => saveObservations.mutate({})}
        onSaveChild={(childId) => saveObservations.mutate({ childId })}
        saving={saveObservations.isPending}
        onUpload={(event) => {
          if (event.target.files) {
            attachMedia.mutate({ files: event.target.files });
          }
        }}
        onUploadForChild={(childId, files) =>
          attachMedia.mutate({ files, childId })
        }
        uploading={attachMedia.isPending}
        onPublish={(session) => publishSession.mutate(session.id)}
        publishing={publishSession.isPending}
      />
    </div>
  );
}
