"use client";

import { CalendarWorkspace } from "./_components/calendar-workspace";
import { useSession } from "@/lib/session";

export default function CalendarPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") {
    return <CalendarWorkspace mode="parent" centerId={null} />;
  }

  return (
    <CalendarWorkspace mode="staff" centerId={session.membership.centerId} />
  );
}
