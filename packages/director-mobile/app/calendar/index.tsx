import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCalendar, type CalendarMonth } from '@/components/calendar/event-calendar';
import { ScheduleRow } from '@/components/calendar/schedule-row';
import { FilterChips } from '@/components/common/filter-chips';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useStaffMonthSchedule, type ScheduleItem } from '@/data/calendar';
import { formatMonthYear, parseIsoDate, todayIsoDate } from '@/lib/date';

type TypeFilter = 'all' | 'events' | 'birthdays';

function matchesSearch(item: ScheduleItem, query: string): boolean {
  if (item.kind === 'birthday') return item.childName.toLowerCase().includes(query);
  return `${item.title} ${item.scopeLabel} ${item.locationText ?? ''}`.toLowerCase().includes(query);
}

export default function CalendarScreen() {
  const { t, i18n } = useTranslation('calendar');
  const router = useRouter();
  const today = parseIsoDate(todayIsoDate());
  const [month, setMonth] = useState<CalendarMonth>({ year: today.year, monthIndex: today.monthIndex });
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');

  const { data, isPending } = useStaffMonthSchedule(month.year, month.monthIndex);
  const { items, byDay } = data;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (type === 'events' && item.kind !== 'event') return false;
      if (type === 'birthdays' && item.kind !== 'birthday') return false;
      if (q && !matchesSearch(item, q)) return false;
      return true;
    });
  }, [items, type, search]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('title')}
        back
        right={
          <Pressable
            onPress={() => router.push('/calendar/new')}
            hitSlop={8}
            className="h-9 flex-row items-center gap-1 rounded-full bg-primary px-3.5">
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text numberOfLines={1} className="text-[13px] font-bold text-white">
              {t('newEvent')}
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4 pb-8">
        <EventCalendar value={month} onChange={setMonth} byDay={byDay} />

        {/* Search */}
        <View className="h-11 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchEvents')}
            placeholderTextColor={colors.textMuted}
            className="h-11 flex-1 text-[15px] text-foreground"
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View className="-mx-4">
          <FilterChips
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: t('filterAll') },
              { value: 'events', label: t('legend.events') },
              { value: 'birthdays', label: t('legend.birthdays') },
            ]}
          />
        </View>

        <Text className="px-1 text-lg font-extrabold text-foreground">
          {formatMonthYear(month.year, month.monthIndex, i18n.language)}
        </Text>

        {isPending ? (
          <Loader />
        ) : visible.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('noEventsThisMonth')} body={t('showWholeMonth')} />
        ) : (
          <View className="rounded-2xl bg-card px-4">
            {visible.map((item, index) => (
              <ScheduleRow
                key={item.id}
                item={item}
                lang={i18n.language}
                last={index === visible.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
