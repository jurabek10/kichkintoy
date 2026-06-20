import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album-card';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useAlbums } from '@/data/albums';

export default function AlbumsScreen() {
  const { t } = useTranslation(['nav', 'albums']);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: albums, isPending } = useAlbums();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['albums'] });
    } finally {
      setRefreshing(false);
    }
  }

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          refreshControl={refreshControl}>
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
