import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useCalendarEvent } from '@/data/teacher';
import i18n from '@/i18n';
import { formatLongDate, formatTime, weekdayLong } from '@/lib/date';

function Row({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text className="flex-1 text-sm text-foreground">{children}</Text>
    </View>
  );
}

export default function CalendarEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('teacher');
  const { data: event, isPending } = useCalendarEvent(id ?? '');
  const lang = i18n.language;

  if (isPending) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <ScreenHeader title={t('calendar.title')} back />
        <Loader />
      </SafeAreaView>
    );
  }
  if (!event) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <ScreenHeader title={t('calendar.title')} back />
      </SafeAreaView>
    );
  }

  const date = event.startsAt.slice(0, 10);
  const audience = event.classNames.length > 0 ? event.classNames.join(', ') : t('calendar.allCenter');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('calendar.title')} back />
      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
        {event.status === 'cancelled' ? (
          <View className="mb-3 flex-row items-center gap-2 rounded-md bg-coral px-3 py-2.5">
            <Ionicons name="close-circle" size={18} color="#E8674E" />
            <Text className="flex-1 text-[13px] font-semibold text-foreground">
              {event.cancellationReason || t('calendar.cancelled')}
            </Text>
          </View>
        ) : null}

        <Card>
          <Text className="text-xl font-extrabold text-foreground">{event.title}</Text>
          <View className="mt-2 h-px bg-border" />
          <Row icon="calendar-outline">
            {weekdayLong(date, lang)}, {formatLongDate(date, lang)}
          </Row>
          <Row icon="time-outline">
            {event.allDay
              ? t('calendar.allDay')
              : `${formatTime(event.startsAt)}${event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}`}
          </Row>
          {event.locationText ? <Row icon="location-outline">{event.locationText}</Row> : null}
          <Row icon="people-outline">{audience}</Row>
        </Card>

        {event.description ? (
          <Card className="mt-3">
            <Text className="text-sm leading-6 text-foreground">{event.description}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
