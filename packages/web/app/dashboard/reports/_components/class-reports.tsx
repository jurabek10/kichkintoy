"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import type { DailyReportClassChildStatus } from "@kichkintoy/shared";
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
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDate, reportStatusLabel } from "@/lib/format";

export function ClassReports({
  classId,
  initialDate,
}: {
  classId: string;
  initialDate: string;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(initialDate);
  const [actionError, setActionError] = useState<string | null>(null);

  const rowsKey = queryKeys.teacher.classReportStatuses(classId, date);

  const {
    data: rows = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: rowsKey,
    queryFn: () =>
      orpc.reports.classStatuses({ classId, reportDate: date }),
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      orpc.reports.bulkCreateDrafts({ classId, body: { reportDate: date } }),
    onSuccess: async (result) => {
      toast.success(`Created ${result.created} drafts.`);
      await queryClient.invalidateQueries({ queryKey: rowsKey });
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      orpc.reports.publishDrafts({ classId, body: { reportDate: date } }),
    onSuccess: async (result) => {
      toast.success(`Published ${result.published} reports.`);
      await queryClient.invalidateQueries({ queryKey: rowsKey });
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const working = bulkMutation.isPending || publishMutation.isPending;
  const error =
    actionError ?? (loadError ? toApiError(loadError).message : null);

  function bulkCreate() {
    setActionError(null);
    bulkMutation.mutate();
  }

  function publishDrafts() {
    setActionError(null);
    publishMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/reports"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Reports
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Class reports</CardTitle>
            <CardDescription>
              Draft and publish daily reports for {formatDate(date)}.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-[160px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={bulkCreate}
              disabled={working}
            >
              <Plus className="h-4 w-4" />
              Create drafts
            </Button>
            <Button type="button" onClick={publishDrafts} disabled={working}>
              <Send className="h-4 w-4" />
              Publish drafts
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ClassReportRows date={date} loading={loading} rows={rows} />
    </div>
  );
}

function ClassReportRows({
  date,
  loading,
  rows,
}: {
  date: string;
  loading: boolean;
  rows: DailyReportClassChildStatus[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No children are enrolled in this class.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((row) => (
              <ClassReportRow key={row.id} date={date} row={row} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ClassReportRow({
  date,
  row,
}: {
  date: string;
  row: DailyReportClassChildStatus;
}) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{row.name}</p>
        <p className="text-sm text-muted-foreground">
          {row.report
            ? `${row.report.itemCount} items · ${row.report.readCount}/${row.report.guardianCount} read`
            : "No report yet"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.report ? (
          <>
            <Badge
              variant={
                row.report.status === "published"
                  ? "success"
                  : row.report.status === "scheduled"
                    ? "warning"
                    : "secondary"
              }
            >
              {reportStatusLabel(row.report.status)}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/reports/${row.report.id}`}>
                <FileText className="h-4 w-4" />
                Open
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <Link
              href={`/dashboard/reports/new?childId=${row.id}&reportDate=${date}`}
            >
              <Plus className="h-4 w-4" />
              New report
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
