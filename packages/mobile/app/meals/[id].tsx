import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EatingStatusPill } from '@/components/meal/eating-status-pill';
import { SignedMealImage } from '@/components/meal/signed-meal-image';
import { PhotoViewer } from '@/components/common/photo-viewer';
import { Loader } from '@/components/ui/loader';
import { useMeal, useSignedMealUrls } from '@/data/meals';
import { formatLongDate, weekdayLong } from '@/lib/date';
import { cn } from '@/lib/utils';

const SUN = '#F4A621';

function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: SUN }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'sun' }) {
  return (
    <View className={cn('rounded-full px-2.5 py-1', tone === 'sun' ? 'bg-sunshine' : 'bg-pill')}>
      <Text className={cn('text-[11px] font-bold', tone === 'sun' ? 'text-sunshine-ink' : 'text-muted')}>
        {label}
      </Text>
    </View>
  );
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('meals');
  const { data: meal, isPending } = useMeal(String(id));
  const photoUrls = useSignedMealUrls(meal?.media ?? []);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!meal) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Badges + menu */}
        <View className="gap-3 bg-card px-4 pb-4 pt-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={t(`mealType.${meal.mealType}`)} tone="sun" />
            <Badge label={`${formatLongDate(meal.mealDate, i18n.language)} · ${weekdayLong(meal.mealDate, i18n.language)}`} />
            {meal.className ? <Badge label={meal.className} /> : null}
          </View>
          <Text className="text-[17px] font-bold leading-6 text-foreground">{meal.menuText}</Text>
        </View>

        {/* Photos */}
        {meal.media.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5 p-4">
            {meal.media.map((media, index) => (
              <Pressable
                key={media.id}
                className="aspect-square w-[31.8%]"
                onPress={() => setViewerIndex(index)}>
                <SignedMealImage media={media} className="h-full w-full rounded-md" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Allergy */}
        {meal.allergyNote ? (
          <View className="mx-4 mt-1 flex-row items-center gap-2 rounded-md bg-coral px-3 py-2.5">
            <Ionicons name="alert-circle" size={16} color="#E8674E" />
            <Text className="flex-1 text-[13px] text-foreground">
              {t('labels.allergy')}: {meal.allergyNote}
            </Text>
          </View>
        ) : null}

        {/* Eating status — read-only, how the child ate */}
        <View className="mx-4 mt-6 rounded-2xl border border-border bg-card p-4">
          <Text className="text-base font-bold text-foreground">{t('detail.eatingStatus')}</Text>
          {meal.childStatuses.length === 0 ? (
            <Text className="mt-3 text-[13px] text-muted">{t('detail.noEatingStatus')}</Text>
          ) : (
            <View className="mt-1">
              {meal.childStatuses.map((child, index) => (
                <View
                  key={child.childId}
                  className={cn(
                    'flex-row items-center gap-3 py-3',
                    index > 0 && 'border-t border-border',
                  )}>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-foreground">{child.name}</Text>
                    <Text className="text-[11px] text-muted">{child.className ?? t('detail.noClass')}</Text>
                  </View>
                  {child.status === 'notRecorded' ? (
                    <View className="rounded-full bg-pill px-3 py-1.5">
                      <Text className="text-[12px] font-bold text-muted">{t('detail.notRecorded')}</Text>
                    </View>
                  ) : (
                    <EatingStatusPill status={child.status} size="md" />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PhotoViewer
        photos={photoUrls.map((url) => url ?? '')}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
