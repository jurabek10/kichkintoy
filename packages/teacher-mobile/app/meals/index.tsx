import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffMeals } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';

const MEAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'cafe',
  lunch: 'restaurant',
  snack: 'ice-cream',
  dinner: 'moon',
};

export default function MealsScreen() {
  const { t } = useTranslation(['teacher', 'meals']);
  const date = todayIsoDate();
  const query = useStaffMeals(date);
  const meals = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('meals.title')} back />
      {query.isPending ? (
        <Loader />
      ) : meals.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="restaurant-outline" title={t('meals.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {meals.map((meal) => (
            <Card key={meal.id}>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-sunshine">
                  <Ionicons name={MEAL_ICON[meal.mealType] ?? 'restaurant'} size={18} color="#F4A621" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-foreground">
                    {t(`mealTypes.${meal.mealType}`, { ns: 'meals', defaultValue: meal.mealType })}
                  </Text>
                  {meal.childStatusCount > 0 ? (
                    <Text className="text-[12px] text-muted">
                      {t('meals.servedCount', { count: meal.childStatusCount })}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text className="mt-3 text-sm leading-5 text-foreground">{meal.menuText}</Text>
              {meal.allergyNote ? (
                <View className="mt-3 flex-row items-center gap-2 rounded-md bg-coral px-3 py-2">
                  <Ionicons name="alert-circle" size={16} color="#E8674E" />
                  <Text className="flex-1 text-[12px] text-foreground">{meal.allergyNote}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
