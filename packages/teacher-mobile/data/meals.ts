/**
 * Meals (식단) data access — staff/author side. The oRPC queries and mutations a
 * teacher uses to post the daily menu, share food photos, and record each child's
 * eating status, plus the mappers that turn API responses into the view-model
 * shapes the screens render. Mirrors the web dashboard meals feature; the server
 * scopes the staff list and audience to the classes she teaches.
 */
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateMealPostInput, MealEatingStatus } from '@kichkintoy/shared';
import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { useCenterId } from '@/data/teacher';
import { formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys, teacherQueryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiMealSummary = Awaited<ReturnType<typeof orpc.meals.staffList>>[number];
type ApiMealDetail = Awaited<ReturnType<typeof orpc.meals.detail>>;
type ApiAudience = Awaited<ReturnType<typeof orpc.meals.audience>>;

// --- View models ----------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealStatus = 'draft' | 'published';
export type MealAudienceType = 'center' | 'class';
export type MealMedia = { id: string; assetId: string; mediaType: string };

export type StaffMealSummary = {
  id: string;
  mealDate: string; // "YYYY-MM-DD"
  dateLabel: string;
  mealType: MealType;
  menuText: string;
  allergyNote: string | null;
  status: MealStatus;
  audienceType: MealAudienceType;
  classes: { id: string; name: string }[];
  className: string;
  cover: MealMedia | null;
  mediaCount: number;
  servedCount: number;
};

export type MealChildStatusView = {
  childId: string;
  name: string;
  className: string | null;
  status: MealEatingStatus;
};

export type StaffMealDetail = StaffMealSummary & {
  centerName: string;
  authorName: string;
  media: MealMedia[];
  childStatuses: MealChildStatusView[];
};

/** Display order for a day's meals. */
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** The `eatingStatus.*` translation key for a raw snake_case status. */
export function eatingStatusKey(status: MealEatingStatus): string {
  if (status === 'ate_all') return 'eatingStatus.ateAll';
  if (status === 'ate_most') return 'eatingStatus.ateMost';
  if (status === 'ate_some') return 'eatingStatus.ateSome';
  return 'eatingStatus.didNotEat';
}

// --- Mappers ---------------------------------------------------------------

function toMedia(media: { id: string; assetId: string; mediaType: string }): MealMedia {
  return { id: media.id, assetId: media.assetId, mediaType: media.mediaType };
}

function toSummary(meal: ApiMealSummary): StaffMealSummary {
  return {
    id: meal.id,
    mealDate: meal.mealDate,
    dateLabel: formatLongDate(meal.mealDate, i18n.language),
    mealType: meal.mealType,
    menuText: meal.menuText,
    allergyNote: meal.allergyNote,
    status: meal.status,
    audienceType: meal.audienceType,
    classes: meal.classes.map((klass) => ({ id: klass.id, name: klass.name })),
    className: meal.classes.map((klass) => klass.name).join(', '),
    cover: meal.coverMedia ? toMedia(meal.coverMedia) : null,
    mediaCount: meal.mediaCount,
    servedCount: meal.childStatusCount,
  };
}

function toDetail(meal: ApiMealDetail): StaffMealDetail {
  return {
    ...toSummary(meal),
    centerName: meal.centerName,
    authorName: meal.author.fullName,
    media: meal.media.map(toMedia),
    childStatuses: meal.childStatuses.map((status) => ({
      childId: status.child.id,
      name: status.child.name,
      className: status.child.className,
      status: status.status,
    })),
  };
}

// --- Hooks -----------------------------------------------------------------

/** Every menu the teacher has posted, newest first (breakfast → dinner within a day). */
export function useStaffMeals(): Query<StaffMealSummary[]> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: teacherQueryKeys.meals('all'),
    queryFn: () => orpc.meals.staffList({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  const data = (query.data ?? [])
    .map(toSummary)
    .sort((a, b) => {
      if (a.mealDate !== b.mealDate) return b.mealDate.localeCompare(a.mealDate);
      return MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType);
    });
  return { data, isPending: !!centerId && query.isPending };
}

export function useStaffMeal(mealId: string): Query<StaffMealDetail | null> {
  const query = useQuery({
    queryKey: mealDetailKey(mealId),
    queryFn: () => orpc.meals.detail({ mealId }),
    enabled: !!mealId,
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: !!mealId && query.isPending };
}

/** Classes the teacher may post a menu to. */
export function useMealAudience(): Query<ApiAudience> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: [...teacherQueryKeys.meals('audience'), centerId] as const,
    queryFn: () => orpc.meals.audience({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  return {
    data: query.data ?? { classes: [], children: [] },
    isPending: !!centerId && query.isPending,
  };
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMealPostInput) => orpc.meals.create(input),
    onSuccess: (meal) => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'meals'] });
      queryClient.setQueryData(mealDetailKey(meal.id), meal);
    },
  });
}

export function usePublishMeal(mealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.meals.publish({ mealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'meals'] });
      queryClient.invalidateQueries({ queryKey: mealDetailKey(mealId) });
    },
  });
}

export function useDeleteMeal(mealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.meals.delete({ mealId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher', 'meals'] }),
  });
}

/** Save each child's eating status for a meal. */
export function useSetMealStatuses(mealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statuses: { childId: string; status: MealEatingStatus }[]) =>
      orpc.meals.setChildStatuses({ mealId, body: { statuses } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'meals'] });
      queryClient.invalidateQueries({ queryKey: mealDetailKey(mealId) });
    },
  });
}

/** Resolve signed download URLs for a set of meal media, aligned to input order. */
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

function mealDetailKey(mealId: string) {
  return ['teacher', 'meal', mealId] as const;
}
