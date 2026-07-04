import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickupCard } from '@/components/pickup/pickup-card';
import {
  PickupFilterSheet,
  type ClassOption,
  type PickupStatusFilter,
} from '@/components/pickup/pickup-filter-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useRecordPickups, useTodayPickups, type PickupView, type StaffPickupSummary } from '@/data/pickups';
import { formatLongDate, formatMonthYear, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(pickup: StaffPickupSummary, query: string) {
  return `${pickup.childName} ${pickup.personName}`.toLowerCase().includes(query);
}

export default function PickupsScreen() {
  const { t, i18n } = useTranslation('pickups');
  const today = todayIsoDate();
  const todayQuery = useTodayPickups();
  const todayPickups = todayQuery.data;

  const [view, setView] = useState<PickupView>('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [status, setStatus] = useState<PickupStatusFilter>('all');
  const [classId, setClassId] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const recordQuery = useRecordPickups(view, month, day);
  const records = recordQuery.data;

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const p of records) if (p.classId && p.className) unique.set(p.classId, p.className);
    return [...unique.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const statusCounts = useMemo(() => {
    const counts: Record<PickupStatusFilter, number> = { all: records.length, submitted: 0, changed: 0, acknowledged: 0, cancelled: 0 };
    for (const p of records) counts[p.status] += 1;
    return counts;
  }, [records]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of records) if (p.classId) counts[p.classId] = (counts[p.classId] ?? 0) + 1;
    return counts;
  }, [records]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (classId !== 'all' && p.classId !== classId) return false;
      if (q && !matchesSearch(p, q)) return false;
      return true;
    });
  }, [records, status, classId, search]);

  useEffect(() => setPage(0), [view, month, day, status, classId, search]);

  const filtersOn =
    status !== 'all' || classId !== 'all' || view === 'day' || month !== today.slice(0, 7);
  const recordsLabel =
    view === 'day'
      ? formatLongDate(day, i18n.language)
      : formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, i18n.language);
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('title')} />

      {todayQuery.isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4 pb-8" showsVerticalScrollIndicator={false}>
          {/* Today's pickups — a highlighted sunshine tray: the going-home timeline */}
          <View className="gap-3 rounded-2xl border border-sunshine-ink/20 bg-sunshine/50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-sunshine-ink">
                <Ionicons name="walk" size={15} color="#FFFFFF" />
              </View>
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">{t('todaySection')}</Text>
              {todayPickups.length > 0 ? (
                <View className="rounded-full bg-sunshine-ink px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">{todayPickups.length}</Text>
                </View>
              ) : (
                <Text className="text-[12px] font-bold text-sunshine-ink">{formatLongDate(today, i18n.language)}</Text>
              )}
            </View>
            {todayPickups.length === 0 ? (
              <View className="items-center gap-1 rounded-lg border border-dashed border-sunshine-ink/30 bg-card/70 px-4 py-6">
                <Ionicons name="walk-outline" size={24} color="#F4A621" />
                <Text className="text-[13px] text-muted">{t('noToday')}</Text>
              </View>
            ) : (
              todayPickups.map((pickup) => <PickupCard key={pickup.id} pickup={pickup} showDate={false} />)
            )}
          </View>

          {/* Records */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2 border-t border-border pt-4">
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text numberOfLines={1} className="flex-1 text-[15px] font-extrabold text-foreground">
                {recordsLabel}
              </Text>
              <View className="rounded-full bg-pill px-2 py-0.5">
                <Text className="text-[11px] font-bold text-muted">{history.length}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('table.search')}
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
              <Pressable
                onPress={() => setFilterOpen(true)}
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-md border',
                  filtersOn ? 'border-sunshine-ink bg-sunshine-ink' : 'border-border bg-card',
                )}>
                <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>

            {recordQuery.isPending ? (
              <Loader />
            ) : history.length === 0 ? (
              <EmptyState icon="walk-outline" title={t('empty.staffTitle')} body={t('table.empty')} />
            ) : (
              <>
                {pageItems.map((pickup) => (
                  <PickupCard key={pickup.id} pickup={pickup} />
                ))}

                <Pager
                  page={safePage}
                  totalPages={totalPages}
                  onPage={setPage}
                  label={t('page', { current: safePage + 1, total: totalPages })}
                  className="mt-1"
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      <PickupFilterSheet
        open={filterOpen}
        view={view}
        month={month}
        day={day}
        status={status}
        statusCounts={statusCounts}
        classId={classId}
        classOptions={classOptions}
        classCounts={classCounts}
        total={records.length}
        onView={setView}
        onMonth={setMonth}
        onDay={setDay}
        onStatus={setStatus}
        onClass={setClassId}
        onReset={() => {
          setView('month');
          setMonth(today.slice(0, 7));
          setDay(today);
          setStatus('all');
          setClassId('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
