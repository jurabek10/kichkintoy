"use client";

import { ParentCalendar } from "./_components/parent-calendar";
import { StaffCalendar } from "./_components/staff-calendar";
import { useSession } from "@/lib/session";

export default function CalendarPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentCalendar />;

  return (
    <StaffCalendar
      centerId={session.membership.centerId}
      role={session.user.role}
    />
  );
}
