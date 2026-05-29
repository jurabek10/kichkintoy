"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type {
  DailyReportListResponse,
  ParentChildSummary,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { reportItemSummary } from "./report-utils";

export function ParentReports() {
  const [children, setChildren] = useState<ParentChildSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [reports, setReports] = useState<DailyReportListResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<ParentChildSummary[]>("/parent/children", { auth: true })
      .then((rows) => {
        setChildren(rows);
        setSelectedChildId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load children."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    setLoading(true);
    apiRequest<DailyReportListResponse>(
      `/parent/children/${selectedChildId}/reports`,
      { auth: true },
    )
      .then(setReports)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load reports."),
      )
      .finally(() => setLoading(false));
  }, [selectedChildId]);

  const selected = children.find((child) => child.id === selectedChildId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Daily reports</CardTitle>
          <CardDescription>
            Read teacher updates and reply with comments.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <ChildPicker
          children={children}
          loading={loading}
          selectedChildId={selectedChildId}
          onSelect={setSelectedChildId}
        />
        <ParentReportList
          childName={selected?.name ?? null}
          loading={loading}
          reports={reports}
        />
      </div>
    </div>
  );
}

function ChildPicker({
  children,
  loading,
  onSelect,
  selectedChildId,
}: {
  children: ParentChildSummary[];
  loading: boolean;
  onSelect: (childId: string) => void;
  selectedChildId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Children</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {children.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            No linked children yet.
          </p>
        ) : (
          children.map((child) => (
            <Button
              key={child.id}
              type="button"
              variant={selectedChildId === child.id ? "default" : "outline"}
              className="justify-start"
              onClick={() => onSelect(child.id)}
            >
              {child.name}
            </Button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ParentReportList({
  childName,
  loading,
  reports,
}: {
  childName: string | null;
  loading: boolean;
  reports: DailyReportListResponse;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {childName ? `${childName}'s reports` : "Reports"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published reports yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {reports.map((report) => (
              <li key={report.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold">
                      {formatDate(report.reportDate)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.teacherNote || reportItemSummary(report)}
                    </p>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
