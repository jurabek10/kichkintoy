"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { FileCheck2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { StudentDocumentSubmissionSummary } from "@kichkintoy/shared";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import {
  buildDefaultMedicalFields,
  submissionStatusKey,
  templateTypeKey,
} from "./document-utils";

export function DirectorDocuments({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("documents");
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(t("defaultTitle"));
  const [targetType, setTargetType] = useState<"center" | "class" | "child">(
    "class",
  );
  const [templateId, setTemplateId] = useState("");
  const [classId, setClassId] = useState("");
  const [childId, setChildId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState(
    t("defaultInstructions"),
  );

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

  const createTemplate = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.createTemplate({
        centerId: centerId!,
        title,
        description: t("templateDescription"),
        templateType: "medical_allergy",
        status: "active",
        fields: buildDefaultMedicalFields(t),
      }),
    onSuccess: async (template) => {
      toast.success(t("toast.templateCreated"));
      setTemplateId(template.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.studentDocuments.all(),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const sendRequest = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.sendRequest({
        centerId: centerId!,
        templateId,
        targetType,
        title,
        instructions: instructions || undefined,
        dueDate: dueDate || undefined,
        classIds: targetType === "class" && classId ? [classId] : undefined,
        childIds: targetType === "child" && childId ? [childId] : undefined,
      }),
    onSuccess: async () => {
      toast.success(t("toast.requestSent"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.studentDocuments.all(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const columns = useMemo<ColumnDef<StudentDocumentSubmissionSummary>[]>(
    () => [
      {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        accessorKey: "childName",
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
          <Badge
            className="whitespace-normal text-center leading-tight"
            variant={row.original.status === "accepted" ? "success" : "outline"}
          >
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
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline" className="w-full px-2">
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
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileCheck2 className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("directorDescription")}</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">{t("composer.title")}</CardTitle>
          <CardDescription>{t("composer.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
              <Label htmlFor="doc-title">{t("composer.titleLabel")}</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={createTemplate.isPending || !title.trim()}
              onClick={() => createTemplate.mutate()}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("composer.createTemplate")}
            </Button>
            <div className="grid gap-2">
              <Label>{t("composer.template")}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title} · {t(templateTypeKey(template.templateType))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("composer.target")}</Label>
              <Select
                value={targetType}
                onValueChange={(value) =>
                  setTargetType(value as "center" | "class" | "child")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">{t("target.center")}</SelectItem>
                  <SelectItem value="class">{t("target.class")}</SelectItem>
                  <SelectItem value="child">{t("target.child")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetType === "class" ? (
              <div className="grid gap-2">
                <Label>{t("composer.class")}</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("composer.chooseClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {targetType === "child" ? (
              <div className="grid gap-2">
                <Label>{t("composer.child")}</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("composer.chooseChild")} />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="due-date">{t("composer.dueDate")}</Label>
              <DatePicker
                id="due-date"
                value={dueDate}
                onValueChange={setDueDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instructions">{t("composer.instructions")}</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
              />
            </div>
            <Button
              type="button"
              disabled={
                sendRequest.isPending ||
                !templateId ||
                (targetType === "class" && !classId) ||
                (targetType === "child" && !childId)
              }
              onClick={() => sendRequest.mutate()}
            >
              <Send className="h-4 w-4" />
              {t("composer.sendRequest")}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">{t("requests.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("requests.empty")}</p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("requests.acceptedCount", {
                        accepted: request.acceptedCount,
                        total: request.totalSubmissions,
                      })}
                    </p>
                  </div>
                  <Badge>{t(submissionStatusKey(request.status))}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
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
