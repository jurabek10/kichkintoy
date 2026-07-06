import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album/album-card';
import {
  AlbumFilterSheet,
  type AlbumPeriod,
  type ClassOption,
} from '@/components/album/album-filter-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useAlbums, type AlbumSummary } from '@/data/albums';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(album: AlbumSummary, query: string) {
  return `${album.caption} ${album.authorName} ${album.className}`.toLowerCase().includes(query);
}

export default function AlbumsScreen() {
  const { t } = useTranslation(['nav', 'albums']);
  const queryClient = useQueryClient();
  const { data: albums, isPending } = useAlbums();

  const [refreshing, setRefreshing] = useState(false);
  const [classId, setClassId] = useState('all');
  const [period, setPeriod] = useState<AlbumPeriod>('all');
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7));
  const [day, setDay] = useState(todayIsoDate());
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['albums'] });
    } finally {
      setRefreshing(false);
    }
  }

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const album of albums) {
      for (const klass of album.classes) unique.set(klass.id, klass.name);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [albums]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const album of albums) {
      for (const klass of album.classes) counts[klass.id] = (counts[klass.id] ?? 0) + 1;
    }
    return counts;
  }, [albums]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return albums.filter((album) => {
      if (classId !== 'all' && !album.classes.some((c) => c.id === classId)) return false;
      if (period === 'month' && album.publishedDate.slice(0, 7) !== month) return false;
      if (period === 'day' && album.publishedDate !== day) return false;
      if (q && !matchesSearch(album, q)) return false;
      return true;
    });
  }, [albums, classId, period, month, day, search]);

  useEffect(() => setPage(0), [classId, period, month, day, search]);

  const filtersOn = classId !== 'all' || period !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.albums', { ns: 'nav' })} />

      {isPending ? (
        <Loader />
      ) : albums.length === 0 ? (
        <ScrollView contentContainerClassName="p-4" refreshControl={refreshControl}>
          <EmptyState
            icon="images-outline"
            title={t('empty.parentTitle', { ns: 'albums' })}
            body={t('empty.parentBody', { ns: 'albums' })}
          />
        </ScrollView>
      ) : (
        <>
          {/* Search + filter — the shared album/reports toolbar, in album grape. */}
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
            <View className="h-11 flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3">
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('table.search', { ns: 'albums' })}
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
                filtersOn ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card',
              )}>
              <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
            </Pressable>
          </View>

          {filtered.length === 0 ? (
            <ScrollView contentContainerClassName="p-4" refreshControl={refreshControl}>
              <EmptyState
                icon="funnel-outline"
                title={t('empty.filterTitle', { ns: 'albums' })}
                body={t('empty.filterBody', { ns: 'albums' })}
              />
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-6"
              keyboardShouldPersistTaps="handled"
              refreshControl={refreshControl}>
              {pageItems.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}

              <Pager
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
                label={t('page', { ns: 'albums', current: safePage + 1, total: totalPages })}
                className="mt-4 px-4"
              />
            </ScrollView>
          )}
        </>
      )}

      <AlbumFilterSheet
        open={filterOpen}
        classId={classId}
        classOptions={classOptions}
        classCounts={classCounts}
        total={albums.length}
        period={period}
        month={month}
        day={day}
        onClass={setClassId}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onDay={setDay}
        onReset={() => {
          setClassId('all');
          setPeriod('all');
          setMonth(todayIsoDate().slice(0, 7));
          setDay(todayIsoDate());
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
