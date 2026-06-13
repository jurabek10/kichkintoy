"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import type { CenterTeacher } from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { assignmentRoleLabelKey } from "./teacher-labels";

export function TeachersScreen({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("teachers");
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const teachersKey = queryKeys.director.teachers(centerId ?? "");

  const {
    data: teachers = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: teachersKey,
    queryFn: () => orpc.director.teachers({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      teacher,
      next,
    }: {
      teacher: CenterTeacher;
      next: boolean;
    }) =>
      orpc.director.updateTeacher({
        centerId: centerId!,
        userId: teacher.userId,
        body: { canApproveMembers: next },
      }),
    // Optimistic update against the cache, with rollback on failure.
    onMutate: async ({ teacher, next }) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: teachersKey });
      const previous = queryClient.getQueryData<CenterTeacher[]>(teachersKey);
      queryClient.setQueryData<CenterTeacher[]>(teachersKey, (current) =>
        (current ?? []).map((t) =>
          t.userId === teacher.userId ? { ...t, canApproveMembers: next } : t,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(teachersKey, context.previous);
      }
      setMutationError(
        err instanceof Error ? err.message : t("errors.updateFailed"),
      );
    },
    onSuccess: (_data, { teacher, next }) => {
      toast.success(
        next
          ? t("toast.canApprove", { name: teacher.fullName })
          : t("toast.cannotApprove", { name: teacher.fullName }),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teachersKey });
    },
  });

  const error =
    mutationError ??
    (loadError
      ? loadError instanceof Error
        ? loadError.message
        : t("errors.loadFailed")
      : null);

  function togglePermission(teacher: CenterTeacher, next: boolean) {
    if (!centerId) return;
    toggleMutation.mutate({ teacher, next });
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("empty.body")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y">
              {teachers.map((teacher) => (
                <li
                  key={teacher.userId}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-semibold">{teacher.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.phoneNumber ?? teacher.username ?? "—"}
                    </p>
                    {teacher.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {teacher.assignments.map((assignment) => (
                          <Badge key={assignment.classId} variant="info">
                            {assignment.className}
                            {assignment.assignmentRole === "assistant_teacher"
                              ? ` · ${t(assignmentRoleLabelKey(assignment.assignmentRole))}`
                              : ""}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="pt-1 text-xs text-muted-foreground">
                        {t("empty.noClasses")}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-3 sm:justify-end">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("canApprove")}
                    </span>
                    <Switch
                      checked={teacher.canApproveMembers}
                      onCheckedChange={(value: boolean) =>
                        togglePermission(teacher, value)
                      }
                      disabled={
                        toggleMutation.isPending &&
                        toggleMutation.variables?.teacher.userId ===
                          teacher.userId
                      }
                      aria-label={t("toggleAria", { name: teacher.fullName })}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
