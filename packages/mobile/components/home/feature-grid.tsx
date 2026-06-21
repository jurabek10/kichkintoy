import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { NewBadge } from '@/components/ui/badge';
import { features, type Feature } from '@/constants/data';
import { cn } from '@/lib/utils';

/** Icons per page: a 2×4 grid. */
const PAGE_SIZE = 8;

function FeatureTile({ feature, label }: { feature: Feature; label: string }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(feature.route)} className="w-1/4 items-center gap-2">
      <View
        style={{ backgroundColor: feature.bg }}
        className="h-14 w-14 items-center justify-center rounded-2xl">
        <Ionicons name={feature.icon} size={26} color={feature.fg} />
        {feature.isNew ? <NewBadge /> : null}
      </View>
      <Text numberOfLines={1} className="px-0.5 text-[11px] text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

/** Paged 2×4 shortcut grid: each page holds 8 tiles; swipe left/right for more.
 *  Labels resolve from the shared `nav` namespace. */
export function FeatureGrid() {
  const { t } = useTranslation('nav');
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const pages: Feature[][] = [];
  for (let i = 0; i < features.length; i += PAGE_SIZE) pages.push(features.slice(i, i + PAGE_SIZE));

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width > 0) setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <View className="mt-4" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}>
        {width > 0
          ? pages.map((pageFeatures, index) => (
              <View key={index} style={{ width }} className="flex-row flex-wrap gap-y-4">
                {pageFeatures.map((feature) => (
                  <FeatureTile key={feature.key} feature={feature} label={t(feature.navKey)} />
                ))}
              </View>
            ))
          : null}
      </ScrollView>

      {pages.length > 1 ? (
        <View className="mt-3 flex-row justify-center gap-1.5">
          {pages.map((_, index) => (
            <View
              key={index}
              className={cn(
                'h-1.5 rounded-full',
                index === page ? 'w-4 bg-primary' : 'w-1.5 bg-segment',
              )}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
