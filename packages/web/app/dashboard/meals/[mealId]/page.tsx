"use client";

import { useParams } from "next/navigation";
import { MealDetailScreen } from "../_components/meal-detail-screen";

export default function MealDetailPage() {
  const params = useParams<{ mealId: string }>();
  return <MealDetailScreen mealId={params.mealId} />;
}
