"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Utensils } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { MealCard } from "./meal-card";

export function StaffMeals({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("meals");
  const [date, setDate] = useState(todayIso());
  const queryInput = { centerId: centerId ?? "", date };
  const {
    data: meals = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.meals.staffList(queryInput),
    queryFn: () => orpc.meals.staffList({ centerId: centerId!, date }),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[155px]"
            />
            <Button asChild>
              <Link href="/dashboard/meals/new">
                <Plus className="h-4 w-4" />
                {t("newMeal")}
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">
          {t("loading")}
        </Card>
      ) : meals.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Utensils className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("empty.staffTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("empty.staffBody")}
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
