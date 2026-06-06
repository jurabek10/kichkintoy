"use client";

import { ParentMeals } from "./_components/parent-meals";
import { StaffMeals } from "./_components/staff-meals";
import { useSession } from "@/lib/session";

export default function MealsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentMeals />;

  return <StaffMeals centerId={session.membership.centerId} />;
}
