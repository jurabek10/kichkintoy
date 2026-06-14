"use client";

import { useSearchParams } from "next/navigation";
import { ReportComposer } from "../_components/report-composer";

export default function NewReportPage() {
  const search = useSearchParams();

  return (
    <ReportComposer
      childId={search.get("childId") ?? ""}
      childName={search.get("childName")}
      centerId={search.get("centerId")}
      initialReportDate={search.get("reportDate")}
    />
  );
}
