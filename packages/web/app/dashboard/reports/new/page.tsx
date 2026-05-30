"use client";

import { useSearchParams } from "next/navigation";
import { ReportComposer } from "../_components/report-composer";

export default function NewReportPage() {
  const search = useSearchParams();

  return (
    <ReportComposer
      childId={search.get("childId") ?? ""}
      initialReportDate={search.get("reportDate")}
    />
  );
}
