import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocCard } from '@/components/documents/doc-card';
import {
  DocFilterSheet,
  type ClassOption,
  type Period,
  type StatusFilter,
} from '@/components/documents/doc-filter-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useStaffDocuments, type StaffDocument } from '@/data/teacher';
import { formatMonthYear, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(doc: StaffDocument, query: string) {
  return `${doc.childName} ${doc.requestTitle}`.toLowerCase().includes(query);
}

export default function DocumentsScreen() {
  const { t, i18n } = useTranslation('teacher');
  const today = todayIsoDate();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [classId, setClassId] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Fetch every scoped submission once; status/class/month/search filter on the client.
  const query = useStaffDocuments();
  const docs = useMemo(() => query.data ?? [], [query.data]);

  const inPeriod = useMemo(
    () => (period === 'month' ? docs.filter((d) => d.createdAt.slice(0, 7) === month) : docs),
    [docs, period, month],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: inPeriod.length };
    for (const d of inPeriod) counts[d.status] = (counts[d.status] ?? 0) + 1;
    return counts;
  }, [inPeriod]);

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const d of inPeriod) if (d.classId && d.className) unique.set(d.classId, d.className);
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inPeriod]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of inPeriod) if (d.classId) counts[d.classId] = (counts[d.classId] ?? 0) + 1;
    return counts;
  }, [inPeriod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter(
      (d) =>
        (status === 'all' || d.status === status) &&
        (classId === 'all' || d.classId === classId) &&
        (q === '' || matchesSearch(d, q)),
    );
  }, [inPeriod, status, classId, search]);

  useEffect(() => setPage(0), [status, period, month, classId, search]);

  // A class filter that no longer exists in the current period should fall away.
  useEffect(() => {
    if (classId !== 'all' && !classOptions.some((c) => c.id === classId)) setClassId('all');
  }, [classId, classOptions]);

  const filtersOn = status !== 'all' || period === 'month' || classId !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const [year, mon] = month.split('-').map(Number);
  const scopeLabel = period === 'month' ? formatMonthYear(year, mon - 1, i18n.language) : t('documents.title');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('documents.title')} back />

      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 text-[15px] font-extrabold text-foreground">
            {scopeLabel}
          </Text>
          <View className="rounded-full bg-mint px-2.5 py-0.5">
            <Text className="text-[11px] font-bold text-mint-ink">{filtered.length}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('documents.search')}
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
              filtersOn ? 'border-mint-ink bg-mint-ink' : 'border-border bg-card',
            )}>
            <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
          </Pressable>
        </View>

        {query.isPending ? (
          <Loader />
        ) : docs.length === 0 ? (
          <EmptyState
            icon="document-attach-outline"
            title={t('documents.empty')}
            body={t('documents.emptyBody')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={t('documents.emptyFiltered')}
            body={t('documents.emptyFilteredBody')}
          />
        ) : (
          <>
            {pageItems.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}

            <Pager
              page={safePage}
              totalPages={totalPages}
              onPage={setPage}
              label={t('documents.page', { current: safePage + 1, total: totalPages })}
              className="mt-1"
            />
          </>
        )}
      </ScrollView>

      <DocFilterSheet
        open={filterOpen}
        status={status}
        statusCounts={statusCounts}
        period={period}
        month={month}
        classId={classId}
        classOptions={classOptions}
        classCounts={classCounts}
        total={inPeriod.length}
        onStatus={setStatus}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onClass={setClassId}
        onReset={() => {
          setStatus('all');
          setPeriod('all');
          setMonth(today.slice(0, 7));
          setClassId('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
