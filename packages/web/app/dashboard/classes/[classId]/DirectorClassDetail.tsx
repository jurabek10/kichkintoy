"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import type { ClassRosterChild } from "@kichkintoy/shared";
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
import { KidsLoader } from "@/components/kids-loader";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
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
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { assignmentRoleLabel, formatDate, genderLabel } from "@/lib/format";

export function DirectorClassDetail({
  centerId,
  classId,
}: {
  centerId: string | null;
  classId: string;
}) {
  const { t } = useLayoutTranslation("classes");
  const { t: tApp } = useLayoutTranslation("app");
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
    queryFn: () => orpc.director.class({ centerId: centerId!, classId }),
    enabled: !!centerId,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: teachersKey,
    queryFn: () => orpc.director.teachers({ centerId: centerId! }),
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
      orpc.director.updateClass({
        centerId: centerId!,
        classId,
        body: {
          name: name.trim(),
          ageGroup: ageGroup.trim() || null,
          academicYear: academicYear.trim() || null,
        },
      }),
    onSuccess: async () => {
      toast.success(t("classUpdated"));
      setEditOpen(false);
      await invalidateAll();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      orpc.director.assignTeacher({
        centerId: centerId!,
        classId,
        body: {
          teacherUserId: teacherToAssign,
          assignmentRole: assignRole as "teacher" | "assistant_teacher",
        },
      }),
    onSuccess: async () => {
      toast.success(t("teacherAssigned"));
      setAssignOpen(false);
      setTeacherToAssign("");
      setAssignRole("teacher");
      await invalidateAll();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const unassignMutation = useMutation({
    mutationFn: (teacherUserId: string) =>
      orpc.director.unassignTeacher({
        centerId: centerId!,
        classId,
        teacherUserId,
      }),
    onSuccess: async () => {
      toast(t("teacherUnassigned"));
      await invalidateAll();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const archiveMutation = useMutation({
    mutationFn: (status: string) =>
      status === "archived"
        ? orpc.director.restoreClass({ centerId: centerId!, classId })
        : orpc.director.archiveClass({ centerId: centerId!, classId }),
    onSuccess: async (_data, status) => {
      toast.success(
        status === "archived" ? t("classRestored") : t("classArchived"),
      );
      await invalidateAll();
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const savingEdit = editMutation.isPending;
  const assigning = assignMutation.isPending;
  const working = unassignMutation.isPending || archiveMutation.isPending;
  const error =
    actionError ?? (detailError ? toApiError(detailError).message : null);
  const childColumns = useMemo<ColumnDef<ClassRosterChild>[]>(
    () => [
      {
        id: "image",
        header: t("childrenTable.image"),
        enableSorting: false,
        cell: ({ row }) => (
          <ChildAvatar
            name={row.original.name}
            photoUrl={row.original.photoUrl}
          />
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("childrenTable.name")}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {translatedGender(row.original.gender, t)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "dateOfBirth",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("childrenTable.birthday")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.dateOfBirth),
      },
      {
        accessorKey: "joinedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("childrenTable.joined")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.joinedAt),
      },
      {
        id: "paymentStatus",
        accessorFn: () => t("childrenTable.paymentComingSoon"),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("childrenTable.payment")}
          />
        ),
        cell: () => (
          <Badge variant="outline">{t("childrenTable.paymentComingSoon")}</Badge>
        ),
      },
      {
        id: "actions",
        header: t("childrenTable.actions"),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/children/${row.original.childId}`}>
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              title={t("childrenTable.deleteComingSoon")}
            >
              <Trash2 className="h-4 w-4" />
              {t("childrenTable.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!base) return;
    editMutation.mutate();
  }

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!base) return;
    if (!teacherToAssign) {
      setActionError(t("pickTeacherRequired"));
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
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? t("classNotFound")}</AlertDescription>
      </Alert>
    );
  }

  const assignedIds = new Set(detail.teachers.map((teacher) => teacher.userId));
  const assignableTeachers = teachers.filter(
    (teacher) => !assignedIds.has(teacher.userId),
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/classes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("allClasses")}
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{detail.name}</CardTitle>
              {detail.status === "archived" ? (
                <Badge variant="secondary">{t("archived")}</Badge>
              ) : null}
            </div>
            <CardDescription>
              {[detail.ageGroup, detail.academicYear].filter(Boolean).join(" · ") ||
                t("noAgeGroupOrYear")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              {t("edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleArchive}
              disabled={working}
            >
              {detail.status === "archived" ? t("restore") : t("archive")}
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
            {t("teachersTitle", { count: detail.teachers.length })}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            disabled={assignableTeachers.length === 0}
          >
            <Plus className="h-4 w-4" />
            {t("assignTeacher")}
          </Button>
        </CardHeader>
        <CardContent>
          {detail.teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noTeachersAssigned")}
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
                      {t(
                        `roles.${teacher.assignmentRole}`,
                        assignmentRoleLabel(teacher.assignmentRole),
                      )}
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
                    {t("remove")}
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
            {t("childrenTitle", { count: detail.children.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={childColumns}
            data={detail.children}
            emptyMessage={t("noChildrenEnrolled")}
            toolbar={(table) => (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Input
                  value={
                    (table.getColumn("name")?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  placeholder={t("childrenTable.search")}
                  className="h-9 sm:w-[260px]"
                />
                <DataTableViewOptions table={table} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editClass")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">{t("className")}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-age">{t("ageGroup")}</Label>
                <Input
                  id="edit-age"
                  value={ageGroup}
                  onChange={(event) => setAgeGroup(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-year">{t("academicYear")}</Label>
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
                {tApp("actions.cancel")}
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? t("saving") : tApp("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignTeacher")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={assign} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-teacher">{t("roles.teacher")}</Label>
              <Select
                value={teacherToAssign}
                onValueChange={setTeacherToAssign}
              >
                <SelectTrigger id="assign-teacher">
                  <SelectValue placeholder={t("pickTeacher")} />
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
              <Label htmlFor="assign-role">{t("role")}</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger id="assign-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">{t("roles.teacher")}</SelectItem>
                  <SelectItem value="assistant_teacher">
                    {t("roles.assistant_teacher")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignOpen(false)}
              >
                {tApp("actions.cancel")}
              </Button>
              <Button type="submit" disabled={assigning}>
                {assigning ? t("assigning") : t("assign")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  return (
    <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function translatedGender(
  value: string | null | undefined,
  t: TFunction<"classes">,
) {
  if (value === "boy") return t("gender.boy");
  if (value === "girl") return t("gender.girl");
  if (value === "prefer_not_to_say") return t("gender.prefer_not_to_say");
  return genderLabel(value);
}
