import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/screen-header';

export default function PickupsScreen() {
  const { t } = useTranslation(['nav', 'app']);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.pickups', { ns: 'nav' })} />
      <ScrollView contentContainerClassName="p-4">
        <EmptyState
          icon="walk-outline"
          title={t('parentHome.caughtUpTitle', { ns: 'app' })}
          body={t('parentHome.caughtUp', { ns: 'app' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
