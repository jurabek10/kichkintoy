"use client";

import { ParentPickups } from "./_components/parent-pickups";
import { StaffPickups } from "./_components/staff-pickups";
import { useSession } from "@/lib/session";

export default function PickupsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentPickups />;

  return <StaffPickups centerId={session.membership.centerId} />;
}
