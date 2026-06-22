"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { CalendarClock, FileCheck2, Inbox } from "lucide-react";
import type {
  StudentDocumentRequestSummary,
  StudentDocumentSubmissionSummary,
} from "@kichkintoy/shared";
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
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { submissionStatusKey } from "./document-utils";
import { RequestComposerDialog } from "./request-composer-dialog";

export function DirectorDocuments({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("documents");

  const templatesInput = { centerId: centerId ?? "", status: "active" as const };
  const requestsInput = { centerId: centerId ?? "" };
  const submissionsInput = { centerId: centerId ?? "" };

  const templatesQuery = useQuery({
    queryKey: queryKeys.studentDocuments.templates(templatesInput),
    queryFn: () => orpc.studentDocuments.staffTemplates(templatesInput),
    enabled: !!centerId,
  });
  const requestsQuery = useQuery({
    queryKey: queryKeys.studentDocuments.requests(requestsInput),
    queryFn: () => orpc.studentDocuments.staffRequests(requestsInput),
    enabled: !!centerId,
  });
  const submissionsQuery = useQuery({
    queryKey: queryKeys.studentDocuments.submissions(submissionsInput),
    queryFn: () => orpc.studentDocuments.staffSubmissions(submissionsInput),
    enabled: !!centerId,
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });
  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId ?? "" }),
    enabled: !!centerId,
  });

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
  const requests = requestsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const children = childrenQuery.data?.children ?? [];
  const submissions = submissionsQuery.data ?? [];
  const openRequests = requests.filter(
    (request) => request.status === "sent" || request.status === "draft",
  );

  const submissionClassOptions = Array.from(
    new Set(
      submissions.map((submission) => submission.className ?? t("table.noClass")),
    ),
  )
    .sort()
    .map((value) => ({ label: value, value }));
  const submissionStatusOptions = Array.from(
    new Set(submissions.map((submission) => submission.status)),
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
            <CardDescription>{t("directorDescription")}</CardDescription>
          </div>
          <RequestComposerDialog
            centerId={centerId}
            templates={templates}
            classes={classes}
            children={children}
          />
        </CardHeader>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-base font-bold">{t("requests.title")}</h2>
        {openRequests.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7 text-muted-foreground" />}
            title={t("empty.staffTitle")}
            body={t("empty.staffBody")}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {openRequests.map((request) => (
              <RequestFunnelCard key={request.id} request={request} t={t} />
            ))}
          </div>
        )}
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">{t("submissions.title")}</CardTitle>
          <CardDescription>{t("submissions.description")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <DataTable
            columns={columns}
            data={submissions}
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

/** A request as a collection funnel: how many families have returned and had
 *  their paperwork accepted, with what still needs review or a fix. */
function RequestFunnelCard({
  request,
  t,
}: {
  request: StudentDocumentRequestSummary;
  t: TFunction<"documents">;
}) {
  const total = request.totalSubmissions;
  const accepted = clamp(request.acceptedCount, 0, total);
  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const overdue = isOverdue(request.dueDate) && request.status === "sent";

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.75rem] font-bold leading-snug">
            {request.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {scopeLabel(request, t)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-lg font-extrabold leading-none">
            {pct}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("requests.acceptedCount", { accepted, total })}
          </p>
        </div>
      </div>

      {total > 0 && total <= 10 ? (
        <div className="flex flex-wrap gap-1.5" aria-hidden>
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-2 w-2 rounded-full",
                index < accepted ? "bg-mint" : "bg-muted-foreground/25",
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
          {request.dueDate
            ? t("requests.due", { date: formatDate(request.dueDate) })
            : t("requests.noDue")}
        </span>
        {request.status === "draft" ? (
          <Badge variant="outline">{t("requestStatus.draft")}</Badge>
        ) : null}
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

function scopeLabel(
  request: StudentDocumentRequestSummary,
  t: TFunction<"documents">,
) {
  if (request.targetType === "center") return t("target.center");
  if (request.targetType === "class")
    return request.classNames.join(", ") || t("target.class");
  return request.childNames.join(", ") || t("target.child");
}

function submissionStatusVariant(status: string) {
  if (status === "accepted") return "success" as const;
  if (status === "needs_correction") return "destructive" as const;
  if (status === "submitted") return "secondary" as const;
  return "outline" as const;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
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
