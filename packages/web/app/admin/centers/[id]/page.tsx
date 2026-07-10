"use client";

import { useParams } from "next/navigation";
import { AdminCenterDetailScreen } from "../_components/admin-center-detail";

export default function AdminCenterDetailPage() {
  const params = useParams<{ id: string }>();
  return <AdminCenterDetailScreen centerId={params.id} />;
}
