import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestCard } from '@/components/requests/request-card';
import {
  RequestFilterSheet,
  type KindFilter,
  type Period,
} from '@/components/requests/request-filter-sheet';
import { RequestReviewSheet } from '@/components/requests/review-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import {
  useCanApproveMembers,
  useCenterId,
  useJoinRequests,
  useTeacherClasses,
  type JoinRequest,
  type JoinRequestKind,
  type JoinRequestStatus,
} from '@/data/teacher';
import { formatMonthYear, todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;
const KIND_ORDER: JoinRequestKind[] = ['parent', 'teacher', 'director'];

function matchesSearch(request: JoinRequest, query: string) {
  return `${request.requester.fullName} ${request.child?.name ?? ''}`.toLowerCase().includes(query);
}

export default function RequestsScreen() {
  const { t, i18n } = useTranslation('teacher');
  const centerId = useCenterId();
  const canApprove = useCanApproveMembers();
  const classes = useTeacherClasses();

  const today = todayIsoDate();
  const [status, setStatus] = useState<JoinRequestStatus>('pending');
  const [period, setPeriod] = useState<Period>('all');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [kind, setKind] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<JoinRequest | null>(null);
  const [page, setPage] = useState(0);

  const query = useJoinRequests(status);
  const requests = useMemo(() => query.data ?? [], [query.data]);

  // The month scopes the list client-side; status drives the fetch.
  const inPeriod = useMemo(
    () => (period === 'month' ? requests.filter((r) => r.createdAt.slice(0, 7) === month) : requests),
    [requests, period, month],
  );

  const kindOptions = useMemo(
    () => KIND_ORDER.filter((k) => inPeriod.some((r) => r.kind === k)),
    [inPeriod],
  );
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of inPeriod) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    return counts;
  }, [inPeriod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter((r) => (kind === 'all' || r.kind === kind) && (q === '' || matchesSearch(r, q)));
  }, [inPeriod, kind, search]);

  useEffect(() => setPage(0), [status, period, month, kind, search]);

  // A kind filter that no longer matches the fetched status should fall away.
  useEffect(() => {
    if (kind !== 'all' && !kindOptions.includes(kind)) setKind('all');
  }, [kind, kindOptions]);

  const filtersOn = status !== 'pending' || period === 'month' || kind !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const [year, mon] = month.split('-').map(Number);
  const scopeLabel =
    period === 'month' ? `${t(`requests.status.${status}`)} · ${formatMonthYear(year, mon - 1, i18n.language)}` : t(`requests.status.${status}`);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('requests.title')} back />

      {!canApprove ? (
        <View className="mx-4 mt-1 flex-row items-center gap-2 rounded-md bg-sunshine px-3 py-2.5">
          <Ionicons name="information-circle" size={18} color="#F4A621" />
          <Text className="flex-1 text-[12px] text-foreground">{t('requests.readOnly')}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Current lens — which status (and month) is on screen, and how many */}
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 text-[15px] font-extrabold text-foreground">
            {scopeLabel}
          </Text>
          <View className="rounded-full bg-grape px-2.5 py-0.5">
            <Text className="text-[11px] font-bold text-grape-ink">{filtered.length}</Text>
          </View>
        </View>

        {/* Search + filter — the shared teacher list controls */}
        <View className="flex-row items-center gap-2">
          <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('requests.search')}
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
              filtersOn ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card',
            )}>
            <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
          </Pressable>
        </View>

        {query.isPending ? (
          <Loader />
        ) : requests.length === 0 ? (
          <EmptyState icon="person-add-outline" title={t('requests.empty')} body={t('requests.emptyBody')} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={t('requests.emptyFiltered')}
            body={t('requests.emptyFilteredBody')}
          />
        ) : (
          <>
            {pageItems.map((request) => (
              <RequestCard key={request.id} request={request} onPress={() => setSelected(request)} />
            ))}

            {totalPages > 1 ? (
              <View className="mt-1 flex-row items-center justify-between">
                <Pressable
                  disabled={safePage === 0}
                  onPress={() => setPage(safePage - 1)}
                  hitSlop={8}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border border-border',
                    safePage === 0 ? 'opacity-40' : 'bg-card',
                  )}>
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                </Pressable>
                <Text className="text-[13px] font-semibold text-muted">
                  {t('requests.page', { current: safePage + 1, total: totalPages })}
                </Text>
                <Pressable
                  disabled={safePage >= totalPages - 1}
                  onPress={() => setPage(safePage + 1)}
                  hitSlop={8}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border border-border',
                    safePage >= totalPages - 1 ? 'opacity-40' : 'bg-card',
                  )}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <RequestFilterSheet
        open={filterOpen}
        period={period}
        month={month}
        status={status}
        kind={kind}
        kindOptions={kindOptions}
        kindCounts={kindCounts}
        total={inPeriod.length}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onStatus={setStatus}
        onKind={setKind}
        onReset={() => {
          setStatus('pending');
          setPeriod('all');
          setMonth(today.slice(0, 7));
          setKind('all');
        }}
        onClose={() => setFilterOpen(false)}
      />

      <RequestReviewSheet
        request={selected}
        centerId={centerId ?? ''}
        canApprove={canApprove}
        classes={classes.data}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}
