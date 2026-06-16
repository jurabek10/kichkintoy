import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { FeatureGrid } from './feature-grid';

type CenterCardProps = {
  centerName: string;
  childClassName?: string;
};

/** The center block: name + class + the feature shortcut grid. */
export function CenterCard({ centerName, childClassName }: CenterCardProps) {
  const { t } = useTranslation('app');
  return (
    <Card className="mt-3">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-lg font-extrabold text-daycare">{centerName}</Text>
        <Button label={t('actions.save')} variant="soft" />
      </View>
      <Text className="mt-1 text-sm text-muted">
        {t('parentHome.childClass', { name: childClassName })}
      </Text>
      <FeatureGrid />
    </Card>
  );
}
