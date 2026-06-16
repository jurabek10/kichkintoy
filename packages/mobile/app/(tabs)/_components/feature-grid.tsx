import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { NewBadge } from '@/components/ui/badge';
import { features, type Feature } from '@/constants/data';

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

/** 2×4 grid of section shortcuts; labels resolve from the shared `nav` namespace. */
export function FeatureGrid() {
  const { t } = useTranslation('nav');
  return (
    <View className="mt-4 flex-row flex-wrap gap-y-4">
      {features.map((feature) => (
        <FeatureTile key={feature.key} feature={feature} label={t(feature.navKey)} />
      ))}
    </View>
  );
}
