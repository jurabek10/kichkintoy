"use client";

import { useParams } from "next/navigation";
import { PickupDetailScreen } from "../_components/pickup-detail-screen";

export default function PickupDetailPage() {
  const params = useParams<{ noticeId: string }>();
  return <PickupDetailScreen noticeId={params.noticeId} />;
}
