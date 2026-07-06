import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import {
  NoticeFilterSheet,
  type NoticeAudienceFilter,
  type NoticeStatusFilter,
} from '@/components/notice/notice-filter-sheet';
import { StaffNoticeListItem } from '@/components/notice/staff-notice-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useAuthorNotices, type StaffNoticeSummary } from '@/data/notices';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function matchesSearch(notice: StaffNoticeSummary, query: string) {
  return `${notice.title} ${notice.bodyPreview} ${notice.targetLabel}`.toLowerCase().includes(query);
}

export default function NoticesScreen() {
  const { t } = useTranslation('notices');
  const router = useRouter();
  const query = useAuthorNotices();
  const notices = query.data;

  const [status, setStatus] = useState<NoticeStatusFilter>('all');
  const [audience, setAudience] = useState<NoticeAudienceFilter>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const statusCounts = useMemo(() => {
    const counts: Record<NoticeStatusFilter, number> = { all: notices.length, published: 0, scheduled: 0, draft: 0 };
    for (const notice of notices) counts[notice.status] += 1;
    return counts;
  }, [notices]);

  const audienceCounts = useMemo(() => {
    const counts: Record<NoticeAudienceFilter, number> = { all: notices.length, center: 0, class: 0, child: 0 };
    for (const notice of notices) counts[notice.audience] += 1;
    return counts;
  }, [notices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter(
      (n) =>
        (status === 'all' || n.status === status) &&
        (audience === 'all' || n.audience === audience) &&
        (q === '' || matchesSearch(n, q)),
    );
  }, [notices, status, audience, search]);

  useEffect(() => setPage(0), [status, audience, search]);

  const filtersOn = status !== 'all' || audience !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('title')}
        right={
          <Pressable
            onPress={() => router.push('/notice/new')}
            hitSlop={8}
            className="h-9 flex-row items-center gap-1 rounded-full bg-sky-ink px-3.5">
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text numberOfLines={1} className="text-[13px] font-bold text-white">
              {t('newNotice')}
            </Text>
          </Pressable>
        }
      />

      {query.isPending ? (
        <Loader />
      ) : notices.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="megaphone-outline" title={t('empty.staffTitle')} body={t('empty.staffBody')} />
        </View>
      ) : (
        <>
          {/* Search + filter — the attendance-screen pattern */}
          <View className="flex-row items-center gap-2 px-4 pt-1">
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
                filtersOn ? 'border-sky-ink bg-sky-ink' : 'border-border bg-card',
              )}>
              <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
            </Pressable>
          </View>

          {filtered.length === 0 ? (
            <View className="p-4">
              <EmptyState icon="funnel-outline" title={t('empty.filterTitle')} body={t('empty.filterBody')} />
            </View>
          ) : (
            <ScrollView contentContainerClassName="gap-3 p-4 pb-6" showsVerticalScrollIndicator={false}>
              {pageItems.map((notice) => (
                <StaffNoticeListItem key={notice.id} notice={notice} />
              ))}

              <Pager
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
                label={t('page', { current: safePage + 1, total: totalPages })}
                className="mt-1"
              />
            </ScrollView>
          )}
        </>
      )}

      <NoticeFilterSheet
        open={filterOpen}
        status={status}
        audience={audience}
        statusCounts={statusCounts}
        audienceCounts={audienceCounts}
        onStatus={setStatus}
        onAudience={setAudience}
        onReset={() => {
          setStatus('all');
          setAudience('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
