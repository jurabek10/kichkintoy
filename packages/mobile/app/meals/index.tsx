import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealCard } from '@/components/meal/meal-card';
import { PhotoViewer } from '@/components/common/photo-viewer';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useMealsByDate, useSignedMealUrls, type Meal } from '@/data/meals';
import { formatLongDate, weekdayLong } from '@/lib/date';

export default function MealsScreen() {
  const { t, i18n } = useTranslation(['nav', 'meals']);
  const queryClient = useQueryClient();
  const { data: days, isPending } = useMealsByDate();
  const [refreshing, setRefreshing] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Resolve every meal's cover up front; the cards and the viewer share these
  // signed URLs through the same query cache, so nothing is fetched twice.
  const covers = days.flatMap((day) => day.meals.map((meal) => meal.media[0]).filter(Boolean));
  const coverUrls = useSignedMealUrls(covers);
  const urlByAsset = new Map(covers.map((media, index) => [media.assetId, coverUrls[index]]));

  function openPhotos(meal: Meal) {
    const urls = meal.media
      .map((media) => urlByAsset.get(media.assetId))
      .filter((url): url is string => !!url);
    if (urls.length === 0) return;
    setViewerPhotos(urls);
    setViewerIndex(0);
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.meals', { ns: 'nav' })} back />

      {isPending ? (
        <Loader />
      ) : days.length === 0 ? (
        <ScrollView
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          <EmptyState
            icon="restaurant-outline"
            title={t('empty.parentTitle', { ns: 'meals' })}
            body={t('empty.parentBody', { ns: 'meals' })}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-6 p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          {days.map((day) => (
            <View key={day.date} className="gap-3">
              <Text className="text-base font-bold text-foreground">
                {formatLongDate(day.date, i18n.language)} · {weekdayLong(day.date, i18n.language)}
              </Text>
              {day.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onOpenPhoto={() => openPhotos(meal)} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <PhotoViewer photos={viewerPhotos} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </SafeAreaView>
  );
}
