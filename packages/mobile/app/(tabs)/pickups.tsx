import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { PickupCard } from '@/components/pickup/pickup-card';
import {
  PickupFilterSheet,
  type ChildOption,
  type PickupStatusFilter,
  type PickupView,
} from '@/components/pickup/pickup-filter-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { usePickupNotices, type PickupSummary } from '@/data/pickups';
import { formatLongDate, formatMonthYear, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function matchesSearch(pickup: PickupSummary, query: string) {
  return `${pickup.childName} ${pickup.personName}`.toLowerCase().includes(query);
}

export default function PickupsScreen() {
  const { t, i18n } = useTranslation(['nav', 'pickups']);
  const router = useRouter();
  const today = todayIsoDate();
  const { data: notices, isPending } = usePickupNotices();

  const [view, setView] = useState<PickupView>('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [status, setStatus] = useState<PickupStatusFilter>('all');
  const [childId, setChildId] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const todayPickups = useMemo(
    () =>
      notices
        .filter((pickup) => pickup.pickupDate === today)
        .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime)),
    [notices, today],
  );

  // Records within the chosen month/day — the scope status/child/search narrow.
  const records = useMemo(
    () =>
      notices.filter((pickup) =>
        view === 'day' ? pickup.pickupDate === day : pickup.pickupDate.slice(0, 7) === month,
      ),
    [notices, view, month, day],
  );

  const childOptions = useMemo<ChildOption[]>(() => {
    const unique = new Map<string, string>();
    for (const pickup of records) unique.set(pickup.childId, pickup.childName);
    return [...unique.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const statusCounts = useMemo(() => {
    const counts: Record<PickupStatusFilter, number> = { all: records.length, submitted: 0, changed: 0, acknowledged: 0, cancelled: 0 };
    for (const pickup of records) counts[pickup.status] += 1;
    return counts;
  }, [records]);

  const childCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pickup of records) counts[pickup.childId] = (counts[pickup.childId] ?? 0) + 1;
    return counts;
  }, [records]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((pickup) => {
      if (status !== 'all' && pickup.status !== status) return false;
      if (childId !== 'all' && pickup.childId !== childId) return false;
      if (q && !matchesSearch(pickup, q)) return false;
      return true;
    });
  }, [records, status, childId, search]);

  useEffect(() => setPage(0), [view, month, day, status, childId, search]);

  const filtersOn = status !== 'all' || childId !== 'all' || view === 'day' || month !== today.slice(0, 7);
  const recordsLabel =
    view === 'day'
      ? formatLongDate(day, i18n.language)
      : formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, i18n.language);
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const newButton = (
    <Pressable
      onPress={() => router.push('/pickups/new')}
      hitSlop={8}
      className="h-9 flex-row items-center gap-1 rounded-full bg-sunshine-ink px-3.5">
      <Ionicons name="add" size={18} color="#FFFFFF" />
      <Text numberOfLines={1} className="text-[13px] font-bold text-white">
        {t('newNotice', { ns: 'pickups' })}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.pickups', { ns: 'nav' })} right={newButton} />

      {isPending ? (
        <Loader />
      ) : notices.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="walk-outline"
            title={t('empty.parentTitle', { ns: 'pickups' })}
            body={t('empty.parentBody', { ns: 'pickups' })}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-4 p-4 pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Today's pickups — a sunshine tray: the going-home timeline */}
          <View className="gap-3 rounded-2xl border border-sunshine-ink/20 bg-sunshine/50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-sunshine-ink">
                <Ionicons name="walk" size={15} color="#FFFFFF" />
              </View>
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">
                {t('todaySection', { ns: 'pickups' })}
              </Text>
              {todayPickups.length > 0 ? (
                <View className="rounded-full bg-sunshine-ink px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">{todayPickups.length}</Text>
                </View>
              ) : (
                <Text className="text-[12px] font-bold text-sunshine-ink">
                  {formatLongDate(today, i18n.language)}
                </Text>
              )}
            </View>
            {todayPickups.length === 0 ? (
              <View className="items-center gap-1 rounded-lg border border-dashed border-sunshine-ink/30 bg-card/70 px-4 py-6">
                <Ionicons name="walk-outline" size={24} color="#F4A621" />
                <Text className="text-[13px] text-muted">{t('noToday', { ns: 'pickups' })}</Text>
              </View>
            ) : (
              todayPickups.map((pickup) => <PickupCard key={pickup.id} pickup={pickup} showDate={false} />)
            )}
          </View>

          {/* Records — searchable, filterable, paged */}
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
                  placeholder={t('table.search', { ns: 'pickups' })}
                  placeholderTextColor={colors.textMuted}
                  className="h-11 flex-1 text-[15px] text-foreground"
                  returnKeyType="search"
                  autoCorrect={false}
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

            {history.length === 0 ? (
              <EmptyState
                icon="funnel-outline"
                title={t('table.empty', { ns: 'pickups' })}
                body={t('empty.parentBody', { ns: 'pickups' })}
              />
            ) : (
              <>
                {pageItems.map((pickup) => (
                  <PickupCard key={pickup.id} pickup={pickup} />
                ))}

                <Pager
                  page={safePage}
                  totalPages={totalPages}
                  onPage={setPage}
                  label={t('page', { ns: 'pickups', current: safePage + 1, total: totalPages })}
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
        childId={childId}
        childOptions={childOptions}
        childCounts={childCounts}
        total={records.length}
        onView={setView}
        onMonth={setMonth}
        onDay={setDay}
        onStatus={setStatus}
        onChild={setChildId}
        onReset={() => {
          setView('month');
          setMonth(today.slice(0, 7));
          setDay(today);
          setStatus('all');
          setChildId('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
