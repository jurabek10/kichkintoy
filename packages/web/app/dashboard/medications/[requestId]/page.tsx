"use client";

import { useParams } from "next/navigation";
import { MedicationDetailScreen } from "../_components/medication-detail-screen";

export default function MedicationDetailPage() {
  const params = useParams<{ requestId: string }>();
  return <MedicationDetailScreen requestId={params.requestId} />;
}
