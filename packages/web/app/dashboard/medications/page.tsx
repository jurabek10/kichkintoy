"use client";

import { ParentMedications } from "./_components/parent-medications";
import { StaffMedications } from "./_components/staff-medications";
import { useSession } from "@/lib/session";

export default function MedicationsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentMedications />;

  return <StaffMedications centerId={session.membership.centerId} />;
}
