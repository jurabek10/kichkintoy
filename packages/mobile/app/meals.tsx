import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealCard } from '@/components/meal-card';
import { PhotoViewer } from '@/components/photo-viewer';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useMealsByDate } from '@/data/parent';
import { formatLongDate, weekdayLong } from '@/lib/date';

export default function MealsScreen() {
  const { t, i18n } = useTranslation(['nav', 'meals']);
  const { data: days, isPending } = useMealsByDate();
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  function openPhotos(photos: string[]) {
    setViewerPhotos(photos);
    setViewerIndex(0);
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.meals', { ns: 'nav' })} back />

      {isPending ? (
        <Loader />
      ) : days.length === 0 ? (
        <ScrollView contentContainerClassName="p-4">
          <EmptyState
            icon="restaurant-outline"
            title={t('empty.parentTitle', { ns: 'meals' })}
            body={t('empty.parentBody', { ns: 'meals' })}
          />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 p-4">
          {days.map((day) => (
            <View key={day.date} className="gap-3">
              <Text className="text-base font-bold text-foreground">
                {formatLongDate(day.date, i18n.language)} · {weekdayLong(day.date, i18n.language)}
              </Text>
              {day.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onOpenPhoto={() => openPhotos(meal.photos)} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <PhotoViewer photos={viewerPhotos} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </SafeAreaView>
  );
}
