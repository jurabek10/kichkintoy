"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import type {
  ClassListItem,
  DailyReportListResponse,
  TeacherClass,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { reportItemSummary, todayIsoDate } from "./report-utils";

export function StaffReports({
  centerId,
  director,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const [date, setDate] = useState(todayIsoDate());

  const {
    data,
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: ["staff-reports", { director, centerId, date }],
    queryFn: async () => {
      const [classRows, reportRows] = await Promise.all([
        director
          ? centerId
            ? orpc.director.classes({ centerId })
            : Promise.resolve<ClassListItem[]>([])
          : orpc.teacher.classes(),
        orpc.reports.teacherList({ reportDate: date }),
      ]);
      const classes = director
        ? (classRows as ClassListItem[]).filter(
            (klass) => klass.status !== "archived",
          )
        : classRows;
      return {
        classes: classes as Array<TeacherClass | ClassListItem>,
        reports: reportRows,
      };
    },
  });

  const classes = data?.classes ?? [];
  const reports = data?.reports ?? [];
  const error = loadError ? toApiError(loadError).message : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Daily reports</CardTitle>
            <CardDescription>
              Create drafts, publish reports, and check parent reads.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-[160px]"
            />
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <StaffClassesCard classes={classes} date={date} loading={loading} />
        <StaffReportsCard date={date} loading={loading} reports={reports} />
      </div>
    </div>
  );
}

function StaffClassesCard({
  classes,
  date,
  loading,
}: {
  classes: Array<TeacherClass | ClassListItem>;
  date: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Classes</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No classes available for reports.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((klass) => (
              <Link
                key={klass.id}
                href={`/dashboard/reports/classes/${klass.id}?date=${date}`}
                className="rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{klass.name}</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {klass.childCount} children
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffReportsCard({
  date,
  loading,
  reports,
}: {
  date: string;
  loading: boolean;
  reports: DailyReportListResponse;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Reports for {formatDate(date)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports for this date yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {reports.map((report) => (
              <li key={report.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {report.child.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.class.name} · {reportItemSummary(report)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === "published"
                        ? "success"
                        : report.status === "scheduled"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {reportStatusLabel(report.status)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
