"use client";

import { TeachersScreen } from "./_components/teachers-screen";
import { useSession } from "@/lib/session";

export default function TeachersPage() {
  const { session } = useSession();
  if (!session) return null;

  return <TeachersScreen centerId={session.membership.centerId} />;
}
