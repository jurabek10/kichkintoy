"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import type { CenterTeacher } from "@kichkintoy/shared";
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
import { ApiError, apiRequest } from "@/lib/api";
import { assignmentRoleLabel } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function TeachersPage() {
  const { session } = useSession();
  const centerId = session?.membership.centerId ?? null;
  const [teachers, setTeachers] = useState<CenterTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<CenterTeacher[]>(
        `/director/centers/${centerId}/teachers`,
        { auth: true },
      );
      setTeachers(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load teachers.");
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePermission(teacher: CenterTeacher, next: boolean) {
    if (!centerId) return;
    setBusyId(teacher.userId);
    // optimistic update
    setTeachers((current) =>
      current.map((t) =>
        t.userId === teacher.userId ? { ...t, canApproveMembers: next } : t,
      ),
    );
    try {
      await apiRequest(
        `/director/centers/${centerId}/teachers/${teacher.userId}`,
        {
          method: "PATCH",
          auth: true,
          body: { canApproveMembers: next },
        },
      );
      toast.success(
        next
          ? `${teacher.fullName} can now approve requests.`
          : `${teacher.fullName} can no longer approve requests.`,
      );
    } catch (err) {
      // revert
      setTeachers((current) =>
        current.map((t) =>
          t.userId === teacher.userId
            ? { ...t, canApproveMembers: !next }
            : t,
        ),
      );
      setError(err instanceof ApiError ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
    }
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
                      disabled={busyId === teacher.userId}
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
