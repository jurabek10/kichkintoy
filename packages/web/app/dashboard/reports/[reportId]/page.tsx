"use client";

import { useParams } from "next/navigation";
import { ReportDetailScreen } from "../_components/report-detail-screen";
import { useSession } from "@/lib/session";

export default function ReportDetailPage() {
  const { session } = useSession();
  const params = useParams<{ reportId: string }>();

  if (!session) return null;

  return (
    <ReportDetailScreen
      isParent={session.user.role === "parent"}
      reportId={params.reportId}
    />
  );
}
