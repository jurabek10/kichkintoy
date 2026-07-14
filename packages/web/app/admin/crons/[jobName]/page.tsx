"use client";

import { useParams } from "next/navigation";
import { AdminCronDetailScreen } from "../_components/admin-cron-detail-screen";

export default function AdminCronDetailPage() {
  const params = useParams<{ jobName: string }>();
  return <AdminCronDetailScreen jobName={decodeURIComponent(params.jobName)} />;
}
