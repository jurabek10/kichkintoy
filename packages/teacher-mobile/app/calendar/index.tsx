import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChips } from '@/components/common/filter-chips';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useStaffCalendar } from '@/data/teacher';
import i18n from '@/i18n';
import { formatDayMonth, formatTime, weekdayShort } from '@/lib/date';

type ApiEvent = NonNullable<ReturnType<typeof useStaffCalendar>['data']>[number];

function EventCard({ event }: { event: ApiEvent }) {
  const router = useRouter();
  const { t } = useTranslation('teacher');
  const lang = i18n.language;
  const cancelled = event.status === 'cancelled';
  const audience =
    event.classNames.length > 0 ? event.classNames.join(', ') : t('calendar.allCenter');

  return (
    <Pressable onPress={() => router.push({ pathname: '/calendar/[id]', params: { id: event.id } })}>
      <Card className="flex-row gap-3">
        <View className="w-12 items-center rounded-md bg-sky py-2">
          <Text className="text-[11px] font-bold uppercase text-sky-ink">
            {weekdayShort(event.startsAt.slice(0, 10), lang)}
          </Text>
          <Text className="text-lg font-extrabold text-sky-ink">
            {Number(event.startsAt.slice(8, 10))}
          </Text>
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className={`text-[15px] font-bold ${cancelled ? 'text-muted line-through' : 'text-foreground'}`}>
            {event.title}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted">
            {event.allDay ? t('calendar.allDay') : formatTime(event.startsAt)} · {formatDayMonth(event.startsAt, lang)}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-1">
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text numberOfLines={1} className="flex-1 text-[12px] text-muted">{audience}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const { t } = useTranslation('teacher');
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const query = useStaffCalendar();

  const events = useMemo(() => {
    const now = Date.now();
    const all = (query.data ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return filter === 'upcoming'
      ? all.filter((e) => new Date(e.startsAt).getTime() >= now - 86_400_000)
      : all.filter((e) => new Date(e.startsAt).getTime() < now - 86_400_000).reverse();
  }, [query.data, filter]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('calendar.title')} back />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming', label: t('calendar.upcoming') },
          { value: 'past', label: t('calendar.past') },
        ]}
      />
      {query.isPending ? (
        <Loader />
      ) : events.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="calendar-outline" title={t('calendar.empty')} body={t('calendar.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
