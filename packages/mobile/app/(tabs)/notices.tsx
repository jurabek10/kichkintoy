import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import {
  NoticeFilterSheet,
  type NoticeParentFilter,
} from '@/components/notice/notice-filter-sheet';
import { NoticeListItem } from '@/components/notice/notice-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useNotices, type NoticeSummary } from '@/data/notices';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function matchesSearch(notice: NoticeSummary, query: string) {
  return `${notice.title} ${notice.bodyPreview} ${notice.authorName} ${notice.centerName}`
    .toLowerCase()
    .includes(query);
}

/** The empty-state body when a filter hides everything — each filter has its own
 *  "you're all caught up" wording. */
function filterEmptyBody(filter: NoticeParentFilter) {
  if (filter === 'unread') return 'detail.emptyUnread';
  if (filter === 'toConfirm') return 'detail.emptyToConfirm';
  return 'empty.filterBody';
}

export default function NoticesScreen() {
  const { t } = useTranslation(['nav', 'notices']);
  const queryClient = useQueryClient();
  const { data: notices, isPending } = useNotices();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NoticeParentFilter>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notices.parentList });
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo<Record<NoticeParentFilter, number>>(
    () => ({
      all: notices.length,
      unread: notices.filter((notice) => !notice.isRead).length,
      toConfirm: notices.filter((notice) => notice.requiresConfirmation && !notice.isConfirmed).length,
    }),
    [notices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter((notice) => {
      if (filter === 'unread' && notice.isRead) return false;
      if (filter === 'toConfirm' && (!notice.requiresConfirmation || notice.isConfirmed)) return false;
      if (q && !matchesSearch(notice, q)) return false;
      return true;
    });
  }, [notices, filter, search]);

  useEffect(() => setPage(0), [filter, search]);

  const filtersOn = filter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.notices', { ns: 'nav' })} />

      {isPending ? (
        <Loader />
      ) : notices.length === 0 ? (
        <ScrollView
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          <EmptyState
            icon="megaphone-outline"
            title={t('empty.parentTitle', { ns: 'notices' })}
            body={t('empty.parentBody', { ns: 'notices' })}
          />
        </ScrollView>
      ) : (
        <>
          {/* Search + filter — the shared album/reports toolbar, in notice sky. */}
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('table.search', { ns: 'notices' })}
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
                filtersOn ? 'border-sky-ink bg-sky-ink' : 'border-border bg-card',
              )}>
              <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
            </Pressable>
          </View>

          {filtered.length === 0 ? (
            <ScrollView
              contentContainerClassName="p-4"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }>
              <EmptyState
                icon="funnel-outline"
                title={t('empty.filterTitle', { ns: 'notices' })}
                body={t(filterEmptyBody(filter), { ns: 'notices' })}
              />
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gap-3 p-4 pb-6"
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }>
              {pageItems.map((notice) => (
                <NoticeListItem key={notice.id} notice={notice} />
              ))}

              <Pager
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
                label={t('page', { ns: 'notices', current: safePage + 1, total: totalPages })}
                className="mt-1"
              />
            </ScrollView>
          )}
        </>
      )}

      <NoticeFilterSheet
        open={filterOpen}
        filter={filter}
        counts={counts}
        onFilter={setFilter}
        onReset={() => setFilter('all')}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
