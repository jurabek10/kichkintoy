import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album/album-card';
import {
  AlbumFilterSheet,
  type AlbumPeriod,
  type AlbumStatusFilter,
  type ClassOption,
} from '@/components/album/album-filter-sheet';
import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Pager } from '@/components/ui/pager';
import { colors } from '@/constants/theme';
import { useStaffAlbums, type StaffAlbumSummary } from '@/data/albums';
import { todayIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

function matchesSearch(album: StaffAlbumSummary, query: string) {
  return `${album.title} ${album.caption} ${album.authorName} ${album.className}`
    .toLowerCase()
    .includes(query);
}

export default function AlbumsScreen() {
  const { t } = useTranslation('albums');
  const router = useRouter();
  const query = useStaffAlbums();
  const albums = query.data;

  const [status, setStatus] = useState<AlbumStatusFilter>('all');
  const [classId, setClassId] = useState('all');
  const [period, setPeriod] = useState<AlbumPeriod>('all');
  const [month, setMonth] = useState(todayIsoDate().slice(0, 7));
  const [day, setDay] = useState(todayIsoDate());
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const classOptions = useMemo<ClassOption[]>(() => {
    const unique = new Map<string, string>();
    for (const album of albums) {
      for (const klass of album.classes) unique.set(klass.id, klass.name);
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [albums]);

  const statusCounts = useMemo(() => {
    const counts: Record<AlbumStatusFilter, number> = { all: albums.length, published: 0, draft: 0 };
    for (const album of albums) counts[album.status] += 1;
    return counts;
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
      if (status !== 'all' && album.status !== status) return false;
      if (classId !== 'all' && !album.classes.some((c) => c.id === classId)) return false;
      if (period === 'month' && album.dateKey.slice(0, 7) !== month) return false;
      if (period === 'day' && album.dateKey !== day) return false;
      if (q && !matchesSearch(album, q)) return false;
      return true;
    });
  }, [albums, status, classId, period, month, day, search]);

  useEffect(() => setPage(0), [status, classId, period, month, day, search]);

  const filtersOn = status !== 'all' || classId !== 'all' || period !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title={t('title')}
        right={
          <Pressable
            onPress={() => router.push('/album/new')}
            hitSlop={8}
            className="h-9 flex-row items-center gap-1 rounded-full bg-grape-ink px-3.5">
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text numberOfLines={1} className="text-[13px] font-bold text-white">
              {t('newAlbum')}
            </Text>
          </Pressable>
        }
      />

      {query.isPending ? (
        <Loader />
      ) : albums.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="images-outline" title={t('empty.staffTitle')} body={t('empty.staffBody')} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
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
                filtersOn ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card',
              )}>
              <Ionicons name="funnel" size={17} color={filtersOn ? '#FFFFFF' : colors.textSecondary} />
            </Pressable>
          </View>

          {filtered.length === 0 ? (
            <View className="p-4">
              <EmptyState icon="funnel-outline" title={t('empty.filterTitle')} body={t('empty.filterBody')} />
            </View>
          ) : (
            <ScrollView contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
              {pageItems.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}

              <Pager
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
                label={t('page', { current: safePage + 1, total: totalPages })}
                className="mt-3 px-4"
              />
            </ScrollView>
          )}
        </>
      )}

      <AlbumFilterSheet
        open={filterOpen}
        status={status}
        statusCounts={statusCounts}
        classId={classId}
        classOptions={classOptions}
        classCounts={classCounts}
        total={albums.length}
        period={period}
        month={month}
        day={day}
        onStatus={setStatus}
        onClass={setClassId}
        onPeriod={setPeriod}
        onMonth={setMonth}
        onDay={setDay}
        onReset={() => {
          setStatus('all');
          setClassId('all');
          setPeriod('all');
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
