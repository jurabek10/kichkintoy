"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { TFunction } from "i18next";
import type {
  DailyReportListResponse,
  ParentChildSummary,
} from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { reportItemSummary } from "./report-utils";

export function ParentReports() {
  const { t } = useLayoutTranslation("reports");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const {
    data: children = [],
    isPending: childrenLoading,
    error: childrenError,
  } = useQuery({
    queryKey: queryKeys.parent.children(),
    queryFn: () => orpc.reports.parentChildren(),
  });

  const effectiveChildId = selectedChildId ?? children[0]?.id ?? null;

  const {
    data: reports = [],
    isPending: reportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: queryKeys.parent.childReports(effectiveChildId ?? ""),
    queryFn: () => orpc.reports.parentList({ childId: effectiveChildId! }),
    enabled: !!effectiveChildId,
  });

  const loading = childrenLoading || (!!effectiveChildId && reportsLoading);
  const queryError = childrenError ?? reportsError;
  const error = queryError ? toApiError(queryError).message : null;

  const selected = children.find((child) => child.id === effectiveChildId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("parentDescription")}</CardDescription>
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
          selectedChildId={effectiveChildId}
          onSelect={setSelectedChildId}
          t={t}
        />
        <ParentReportList
          childName={selected?.name ?? null}
          loading={loading}
          reports={reports}
          t={t}
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
  t,
}: {
  children: ParentChildSummary[];
  loading: boolean;
  onSelect: (childId: string) => void;
  selectedChildId: string | null;
  t: TFunction<"reports">;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("children")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {children.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            {t("noLinkedChildren")}
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
  t,
}: {
  childName: string | null;
  loading: boolean;
  reports: DailyReportListResponse;
  t: TFunction<"reports">;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {childName ? t("childReports", { name: childName }) : t("reports")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <KidsLoader label={t("loading")} size="sm" />
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noPublishedReports")}
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
                      {report.teacherNote || reportItemSummary(report, t)}
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
