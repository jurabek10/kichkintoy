import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { SignedMealImage } from '@/components/meal/signed-meal-image';
import type { StaffMealSummary } from '@/data/meals';

const AMBER = '#E8973A';

const MEAL_ICON: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  breakfast: 'cafe',
  lunch: 'restaurant',
  snack: 'ice-cream',
  dinner: 'moon',
};

/** One posted meal on the teacher's board — the parent's food-photo card with a
 *  meal-type chip, plus a staff meta row (date · audience), a draft pill, and the
 *  count of children whose eating was recorded. Taps through to the detail. */
export function MealCard({ meal, showDate = true }: { meal: StaffMealSummary; showDate?: boolean }) {
  const { t } = useTranslation('meals');
  const cover = meal.cover;
  const audience = meal.className || t('audience.wholeCenter');

  return (
    <Link href={{ pathname: '/meals/[id]', params: { id: meal.id } }} asChild>
      <Pressable className="overflow-hidden rounded-lg border border-border bg-card active:opacity-90">
        <View>
          {cover ? (
            <SignedMealImage media={cover} className="h-48 w-full" />
          ) : (
            <View className="h-48 w-full items-center justify-center bg-segment">
              <Ionicons name="restaurant-outline" size={30} color="#AEB4BE" />
            </View>
          )}
          <View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1">
            <Ionicons name={MEAL_ICON[meal.mealType] ?? 'restaurant'} size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">{t(`mealType.${meal.mealType}`)}</Text>
          </View>
          {meal.status === 'draft' ? (
            <View className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-white">{t('status.draft')}</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-2 p-3">
          {showDate ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#AEB4BE" />
              <Text numberOfLines={1} className="flex-1 text-[12px] text-muted">
                {meal.dateLabel} · {audience}
              </Text>
            </View>
          ) : null}

          <Text numberOfLines={3} className="text-[15px] leading-6 text-foreground">{meal.menuText}</Text>

          {meal.allergyNote ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle-outline" size={14} color={AMBER} />
              <Text numberOfLines={1} className="flex-1 text-xs text-muted">
                {t('labels.allergy')}: {meal.allergyNote}
              </Text>
            </View>
          ) : null}

          {meal.servedCount > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="people-outline" size={13} color="#AEB4BE" />
              <Text className="text-xs text-muted">{t('servedCount', { count: meal.servedCount })}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
