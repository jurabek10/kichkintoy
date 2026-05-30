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
import { assignmentRoleLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";

export function TeachersScreen({ centerId }: { centerId: string | null }) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const teachersKey = queryKeys.director.teachers(centerId ?? "");

  const {
    data: teachers = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: teachersKey,
    queryFn: () =>
      orpc.director.teachers({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ teacher, next }: { teacher: CenterTeacher; next: boolean }) =>
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
        err instanceof Error ? err.message : "Could not update.",
      );
    },
    onSuccess: (_data, { teacher, next }) => {
      toast.success(
        next
          ? `${teacher.fullName} can now approve requests.`
          : `${teacher.fullName} can no longer approve requests.`,
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
        : "Could not load teachers."
      : null);

  function togglePermission(teacher: CenterTeacher, next: boolean) {
    if (!centerId) return;
    toggleMutation.mutate({ teacher, next });
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Teachers</CardTitle>
          <CardDescription>
            Your approved teachers, their classes, and who can approve join
            requests.
          </CardDescription>
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
            Loading…
          </CardContent>
        </Card>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">No teachers yet</p>
              <p className="text-sm text-muted-foreground">
                Invite teachers or approve their join requests to see them here.
              </p>
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
                              ? ` · ${assignmentRoleLabel(assignment.assignmentRole)}`
                              : ""}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="pt-1 text-xs text-muted-foreground">
                        No classes assigned
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-3 sm:justify-end">
                    <span className="text-sm font-medium text-muted-foreground">
                      Can approve requests
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
                      aria-label={`Toggle approval permission for ${teacher.fullName}`}
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
