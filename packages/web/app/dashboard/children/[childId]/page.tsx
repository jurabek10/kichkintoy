"use client";

import { useParams } from "next/navigation";
import { DirectorChildDetail } from "./DirectorChildDetail";

export default function ChildProfilePage() {
  const params = useParams<{ childId: string }>();
  return <DirectorChildDetail childId={params.childId} />;
}
