"use client";

import { DirectorSpecialClasses } from "./_components/director-special-classes";
import { ParentSpecialClasses } from "./_components/parent-special-classes";
import { TeacherSpecialClasses } from "./_components/staff-special-classes";
import { useSession } from "@/lib/session";

export default function SpecialClassesPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") {
    return <ParentSpecialClasses />;
  }

  if (session.user.role === "director") {
    return <DirectorSpecialClasses centerId={session.membership.centerId} />;
  }

  return <TeacherSpecialClasses centerId={session.membership.centerId} />;
}
