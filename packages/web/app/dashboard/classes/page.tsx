"use client";

import { useSession } from "@/lib/session";
import { DirectorClasses } from "./DirectorClasses";
import { TeacherClasses } from "./TeacherClasses";

export default function ClassesPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "teacher") {
    return <TeacherClasses />;
  }

  return <DirectorClasses centerId={session.membership.centerId} />;
}
