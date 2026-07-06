import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import {
  MedicationFilterSheet,
  type MedPeriod,
  type MedStatusFilter,
} from '@/components/medication/medication-filter-sheet';
import { RequestCard } from '@/components/medication/request-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useMedicationRequests, type MedicationSummary } from '@/data/medications';
import { formatLongDate, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function matchesSearch(request: MedicationSummary, query: string) {
  return `${request.medicineName} ${request.dosage} ${request.childName}`.toLowerCase().includes(query);
}

export default function MedicationsScreen() {
  const { t, i18n } = useTranslation(['nav', 'medications']);
  const router = useRouter();
  const today = todayIsoDate();
  const { data: requests, isPending } = useMedicationRequests();

  const [status, setStatus] = useState<MedStatusFilter>('all');
  const [period, setPeriod] = useState<MedPeriod>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const todayRequests = useMemo(
    () => requests.filter((request) => request.requestedForDate === today),
    [requests, today],
  );
  const pendingToday = todayRequests.filter((request) => request.status === 'pending').length;

  const statusCounts = useMemo(() => {
    const counts: Record<MedStatusFilter, number> = { all: requests.length, pending: 0, administered: 0, skipped: 0, cancelled: 0 };
    for (const request of requests) counts[request.status] += 1;
    return counts;
  }, [requests]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (status !== 'all' && request.status !== status) return false;
      if (period === 'month' && request.requestedForDate.slice(0, 7) !== month) return false;
      if (period === 'day' && request.requestedForDate !== day) return false;
      if (q && !matchesSearch(request, q)) return false;
      return true;
    });
  }, [requests, status, period, month, day, search]);

  useEffect(() => setPage(0), [status, period, month, day, search]);

  const filtersOn = status !== 'all' || period !== 'all';
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const newButton = (
    <Pressable
      onPress={() => router.push('/medications/new')}
      hitSlop={8}
      className="h-9 flex-row items-center gap-1 rounded-full bg-coral-ink px-3.5">
      <Ionicons name="add" size={18} color="#FFFFFF" />
      <Text numberOfLines={1} className="text-[13px] font-bold text-white">
        {t('newRequest', { ns: 'medications' })}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.medications', { ns: 'nav' })} back right={newButton} />

      {isPending ? (
        <Loader />
      ) : requests.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="medkit-outline"
            title={t('empty.parentTitle', { ns: 'medications' })}
            body={t('empty.parentBody', { ns: 'medications' })}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-4 p-4 pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Today's requests — a coral tray for what still needs giving today */}
          <View className="gap-3 rounded-2xl border border-coral-ink/20 bg-coral/50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-coral-ink">
                <Ionicons name="medkit" size={15} color="#FFFFFF" />
              </View>
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">
                {t('todaySection', { ns: 'medications' })}
              </Text>
              {pendingToday > 0 ? (
                <View className="rounded-full bg-coral-ink px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">
                    {t('toGive', { ns: 'medications', count: pendingToday })}
                  </Text>
                </View>
              ) : (
                <Text className="text-[12px] font-bold text-coral-ink">
                  {formatLongDate(today, i18n.language)}
                </Text>
              )}
            </View>
            {todayRequests.length === 0 ? (
              <View className="items-center gap-1 rounded-lg border border-dashed border-coral-ink/30 bg-card/70 px-4 py-6">
                <Ionicons name="checkmark-circle-outline" size={24} color="#E8674E" />
                <Text className="text-[13px] text-muted">{t('noToday', { ns: 'medications' })}</Text>
              </View>
            ) : (
              todayRequests.map((request) => <RequestCard key={request.id} request={request} showDate={false} />)
            )}
          </View>

          {/* Request history — searchable, filterable, paged */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2 border-t border-border pt-4">
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">
                {t('requestHistory', { ns: 'medications' })}
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
                  placeholder={t('table.search', { ns: 'medications' })}
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
                  filtersOn ? 'border-coral-ink bg-coral-ink' : 'border-border bg-card',
                )}>
                <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>

            {history.length === 0 ? (
              <EmptyState
                icon="funnel-outline"
                title={t('table.empty', { ns: 'medications' })}
                body={t('empty.parentBody', { ns: 'medications' })}
              />
            ) : (
              <>
                {pageItems.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}

                <Pager
                  page={safePage}
                  totalPages={totalPages}
                  onPage={setPage}
                  label={t('page', { ns: 'medications', current: safePage + 1, total: totalPages })}
                  className="mt-1"
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      <MedicationFilterSheet
        open={filterOpen}
        status={status}
        statusCounts={statusCounts}
        period={period}
        month={month}
        day={day}
        onStatus={setStatus}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onDay={setDay}
        onReset={() => {
          setStatus('all');
          setPeriod('all');
          setMonth(today.slice(0, 7));
          setDay(today);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
