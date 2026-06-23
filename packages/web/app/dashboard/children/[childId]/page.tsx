"use client";

import { useParams } from "next/navigation";
import { ChildDetailScreen } from "./child-detail-screen";

export default function ChildProfilePage() {
  const params = useParams<{ childId: string }>();
  return <ChildDetailScreen childId={params.childId} />;
}
