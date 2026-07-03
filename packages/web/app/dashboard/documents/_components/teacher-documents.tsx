"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { CalendarClock, FileCheck2, Inbox } from "lucide-react";
import type { StudentDocumentSubmissionSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
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
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { submissionStatusKey } from "./document-utils";
import { RequestComposerDialog } from "./request-composer-dialog";

const ALL_MONTHS = "all";

export function TeacherDocuments({ centerId }: { centerId: string | null }) {
  const { t, i18n } = useLayoutTranslation("documents");
  const [month, setMonth] = useState(ALL_MONTHS);

  const templatesInput = { centerId: centerId ?? "", status: "active" as const };
  const submissionsInput = { centerId: centerId ?? "" };

  const templatesQuery = useQuery({
    queryKey: queryKeys.studentDocuments.templates(templatesInput),
    queryFn: () => orpc.studentDocuments.staffTemplates(templatesInput),
    enabled: !!centerId,
  });
  const submissionsQuery = useQuery({
    queryKey: queryKeys.studentDocuments.submissions(submissionsInput),
    queryFn: () => orpc.studentDocuments.staffSubmissions(submissionsInput),
    enabled: !!centerId,
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes({}),
    enabled: !!centerId,
  });

  const classes = useMemo(
    () => (classesQuery.data ?? []).map((klass) => ({ id: klass.id, name: klass.name })),
    [classesQuery.data],
  );

  // The composer's "child" target needs the roster of every class the teacher runs.
  const rosterQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: queryKeys.teacher.classChildren(klass.id),
      queryFn: () => orpc.teacher.classChildren({ classId: klass.id }),
      enabled: !!centerId,
    })),
  });
  const children = useMemo(() => {
    const map = new Map<string, string>();
    for (const query of rosterQueries) {
      for (const child of query.data ?? []) map.set(child.childId, child.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rosterQueries]);

  const columns = useMemo<ColumnDef<StudentDocumentSubmissionSummary>[]>(
    () => [
      {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        accessorKey: "childName",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.childName}</span>
        ),
      },
      {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.class")} />
        ),
        accessorKey: "className",
        cell: ({ row }) => row.original.className ?? t("table.noClass"),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id) ?? t("table.noClass")),
      },
      {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.request")} />
        ),
        accessorKey: "requestTitle",
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={submissionStatusVariant(row.original.status)}>
            {t(submissionStatusKey(row.original.status))}
          </Badge>
        ),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.updated")} />
        ),
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/documents/${row.original.id}`}>
              {t("table.open")}
            </Link>
          </Button>
        ),
      },
    ],
    [t],
  );

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const templates = templatesQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];

  // Month options come from what actually exists, newest first.
  const monthOptions = Array.from(
    new Set(submissions.map((submission) => submission.createdAt.slice(0, 7))),
  )
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: monthLabel(value, i18n.language) }));

  const scopedSubmissions =
    month === ALL_MONTHS
      ? submissions
      : submissions.filter((submission) => submission.createdAt.slice(0, 7) === month);

  const requestGroups = groupByRequest(scopedSubmissions);

  const submissionClassOptions = Array.from(
    new Set(
      scopedSubmissions.map(
        (submission) => submission.className ?? t("table.noClass"),
      ),
    ),
  )
    .sort()
    .map((value) => ({ label: value, value }));
  const submissionStatusOptions = Array.from(
    new Set(scopedSubmissions.map((submission) => submission.status)),
  ).map((status) => ({
    label: t(submissionStatusKey(status)),
    value: status,
  }));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileCheck2 className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("teacherDescription")}</CardDescription>
          </div>
          <RequestComposerDialog
            centerId={centerId}
            templates={templates}
            classes={classes}
            children={children}
            canCreateTemplate={false}
            allowCenterTarget={false}
          />
        </CardHeader>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-base font-bold">{t("requests.title")}</h2>
        {requestGroups.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7 text-muted-foreground" />}
            title={t("empty.staffTitle")}
            body={t("empty.staffBody")}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {requestGroups.map((group) => (
              <RequestFunnelCard key={group.requestId} group={group} t={t} />
            ))}
          </div>
        )}
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">{t("submissions.title")}</CardTitle>
          <CardDescription>{t("submissions.teacherDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <DataTable
            columns={columns}
            data={scopedSubmissions}
            emptyMessage={t("submissions.empty")}
            toolbar={(table) => (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={
                      (table
                        .getColumn("childName")
                        ?.getFilterValue() as string) ?? ""
                    }
                    onChange={(event) =>
                      table
                        .getColumn("childName")
                        ?.setFilterValue(event.target.value)
                    }
                    placeholder={t("submissions.filterChildren")}
                    className="h-9 sm:w-[240px]"
                  />
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="h-9 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_MONTHS}>
                        {t("submissions.allTime")}
                      </SelectItem>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DataTableFacetedFilter
                    column={table.getColumn("className")}
                    title={t("submissions.class")}
                    options={submissionClassOptions}
                  />
                  <DataTableFacetedFilter
                    column={table.getColumn("status")}
                    title={t("submissions.status")}
                    options={submissionStatusOptions}
                  />
                </div>
                <DataTableViewOptions table={table} />
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

type RequestGroup = {
  requestId: string;
  title: string;
  dueDate: string | null;
  total: number;
  accepted: number;
};

/** Roll the teacher's scoped submissions up into per-request collection funnels. */
function groupByRequest(
  submissions: StudentDocumentSubmissionSummary[],
): RequestGroup[] {
  const groups = new Map<string, RequestGroup>();
  for (const submission of submissions) {
    const existing = groups.get(submission.requestId);
    if (existing) {
      existing.total += 1;
      if (submission.status === "accepted") existing.accepted += 1;
      if (!existing.dueDate && submission.dueDate) existing.dueDate = submission.dueDate;
    } else {
      groups.set(submission.requestId, {
        requestId: submission.requestId,
        title: submission.requestTitle,
        dueDate: submission.dueDate,
        total: 1,
        accepted: submission.status === "accepted" ? 1 : 0,
      });
    }
  }
  // Still-collecting requests first, then by title.
  return [...groups.values()].sort((a, b) => {
    const aOpen = a.accepted < a.total ? 0 : 1;
    const bOpen = b.accepted < b.total ? 0 : 1;
    return aOpen - bOpen || a.title.localeCompare(b.title);
  });
}

function RequestFunnelCard({
  group,
  t,
}: {
  group: RequestGroup;
  t: TFunction<"documents">;
}) {
  const pct = group.total > 0 ? Math.round((group.accepted / group.total) * 100) : 0;
  const overdue = isOverdue(group.dueDate) && group.accepted < group.total;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 min-h-[2.75rem] min-w-0 font-bold leading-snug">
          {group.title}
        </h3>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-lg font-extrabold leading-none">{pct}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("requests.acceptedCount", {
              accepted: group.accepted,
              total: group.total,
            })}
          </p>
        </div>
      </div>

      {group.total > 0 && group.total <= 10 ? (
        <div className="flex flex-wrap gap-1.5" aria-hidden>
          {Array.from({ length: group.total }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-2 w-2 rounded-full",
                index < group.accepted ? "bg-mint" : "bg-muted-foreground/25",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            overdue ? "font-semibold text-coral-ink" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {group.dueDate
            ? t("requests.due", { date: formatDate(group.dueDate) })
            : t("requests.noDue")}
        </span>
      </div>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="grid place-items-center gap-2 p-8 text-center">
      {icon}
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

function submissionStatusVariant(status: string) {
  if (status === "accepted") return "success" as const;
  if (status === "needs_correction") return "destructive" as const;
  if (status === "submitted") return "secondary" as const;
  return "outline" as const;
}

function monthLabel(value: string, locale: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate < todayIso();
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
