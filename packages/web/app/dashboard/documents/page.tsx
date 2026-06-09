"use client";

import { DirectorDocuments } from "./_components/director-documents";
import { ParentDocuments } from "./_components/parent-documents";
import { TeacherDocuments } from "./_components/teacher-documents";
import { useSession } from "@/lib/session";

export default function DocumentsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentDocuments />;
  if (session.user.role === "teacher") {
    return <TeacherDocuments centerId={session.membership.centerId} />;
  }
  return <DirectorDocuments centerId={session.membership.centerId} />;
}
