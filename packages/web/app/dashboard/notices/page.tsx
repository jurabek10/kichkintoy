"use client";

import { ParentNotices } from "./_components/parent-notices";
import { StaffNotices } from "./_components/staff-notices";
import { useSession } from "@/lib/session";

export default function NoticesPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") {
    return <ParentNotices />;
  }

  return (
    <StaffNotices
      centerId={session.membership.centerId}
      director={session.user.role === "director"}
    />
  );
}
