"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Utensils } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { MealCard } from "./meal-card";

export function ParentMeals() {
  const [date, setDate] = useState(todayIso());
  const queryInput = { date };
  const {
    data: meals = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.meals.parentList(queryInput),
    queryFn: () => orpc.meals.parentList({ date }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Meals</CardTitle>
          <DatePicker
            value={date}
            onValueChange={setDate}
            className="w-[155px]"
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : meals.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Utensils className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No meals yet</p>
          <p className="text-sm text-muted-foreground">
            Today's food menu will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
