"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { CenterTeacher, ClassDetail } from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/api";
import { assignmentRoleLabel, formatDate, genderLabel } from "@/lib/format";

export function DirectorClassDetail({
  centerId,
  classId,
}: {
  centerId: string | null;
  classId: string;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [teacherToAssign, setTeacherToAssign] = useState("");
  const [assignRole, setAssignRole] = useState("teacher");

  const base = centerId
    ? `/director/centers/${centerId}/classes/${classId}`
    : null;
  const detailKey = queryKeys.director.classDetail(centerId ?? "", classId);
  const teachersKey = queryKeys.director.teachers(centerId ?? "");
  const classesKey = queryKeys.director.classes(centerId ?? "");

  const {
    data: detail = null,
    isPending: loading,
    error: detailError,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () =>
      apiRequest<ClassDetail>(
        `/director/centers/${centerId}/classes/${classId}`,
        { auth: true },
      ),
    enabled: !!centerId,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: teachersKey,
    queryFn: () =>
      apiRequest<CenterTeacher[]>(`/director/centers/${centerId}/teachers`, {
        auth: true,
      }),
    enabled: !!centerId,
  });

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: detailKey }),
      queryClient.invalidateQueries({ queryKey: teachersKey }),
      queryClient.invalidateQueries({ queryKey: classesKey }),
    ]);

  function openEdit() {
    if (detail) {
      setName(detail.name);
      setAgeGroup(detail.ageGroup ?? "");
      setAcademicYear(detail.academicYear ?? "");
    }
    setActionError(null);
    setEditOpen(true);
  }

  const editMutation = useMutation({
    mutationFn: () =>
      apiRequest(base!, {
        method: "PATCH",
        auth: true,
        body: {
          name: name.trim(),
          ageGroup: ageGroup.trim() || null,
          academicYear: academicYear.trim() || null,
        },
      }),
    onSuccess: async () => {
      toast.success("Class updated.");
      setEditOpen(false);
      await invalidateAll();
    },
    onError: (err) =>
      setActionError(
        err instanceof ApiError ? err.message : "Could not update class.",
      ),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      apiRequest(`${base}/teachers`, {
        method: "POST",
        auth: true,
        body: { teacherUserId: teacherToAssign, assignmentRole: assignRole },
      }),
    onSuccess: async () => {
      toast.success("Teacher assigned.");
      setAssignOpen(false);
      setTeacherToAssign("");
      setAssignRole("teacher");
      await invalidateAll();
    },
    onError: (err) =>
      setActionError(
        err instanceof ApiError ? err.message : "Could not assign teacher.",
      ),
  });

  const unassignMutation = useMutation({
    mutationFn: (teacherUserId: string) =>
      apiRequest(`${base}/teachers/${teacherUserId}`, {
        method: "DELETE",
        auth: true,
      }),
    onSuccess: async () => {
      toast("Teacher unassigned.");
      await invalidateAll();
    },
    onError: (err) =>
      setActionError(
        err instanceof ApiError ? err.message : "Could not unassign.",
      ),
  });

  const archiveMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest(`${base}/${status === "archived" ? "restore" : "archive"}`, {
        method: "POST",
        auth: true,
      }),
    onSuccess: async (_data, status) => {
      toast.success(status === "archived" ? "Class restored." : "Class archived.");
      await invalidateAll();
    },
    onError: (err) =>
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not change class status.",
      ),
  });

  const savingEdit = editMutation.isPending;
  const assigning = assignMutation.isPending;
  const working = unassignMutation.isPending || archiveMutation.isPending;
  const error =
    actionError ??
    (detailError
      ? detailError instanceof ApiError
        ? detailError.message
        : "Could not load class."
      : null);

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!base) return;
    editMutation.mutate();
  }

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!base) return;
    if (!teacherToAssign) {
      setActionError("Pick a teacher to assign.");
      return;
    }
    assignMutation.mutate();
  }

  function unassign(teacherUserId: string) {
    if (!base) return;
    unassignMutation.mutate(teacherUserId);
  }

  function toggleArchive() {
    if (!base || !detail) return;
    archiveMutation.mutate(detail.status);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? "Class not found."}</AlertDescription>
      </Alert>
    );
  }

  const assignedIds = new Set(detail.teachers.map((t) => t.userId));
  const assignableTeachers = teachers.filter((t) => !assignedIds.has(t.userId));

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/classes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All classes
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{detail.name}</CardTitle>
              {detail.status === "archived" ? (
                <Badge variant="secondary">Archived</Badge>
              ) : null}
            </div>
            <CardDescription>
              {[detail.ageGroup, detail.academicYear].filter(Boolean).join(" · ") ||
                "No age group or year set"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleArchive}
              disabled={working}
            >
              {detail.status === "archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Teachers ({detail.teachers.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            disabled={assignableTeachers.length === 0}
          >
            <Plus className="h-4 w-4" />
            Assign teacher
          </Button>
        </CardHeader>
        <CardContent>
          {detail.teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teachers assigned yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {detail.teachers.map((teacher) => (
                <li
                  key={teacher.userId}
                  className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{teacher.fullName}</span>
                    <Badge variant="info">
                      {assignmentRoleLabel(teacher.assignmentRole)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => unassign(teacher.userId)}
                    disabled={working}
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Children ({detail.children.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No children enrolled in this class yet. Children are added when you
              approve parent join requests.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {detail.children.map((child) => (
                <li
                  key={child.childId}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {child.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.photoUrl}
                        alt={child.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      child.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {genderLabel(child.gender)} · {formatDate(child.dateOfBirth)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Class name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-age">Age group</Label>
                <Input
                  id="edit-age"
                  value={ageGroup}
                  onChange={(event) => setAgeGroup(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-year">Academic year</Label>
                <Input
                  id="edit-year"
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={assign} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-teacher">Teacher</Label>
              <Select
                value={teacherToAssign}
                onValueChange={setTeacherToAssign}
              >
                <SelectTrigger id="assign-teacher">
                  <SelectValue placeholder="Pick a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {assignableTeachers.map((teacher) => (
                    <SelectItem key={teacher.userId} value={teacher.userId}>
                      {teacher.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-role">Role</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger id="assign-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="assistant_teacher">Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assigning}>
                {assigning ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
