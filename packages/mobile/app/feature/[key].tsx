import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';

const ICONS: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  calendar: 'calendar-outline',
  meals: 'restaurant-outline',
  medications: 'medkit-outline',
  documents: 'document-text-outline',
};

export default function FeatureScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t } = useTranslation(['nav', 'app']);

  const title = t(`items.${key}`, { ns: 'nav', defaultValue: String(key ?? '') });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={title} back />
      <ScrollView contentContainerClassName="p-4">
        <EmptyState
          icon={ICONS[String(key)] ?? 'sparkles-outline'}
          title={t('parentHome.caughtUpTitle', { ns: 'app' })}
          body={t('parentHome.caughtUp', { ns: 'app' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
