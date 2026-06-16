import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';

import type { Meal } from '@/constants/data';

const AMBER = '#E8973A';

type MealCardProps = {
  meal: Meal;
  onOpenPhoto: () => void;
};

/** One meal (breakfast/lunch/snack): food photo with a meal-type chip, menu,
 *  allergy note and the child's eating status. */
export function MealCard({ meal, onOpenPhoto }: MealCardProps) {
  const { t } = useTranslation('meals');
  const cover = meal.photos[0];

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <Pressable onPress={onOpenPhoto}>
        <Image source={{ uri: cover }} className="h-52 w-full bg-segment" />
        <View className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2.5 py-1">
          <Text className="text-xs font-bold text-white">{t(`mealType.${meal.mealType}`)}</Text>
        </View>
        {meal.photos.length > 1 ? (
          <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-md bg-black/55 px-2 py-1">
            <Ionicons name="images" size={12} color="#FFFFFF" />
            <Text className="text-xs font-semibold text-white">{meal.photos.length}</Text>
          </View>
        ) : null}
      </Pressable>

      <View className="gap-2 p-3">
        <Text className="text-[15px] leading-6 text-foreground">{meal.menuText}</Text>

        {meal.allergyNote ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle-outline" size={14} color={AMBER} />
            <Text className="flex-1 text-xs text-muted">
              {t('labels.allergy')}: {meal.allergyNote}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
