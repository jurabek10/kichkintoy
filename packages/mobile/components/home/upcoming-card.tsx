import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import type { UpcomingEvent } from '@/data/parent';

/** Upcoming calendar events for the active child. */
export function UpcomingCard({ events }: { events: UpcomingEvent[] }) {
  const { t } = useTranslation('app');
  return (
    <Card className="mt-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-muted">{t('parentHome.aside.upcoming')}</Text>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
      </View>
      {events.length === 0 ? (
        <Text className="text-sm text-muted">{t('parentHome.aside.noUpcoming')}</Text>
      ) : (
        events.map((event) => (
          <View key={event.id} className="flex-row items-center gap-3 py-1.5">
            <View className="h-2 w-2 rounded-full bg-primary" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{event.title}</Text>
              <Text className="text-xs text-muted">{event.whenLabel}</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}
