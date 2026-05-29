"use client";

import { useParams } from "next/navigation";
import { useSession } from "@/lib/session";
import { DirectorClassDetail } from "./DirectorClassDetail";
import { TeacherClassDetail } from "./TeacherClassDetail";

export default function ClassDetailPage() {
  const { session } = useSession();
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  if (!session || !classId) return null;

  if (session.user.role === "teacher") {
    return <TeacherClassDetail classId={classId} />;
  }

  return (
    <DirectorClassDetail
      centerId={session.membership.centerId}
      classId={classId}
    />
  );
}
