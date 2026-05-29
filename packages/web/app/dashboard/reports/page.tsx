"use client";

import { ParentReports } from "./_components/parent-reports";
import { StaffReports } from "./_components/staff-reports";
import { useSession } from "@/lib/session";

export default function ReportsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") {
    return <ParentReports />;
  }

  return (
    <StaffReports
      centerId={session.membership.centerId}
      director={session.user.role === "director"}
    />
  );
}
