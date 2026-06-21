/**
 * Meals (식단) data access — the oRPC queries for the parent meals list, the
 * mappers that turn the API responses into the view-model shapes the screen
 * renders, plus the signed-media resolver. Mirrors the daily reports / notices
 * / albums data layers.
 *
 * Called without a date, `meals.parentList` returns the child's full published
 * meal history newest-first (mirroring the daily reports list), so we fetch it
 * in one query and group the meals by date for the screen.
 */
import { useQueries, useQuery } from '@tanstack/react-query';

import { useCurrentChild, type Query } from '@/data/parent';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive the API shape from the typed client so we never drift from the contract.
type ApiMealSummary = Awaited<ReturnType<typeof orpc.meals.parentList>>[number];

// --- View models ----------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealEatingStatus = 'ateAll' | 'ateMost' | 'ateSome' | 'didNotEat' | 'notRecorded';
export type MealMedia = { id: string; assetId: string; mediaType: string };

export type Meal = {
  id: string;
  mealDate: string; // local "YYYY-MM-DD"
  mealType: MealType;
  menuText: string;
  allergyNote: string | null;
  eatingStatus: MealEatingStatus; // the active child's status for this meal
  media: MealMedia[];
};

export type MealDay = { date: string; meals: Meal[] };

/** Display order for a day's meals. */
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** Map the API's snake_case eating status onto the screen's camelCase enum. */
const EATING_STATUS: Record<string, MealEatingStatus> = {
  ate_all: 'ateAll',
  ate_most: 'ateMost',
  ate_some: 'ateSome',
  did_not_eat: 'didNotEat',
};

// --- Mappers --------------------------------------------------------------

function toMedia(media: { id: string; assetId: string; mediaType: string }): MealMedia {
  return { id: media.id, assetId: media.assetId, mediaType: media.mediaType };
}

/** The active child's eating status for a meal, or "notRecorded" when none. */
function eatingStatusFor(meal: ApiMealSummary): MealEatingStatus {
  const status = meal.myChildStatuses?.[0]?.status;
  return status ? (EATING_STATUS[status] ?? 'notRecorded') : 'notRecorded';
}

function toMeal(meal: ApiMealSummary): Meal {
  return {
    id: meal.id,
    mealDate: meal.mealDate,
    mealType: meal.mealType,
    menuText: meal.menuText,
    allergyNote: meal.allergyNote,
    eatingStatus: eatingStatusFor(meal),
    // The list payload only carries the cover; the screen shows that one photo.
    media: meal.coverMedia ? [toMedia(meal.coverMedia)] : [],
  };
}

/** Group a flat, date-sorted meal list into days (newest first), each day's
 *  meals in breakfast → dinner order. */
function groupByDate(meals: Meal[]): MealDay[] {
  const byDate = new Map<string, Meal[]>();
  for (const meal of meals) {
    const list = byDate.get(meal.mealDate) ?? [];
    list.push(meal);
    byDate.set(meal.mealDate, list);
  }
  return [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      meals: byDate
        .get(date)!
        .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)),
    }));
}

// --- Hooks ----------------------------------------------------------------

export function useMealsByDate(): Query<MealDay[]> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';

  const query = useQuery({
    queryKey: queryKeys.meals.parentList(childId),
    queryFn: () => orpc.meals.parentList({ childId }),
    enabled: !!childId,
  });

  const days = groupByDate((query.data ?? []).map(toMeal));

  return { data: days, isPending: child.isPending || (!!childId && query.isPending) };
}

/** Resolve signed download URLs for a set of meal media (shares the cache with
 *  any SignedMealImage rendering the same asset). Returns URLs aligned to the
 *  input order; entries are null until their query resolves. */
export function useSignedMealUrls(media: MealMedia[]): (string | null)[] {
  const results = useQueries({
    queries: media.map((item) => ({
      queryKey: queryKeys.media.download(item.assetId),
      queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: item.assetId }),
      staleTime: 4 * 60 * 1000,
    })),
  });
  return results.map((result) => result.data?.downloadUrl ?? null);
}
