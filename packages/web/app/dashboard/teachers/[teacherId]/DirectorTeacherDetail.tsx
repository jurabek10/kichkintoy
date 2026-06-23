"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Phone, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { AssignmentRole } from "@kichkintoy/shared";
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
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { assignmentRoleLabelKey } from "../_components/teacher-labels";
import { TeacherAvatar } from "../_components/teachers-screen";

const BACK_HREF = "/dashboard/teachers";

export function DirectorTeacherDetail({ teacherId }: { teacherId: string }) {
  const { t } = useLayoutTranslation("teachers");
  const { t: tApp } = useLayoutTranslation("app");
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const centerId = session?.membership.centerId ?? null;
  const canManage = session?.user.role === "director";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [canApprove, setCanApprove] = useState(false);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignRole, setAssignRole] = useState<AssignmentRole>("teacher");

  const detailKey = queryKeys.director.teacherDetail(centerId ?? "", teacherId);

  const {
    data: teacher = null,
    isPending,
    error,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () =>
      orpc.director.teacher({ centerId: centerId!, userId: teacherId }),
    enabled: !!centerId,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.director.updateTeacherProfile({
        centerId: centerId!,
        userId: teacherId,
        body: {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          canApproveMembers: canApprove,
        },
      }),
    onSuccess: async () => {
      toast.success(t("detail.updated"));
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: detailKey });
      if (centerId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.director.teachers(centerId),
        });
      }
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      orpc.director.removeTeacher({ centerId: centerId!, userId: teacherId }),
    onSuccess: async () => {
      toast.success(t("detail.removed"));
      setDeleteOpen(false);
      if (centerId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.director.teachers(centerId),
        });
      }
      router.push(BACK_HREF);
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  // Class assignments the director can edit — add a class (with a role) or pull
  // the teacher out of one. Moving a teacher = remove their old class, add a new.
  const classesQuery = useQuery({
    queryKey: queryKeys.director.classes(centerId ?? ""),
    queryFn: () => orpc.director.classes({ centerId: centerId! }),
    enabled: !!centerId && canManage,
  });

  async function invalidateAssignments() {
    await queryClient.invalidateQueries({ queryKey: detailKey });
    if (centerId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.director.teachers(centerId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.director.classes(centerId),
      });
    }
  }

  const assignMutation = useMutation({
    mutationFn: (vars: { classId: string; role: AssignmentRole }) =>
      orpc.director.assignTeacher({
        centerId: centerId!,
        classId: vars.classId,
        body: { teacherUserId: teacherId, assignmentRole: vars.role },
      }),
    onSuccess: async (_data, vars) => {
      const className = classesQuery.data?.find(
        (item) => item.id === vars.classId,
      )?.name;
      toast.success(t("detail.classAssigned", { class: className ?? "" }));
      setAssignClassId("");
      setAssignRole("teacher");
      await invalidateAssignments();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const unassignMutation = useMutation({
    mutationFn: (vars: { classId: string }) =>
      orpc.director.unassignTeacher({
        centerId: centerId!,
        classId: vars.classId,
        teacherUserId: teacherId,
      }),
    onSuccess: async (_data, vars) => {
      const className = teacher?.assignments.find(
        (item) => item.classId === vars.classId,
      )?.className;
      toast.success(t("detail.classUnassigned", { class: className ?? "" }));
      await invalidateAssignments();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  function openEdit() {
    if (!teacher) return;
    setFullName(teacher.fullName);
    setPhoneNumber(teacher.phoneNumber ?? "");
    setCanApprove(teacher.canApproveMembers);
    setFormError(null);
    setEditOpen(true);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId || !fullName.trim()) return;
    updateMutation.mutate();
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href={BACK_HREF} label={t("detail.back")} />
        <Alert variant="destructive">
          <AlertDescription>
            {error ? toApiError(error).message : t("detail.loadFailed")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const inactive = teacher.status !== "active";

  const assignedClassIds = new Set(teacher.assignments.map((a) => a.classId));
  const availableClasses = (classesQuery.data ?? []).filter(
    (item) => item.status === "active" && !assignedClassIds.has(item.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={BACK_HREF} label={t("detail.back")} />

      {/* Identity header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <TeacherAvatar
              name={teacher.fullName}
              photoUrl={teacher.avatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight">
                  {teacher.fullName}
                </h2>
                <Badge variant={inactive ? "secondary" : "success"}>
                  {inactive ? t("statusInactive") : t("statusActive")}
                </Badge>
                {teacher.canApproveMembers ? (
                  <Badge variant="info" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t("detail.approver")}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {teacher.phoneNumber ? (
                  <a
                    href={`tel:${teacher.phoneNumber}`}
                    dir="ltr"
                    className="nums inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {teacher.phoneNumber}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {t("detail.noPhone")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("detail.classCount", {
                    count: teacher.assignments.length,
                  })}
                </span>
              </div>
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
                {t("detail.edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setDeleteOpen(true);
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t("detail.remove")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Teacher information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("detail.infoTitle")}</CardTitle>
            <CardDescription>{t("detail.infoDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <Field label={t("fields.fullName")}>{teacher.fullName}</Field>
              <Field label={t("fields.phone")}>
                {teacher.phoneNumber ? (
                  <span className="nums">{teacher.phoneNumber}</span>
                ) : (
                  t("detail.notProvided")
                )}
              </Field>
              <Field label={t("fields.username")}>
                {teacher.username || t("detail.notProvided")}
              </Field>
              <Field label={t("fields.email")}>
                {teacher.email || t("detail.notProvided")}
              </Field>
              <Field label={t("fields.joined")}>
                <span className="nums">{formatDate(teacher.joinedAt)}</span>
              </Field>
              <Field label={t("fields.approved")}>
                <span className="nums">{formatDate(teacher.approvedAt)}</span>
              </Field>
              <Field label={t("fields.lastLogin")} full last>
                <span className="nums">
                  {teacher.lastLoginAt
                    ? formatDate(teacher.lastLoginAt)
                    : t("detail.never")}
                </span>
              </Field>
            </dl>
          </CardContent>
        </Card>

        {/* Classes */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {t("detail.classesTitle")}
            </CardTitle>
            <CardDescription>{t("detail.classesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {teacher.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("empty.noClasses")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {teacher.assignments.map((assignment) => (
                  <li
                    key={assignment.classId}
                    className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/dashboard/classes/${assignment.classId}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {assignment.className}
                      </Link>
                      <Badge
                        variant={
                          assignment.assignmentRole === "assistant_teacher"
                            ? "secondary"
                            : "info"
                        }
                      >
                        {t(assignmentRoleLabelKey(assignment.assignmentRole))}
                      </Badge>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          unassignMutation.mutate({
                            classId: assignment.classId,
                          })
                        }
                        disabled={
                          unassignMutation.isPending &&
                          unassignMutation.variables?.classId ===
                            assignment.classId
                        }
                        aria-label={t("detail.unassignAria", {
                          class: assignment.className,
                        })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canManage ? (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {t("detail.addClass")}
                </p>
                {availableClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("detail.noClassesToAdd")}
                  </p>
                ) : (
                  <>
                    <Select
                      value={assignClassId}
                      onValueChange={setAssignClassId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("detail.chooseClass")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Select
                        value={assignRole}
                        onValueChange={(value) =>
                          setAssignRole(value as AssignmentRole)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">
                            {t("assignmentRole.teacher")}
                          </SelectItem>
                          <SelectItem value="assistant_teacher">
                            {t("assignmentRole.assistantTeacher")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={() =>
                          assignClassId &&
                          assignMutation.mutate({
                            classId: assignClassId,
                            role: assignRole,
                          })
                        }
                        disabled={!assignClassId || assignMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                        {t("detail.assign")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-name">{t("fields.fullName")}</Label>
              <Input
                id="teacher-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-phone">{t("fields.phone")}</Label>
              <Input
                id="teacher-phone"
                type="tel"
                dir="ltr"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder={t("detail.phonePlaceholder")}
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t("canApprove")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("detail.canApproveHint")}
                </span>
              </span>
              <Switch checked={canApprove} onCheckedChange={setCanApprove} />
            </label>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                {tApp("actions.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? t("detail.saving")
                  : tApp("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.removeBody", { name: teacher.fullName })}
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {tApp("actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending
                ? t("detail.removing")
                : t("detail.removeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Field({
  label,
  children,
  full,
  last,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/70 py-3",
        full ? "sm:col-span-2" : null,
        last ? "border-b-0 pb-0 sm:pb-0" : null,
      )}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}
