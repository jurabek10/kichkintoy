"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, GraduationCap, Search } from "lucide-react";
import { toast } from "sonner";
import type { CenterTeacher } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
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
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { KidsLoader } from "@/components/kids-loader";
import { SignedAvatar } from "@/components/signed-avatar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { assignmentRoleLabelKey } from "./teacher-labels";

type ClassOption = { id: string; name: string };

export function TeachersScreen({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("teachers");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [classId, setClassId] = useState("all");

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
        (current ?? []).map((item) =>
          item.userId === teacher.userId
            ? { ...item, canApproveMembers: next }
            : item,
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

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const teacher of teachers) {
      for (const assignment of teacher.assignments) {
        unique.set(assignment.classId, assignment.className);
      }
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers]);

  const columns = useMemo<ColumnDef<CenterTeacher>[]>(
    () => [
      {
        id: "name",
        accessorFn: (teacher) => teacher.fullName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fields.fullName")} />
        ),
        cell: ({ row }) => {
          const teacher = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <TeacherAvatar
                name={teacher.fullName}
                photoUrl={teacher.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">{teacher.fullName}</p>
                <p
                  dir="ltr"
                  className="nums truncate text-left text-xs text-muted-foreground"
                >
                  {teacher.phoneNumber ?? teacher.username ?? "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "classes",
        accessorFn: (teacher) =>
          teacher.assignments.map((a) => a.className).join(", "),
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("detail.classesTitle")} />
        ),
        cell: ({ row }) =>
          row.original.assignments.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.assignments.map((assignment) => (
                <Badge key={assignment.classId} variant="info">
                  {assignment.className}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("empty.noClasses")}
            </span>
          ),
      },
      {
        id: "role",
        accessorFn: (teacher) => primaryRole(teacher),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.role")} />
        ),
        cell: ({ row }) => {
          const roles = distinctRoles(row.original);
          if (roles.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((value) => (
                <Badge
                  key={value}
                  variant={value === "teacher" ? "secondary" : "outline"}
                >
                  {t(assignmentRoleLabelKey(value))}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "approvedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fields.approved")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm text-muted-foreground">
            {formatDate(row.original.approvedAt)}
          </span>
        ),
      },
      {
        id: "approve",
        enableSorting: false,
        accessorFn: (teacher) => teacher.canApproveMembers,
        header: () => <span className="text-xs">{t("table.canApprove")}</span>,
        cell: ({ row }) => {
          const teacher = row.original;
          return (
            <Switch
              checked={teacher.canApproveMembers}
              onCheckedChange={(value: boolean) =>
                centerId && toggleMutation.mutate({ teacher, next: value })
              }
              disabled={
                toggleMutation.isPending &&
                toggleMutation.variables?.teacher.userId === teacher.userId
              }
              aria-label={t("toggleAria", { name: teacher.fullName })}
            />
          );
        },
      },
      {
        id: "open",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{t("table.open")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={() =>
                router.push(`/dashboard/teachers/${row.original.userId}`)
              }
            >
              {t("table.open")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t, centerId, router, toggleMutation],
  );

  const error =
    mutationError ??
    (loadError
      ? loadError instanceof Error
        ? loadError.message
        : t("errors.loadFailed")
      : null);

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const query = search.trim().toLowerCase();
  const rows = teachers.filter((teacher) => {
    if (query) {
      const haystack = [
        teacher.fullName,
        teacher.phoneNumber ?? "",
        teacher.username ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (
      role !== "all" &&
      !teacher.assignments.some((a) => a.assignmentRole === role)
    ) {
      return false;
    }
    if (
      classId !== "all" &&
      !teacher.assignments.some((a) => a.classId === classId)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {teachers.length > 0 ? (
            <Badge variant="secondary" className="nums shrink-0 text-sm">
              {teachers.length}
            </Badge>
          ) : null}
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
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
          <CardContent className="p-4 sm:p-5">
            <DataTable
              columns={columns}
              data={rows}
              pageSize={15}
              emptyMessage={t("table.empty")}
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("table.search")}
                        className="h-9 w-[200px] pl-8"
                      />
                    </div>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("table.allRoles")}</SelectItem>
                        <SelectItem value="teacher">
                          {t("assignmentRole.teacher")}
                        </SelectItem>
                        <SelectItem value="assistant_teacher">
                          {t("assignmentRole.assistantTeacher")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("table.allClasses")}
                        </SelectItem>
                        {classOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DataTableViewOptions table={table} />
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function distinctRoles(teacher: CenterTeacher) {
  const roles: ("teacher" | "assistant_teacher")[] = [];
  if (teacher.assignments.some((a) => a.assignmentRole === "teacher")) {
    roles.push("teacher");
  }
  if (teacher.assignments.some((a) => a.assignmentRole === "assistant_teacher")) {
    roles.push("assistant_teacher");
  }
  return roles;
}

// Lead teachers sort ahead of assistants; unassigned last.
function primaryRole(teacher: CenterTeacher) {
  if (teacher.assignments.some((a) => a.assignmentRole === "teacher")) {
    return "1";
  }
  if (teacher.assignments.length > 0) return "2";
  return "3";
}

export function TeacherAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  // A private media-asset id (not a URL); resolved to a short-lived signed
  // URL by SignedAvatar. Named `photoUrl` for historical reasons.
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const textClassName =
    size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-base";
  return (
    <SignedAvatar
      mediaAssetId={photoUrl}
      name={name}
      className={`${dimensions} shrink-0`}
      textClassName={textClassName}
    />
  );
}
