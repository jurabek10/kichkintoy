import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumCard } from '@/components/album-card';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useAlbums } from '@/data/parent';

export default function AlbumsScreen() {
  const { t } = useTranslation(['nav', 'albums']);
  const { data: albums, isPending } = useAlbums();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.albums', { ns: 'nav' })} />
      {isPending ? (
        <Loader />
      ) : albums.length === 0 ? (
        <ScrollView contentContainerClassName="p-4">
          <EmptyState
            icon="images-outline"
            title={t('empty.parentTitle', { ns: 'albums' })}
            body={t('empty.parentBody', { ns: 'albums' })}
          />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
