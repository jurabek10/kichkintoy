import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { EatingStatusPill } from '@/components/meal/eating-status-pill';
import { SignedMealImage } from '@/components/meal/signed-meal-image';
import type { Meal, MealType } from '@/data/meals';

const AMBER = '#E8973A';

const MEAL_ICON: Record<MealType, ComponentProps<typeof Ionicons>['name']> = {
  breakfast: 'cafe',
  lunch: 'restaurant',
  snack: 'ice-cream',
  dinner: 'moon',
};

/** One meal on the parent's board: the food photo with a meal-type chip, the
 *  menu, an allergy note, and — the reason a parent looks — how their child ate.
 *  Taps through to the meal detail. */
export function MealCard({ meal, showDate = false }: { meal: Meal; showDate?: boolean }) {
  const { t } = useTranslation('meals');
  const cover = meal.media[0];

  return (
    <Link href={{ pathname: '/meals/[id]', params: { id: meal.id } }} asChild>
      <Pressable className="overflow-hidden rounded-lg border border-border bg-card active:opacity-90">
        <View>
          {cover ? (
            <SignedMealImage media={cover} className="h-52 w-full" />
          ) : (
            <View className="h-52 w-full items-center justify-center bg-segment">
              <Ionicons name="restaurant-outline" size={30} color="#AEB4BE" />
            </View>
          )}
          <View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1">
            <Ionicons name={MEAL_ICON[meal.mealType] ?? 'restaurant'} size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">{t(`mealType.${meal.mealType}`)}</Text>
          </View>
          {meal.eatingStatus !== 'notRecorded' ? (
            <View className="absolute right-2 top-2">
              <EatingStatusPill status={meal.eatingStatus} />
            </View>
          ) : null}
        </View>

        <View className="gap-2 p-3">
          {showDate ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#AEB4BE" />
              <Text numberOfLines={1} className="flex-1 text-[12px] text-muted">{meal.mealDate}</Text>
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
        </View>
      </Pressable>
    </Link>
  );
}
