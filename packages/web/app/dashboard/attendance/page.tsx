"use client";

import { ParentAttendance } from "./_components/parent-attendance";
import { StaffAttendance } from "./_components/staff-attendance";
import { useSession } from "@/lib/session";

export default function AttendancePage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentAttendance />;

  return (
    <StaffAttendance
      centerId={session.membership.centerId}
      role={session.user.role}
    />
  );
}
