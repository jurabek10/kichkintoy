import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';

/** This-month attendance summary with a progress bar. */
export function AttendanceCard({ attended, total }: { attended: number; total: number }) {
  const { t } = useTranslation('app');
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
  return (
    <Card className="mt-3">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-mint">
          <Ionicons name="checkmark-done" size={18} color="#46B06A" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-muted">
            {t('parentHome.aside.attendanceTitle')}
          </Text>
          <Text className="mt-0.5 text-base font-bold text-foreground">
            {t('parentHome.aside.attendanceValue', { attended, total })}
          </Text>
        </View>
      </View>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-segment">
        <View className="h-full rounded-full bg-[#46B06A]" style={{ width: `${pct}%` }} />
      </View>
    </Card>
  );
}
