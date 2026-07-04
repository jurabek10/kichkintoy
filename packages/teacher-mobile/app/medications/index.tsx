import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MedicationFilterSheet,
  type ClassOption,
  type MedStatusFilter,
} from '@/components/medication/medication-filter-sheet';
import { RequestCard } from '@/components/medication/request-card';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useMonthMedications, useTodayMedications, type StaffMedSummary } from '@/data/medications';
import { formatLongDate, formatMonthYear, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(request: StaffMedSummary, query: string) {
  return `${request.childName} ${request.medicineName}`.toLowerCase().includes(query);
}

export default function MedicationsScreen() {
  const { t, i18n } = useTranslation('medications');
  const today = todayIsoDate();
  const todayQuery = useTodayMedications();
  const todayMeds = todayQuery.data;
  const pendingToday = todayMeds.filter((m) => m.status === 'pending').length;

  const [month, setMonth] = useState(today.slice(0, 7));
  const [status, setStatus] = useState<MedStatusFilter>('all');
  const [classId, setClassId] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const monthQuery = useMonthMedications(month);
  const monthMeds = monthQuery.data;

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const req of monthMeds) if (req.classId && req.className) unique.set(req.classId, req.className);
    return [...unique.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [monthMeds]);

  const statusCounts = useMemo(() => {
    const counts: Record<MedStatusFilter, number> = { all: monthMeds.length, pending: 0, administered: 0, skipped: 0, cancelled: 0 };
    for (const req of monthMeds) counts[req.status] += 1;
    return counts;
  }, [monthMeds]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const req of monthMeds) if (req.classId) counts[req.classId] = (counts[req.classId] ?? 0) + 1;
    return counts;
  }, [monthMeds]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthMeds.filter((req) => {
      if (status !== 'all' && req.status !== status) return false;
      if (classId !== 'all' && req.classId !== classId) return false;
      if (q && !matchesSearch(req, q)) return false;
      return true;
    });
  }, [monthMeds, status, classId, search]);

  useEffect(() => setPage(0), [month, status, classId, search]);

  const filtersOn = status !== 'all' || classId !== 'all' || month !== today.slice(0, 7);
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('title')} back />

      {todayQuery.isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4 pb-8" showsVerticalScrollIndicator={false}>
          {/* Today's requests — a highlighted coral tray for what still needs giving */}
          <View className="gap-3 rounded-2xl border border-coral-ink/20 bg-coral/50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-coral-ink">
                <Ionicons name="medkit" size={15} color="#FFFFFF" />
              </View>
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">{t('todaySection')}</Text>
              {pendingToday > 0 ? (
                <View className="rounded-full bg-coral-ink px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">{t('toGive', { count: pendingToday, defaultValue: `${pendingToday}` })}</Text>
                </View>
              ) : (
                <Text className="text-[12px] font-bold text-coral-ink">{formatLongDate(today, i18n.language)}</Text>
              )}
            </View>
            {todayMeds.length === 0 ? (
              <View className="items-center gap-1 rounded-lg border border-dashed border-coral-ink/30 bg-card/70 px-4 py-6">
                <Ionicons name="checkmark-circle-outline" size={24} color="#E8674E" />
                <Text className="text-[13px] text-muted">{t('noToday')}</Text>
              </View>
            ) : (
              todayMeds.map((request) => <RequestCard key={request.id} request={request} showDate={false} />)
            )}
          </View>

          {/* Request history */}
          <View className="gap-3">
            <View className="flex-row items-center gap-2 border-t border-border pt-4">
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text className="flex-1 text-[15px] font-extrabold text-foreground">
                {formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, i18n.language)}
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
                  filtersOn ? 'border-coral-ink bg-coral-ink' : 'border-border bg-card',
                )}>
                <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>

            {monthQuery.isPending ? (
              <Loader />
            ) : history.length === 0 ? (
              <EmptyState icon="medkit-outline" title={t('empty.staffTitle')} body={t('table.empty')} />
            ) : (
              <>
                {pageItems.map((request) => (
                  <RequestCard key={request.id} request={request} />
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

      <MedicationFilterSheet
        open={filterOpen}
        month={month}
        status={status}
        statusCounts={statusCounts}
        classId={classId}
        classOptions={classOptions}
        classCounts={classCounts}
        total={monthMeds.length}
        onMonth={setMonth}
        onStatus={setStatus}
        onClass={setClassId}
        onReset={() => {
          setMonth(today.slice(0, 7));
          setStatus('all');
          setClassId('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
