"use client";

import { MealComposer } from "../_components/meal-composer";
import { useSession } from "@/lib/session";

export default function NewMealPage() {
  const { session } = useSession();
  if (!session || session.user.role === "parent") return null;

  return (
    <MealComposer
      centerId={session.membership.centerId}
      director={session.user.role === "director"}
    />
  );
}
