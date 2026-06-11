"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ClassReports } from "../../_components/class-reports";
import { todayIsoDate } from "../../_components/report-utils";
import { useSession } from "@/lib/session";

export default function ClassReportsPage() {
  const params = useParams<{ classId: string }>();
  const search = useSearchParams();
  const { session } = useSession();

  return (
    <ClassReports
      centerId={session?.membership.centerId ?? null}
      classId={params.classId}
      initialDate={search.get("date") ?? todayIsoDate()}
      role={session?.user.role ?? "teacher"}
    />
  );
}
