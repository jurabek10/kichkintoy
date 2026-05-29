"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ClassReports } from "../../_components/class-reports";
import { todayIsoDate } from "../../_components/report-utils";

export default function ClassReportsPage() {
  const params = useParams<{ classId: string }>();
  const search = useSearchParams();

  return (
    <ClassReports
      classId={params.classId}
      initialDate={search.get("date") ?? todayIsoDate()}
    />
  );
}
