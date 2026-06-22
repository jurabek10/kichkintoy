import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCalendar } from '@/components/calendar/event-calendar';
import { ScheduleRow } from '@/components/calendar/schedule-row';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useMonthSchedule } from '@/data/calendar';
import { formatMonthYear, parseIsoDate, todayIsoDate } from '@/lib/date';

/** Parent calendar (일정표): an attendance-style month grid that marks days with
 *  events or birthdays, with the selected month's schedule listed beneath. */
export default function CalendarScreen() {
  const { t, i18n } = useTranslation(['nav', 'app']);
  const today = parseIsoDate(todayIsoDate());
  const [month, setMonth] = useState({ year: today.year, monthIndex: today.monthIndex });
  const { data, isPending } = useMonthSchedule(month.year, month.monthIndex);
  const { items, byDay } = data;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.calendar', { ns: 'nav' })} back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <EventCalendar value={month} onChange={setMonth} byDay={byDay} />

        <Text className="mt-1 px-1 text-lg font-extrabold text-foreground">
          {formatMonthYear(month.year, month.monthIndex, i18n.language)}
        </Text>

        {isPending ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('schedule.empty', { ns: 'app' })}
            body={t('schedule.emptyBody', { ns: 'app' })}
          />
        ) : (
          <View className="rounded-2xl bg-card px-4">
            {items.map((item, index) => (
              <ScheduleRow
                key={item.id}
                item={item}
                lang={i18n.language}
                last={index === items.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
