"use client";

import Link from "next/link";
import { ImageIcon, Utensils } from "lucide-react";
import type { MealPostSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { SignedMealImage } from "./signed-meal-image";
import {
  eatingStatusLabelKey,
  mealAudienceLabelKey,
  mealStatusLabelKey,
  mealTypeLabelKey,
} from "./meal-labels";

export function MealCard({ meal }: { meal: MealPostSummary }) {
  const { t } = useLayoutTranslation("meals");
  return (
    <Link href={`/dashboard/meals/${meal.id}`} className="block">
      <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-pop">
        {meal.coverMedia ? (
          <div className="aspect-[16/9] bg-muted">
            <SignedMealImage
              mediaAssetId={meal.coverMedia.assetId}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-muted">
            <Utensils className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <CardContent className="grid gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{t(mealTypeLabelKey(meal.mealType))}</Badge>
            <Badge variant="outline">{formatDate(meal.mealDate)}</Badge>
            <Badge variant="outline">
              {t(mealAudienceLabelKey(meal.audienceType))}
            </Badge>
            <Badge variant="outline">
              {t(mealStatusLabelKey(meal.status))}
            </Badge>
          </div>
          <div>
            <p className="line-clamp-2 text-sm font-semibold">
              {meal.menuText}
            </p>
            {meal.allergyNote ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {t("labels.allergy")}: {meal.allergyNote}
              </p>
            ) : null}
          </div>
          {meal.myChildStatuses?.length ? (
            <div className="flex flex-wrap gap-2">
              {meal.myChildStatuses.map((status) => (
                <Badge key={status.id} variant="secondary">
                  {status.child.name}: {t(eatingStatusLabelKey(status.status))}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {meal.classes.length > 0
                ? meal.classes.map((klass) => klass.name).join(", ")
                : meal.centerName}
            </span>
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {meal.mediaCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
