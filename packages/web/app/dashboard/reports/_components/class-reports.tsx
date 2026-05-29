"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import type { DailyReportClassChildStatus } from "@kichkintoy/shared";
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
import { ApiError, apiRequest } from "@/lib/api";
import { formatDate, reportStatusLabel } from "@/lib/format";

export function ClassReports({
  classId,
  initialDate,
}: {
  classId: string;
  initialDate: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<DailyReportClassChildStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<DailyReportClassChildStatus[]>(
        `/teacher/classes/${classId}/reports`,
        { auth: true, query: { reportDate: date } },
      );
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function bulkCreate() {
    setWorking(true);
    try {
      const result = await apiRequest<{ created: number; skipped: number }>(
        `/teacher/classes/${classId}/reports/bulk`,
        { method: "POST", auth: true, body: { reportDate: date } },
      );
      toast.success(`Created ${result.created} drafts.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create drafts.");
    } finally {
      setWorking(false);
    }
  }

  async function publishDrafts() {
    setWorking(true);
    try {
      const result = await apiRequest<{ published: number; skipped: number }>(
        `/teacher/classes/${classId}/reports/publish-drafts`,
        { method: "POST", auth: true, body: { reportDate: date } },
      );
      toast.success(`Published ${result.published} reports.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish drafts.");
    } finally {
      setWorking(false);
    }
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
