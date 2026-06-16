import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';

/** "Today / your child's day" greeting card under the header. */
export function GreetingBanner() {
  const { t } = useTranslation('app');
  return (
    <Card className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-sunshine">
        <Ionicons name="sunny" size={22} color="#F0A93B" />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-base font-bold text-foreground">{t('parentHome.today')}</Text>
        <Text className="text-[13px] text-muted">{t('parentHome.todaySub')}</Text>
      </View>
    </Card>
  );
}
