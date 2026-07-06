import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportFilterSheet, type ReportPeriod } from '@/components/report/report-filter-sheet';
import { ReportListItem } from '@/components/report/report-list-item';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useChildReports, type ReportSummary } from '@/data/reports';
import { formatMonthYear, parseIsoDate, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function matchesSearch(report: ReportSummary, query: string) {
  return `${report.teacherNote} ${report.className} ${report.mood ?? ''}`.toLowerCase().includes(query);
}

export default function ReportsScreen() {
  const { t, i18n } = useTranslation(['nav', 'reports']);
  const queryClient = useQueryClient();
  const { data: reports, isPending } = useChildReports();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7));
  const [day, setDay] = useState(todayIsoDate());
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (period === 'month' && report.reportDate.slice(0, 7) !== month) return false;
      if (period === 'day' && report.reportDate !== day) return false;
      if (q && !matchesSearch(report, q)) return false;
      return true;
    });
  }, [reports, period, month, day, search]);

  useEffect(() => setPage(0), [period, month, day, search]);

  const filtersOn = period !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.reports', { ns: 'nav' })} />

      {isPending ? (
        <Loader />
      ) : reports.length === 0 ? (
        <View className="p-4">
          <EmptyState
            icon="document-text-outline"
            title={t('noPublishedReports', { ns: 'reports' })}
            body={t('parentDescription', { ns: 'reports' })}
          />
        </View>
      ) : (
        <>
          {/* Search + filter, mirroring the album board's toolbar. */}
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('parent.searchPlaceholder', { ns: 'reports' })}
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

          {filtered.length === 0 ? (
            <View className="p-4">
              <EmptyState
                icon="funnel-outline"
                title={t('parent.tableEmpty', { ns: 'reports' })}
                body={t('parent.tableEmptyHint', { ns: 'reports' })}
              />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-6"
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }>
              {pageItems.map((report, index) => {
                const { year, monthIndex } = parseIsoDate(report.reportDate);
                const key = `${year}-${monthIndex}`;
                const prev = pageItems[index - 1];
                const prevKey = prev ? `${parseIsoDate(prev.reportDate).year}-${parseIsoDate(prev.reportDate).monthIndex}` : null;
                const showHeader = key !== prevKey;
                return (
                  <View key={report.id}>
                    {showHeader ? (
                      <View className="bg-background px-4 py-3">
                        <Text className="text-base font-bold text-foreground">
                          {formatMonthYear(year, monthIndex, i18n.language)}
                        </Text>
                      </View>
                    ) : null}
                    <ReportListItem report={report} />
                  </View>
                );
              })}

              <Pager
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
                label={t('parent.page', { ns: 'reports', current: safePage + 1, total: totalPages })}
                className="mt-4 px-4"
              />
            </ScrollView>
          )}
        </>
      )}

      <ReportFilterSheet
        open={filterOpen}
        period={period}
        month={month}
        day={day}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onDay={setDay}
        onReset={() => {
          setPeriod('all');
          setMonth(todayIsoDate().slice(0, 7));
          setDay(todayIsoDate());
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
