import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffAlbums } from '@/data/teacher';
import { formatDayMonth } from '@/lib/date';
import i18n from '@/i18n';

export default function AlbumsScreen() {
  const { t } = useTranslation('teacher');
  const query = useStaffAlbums();
  const albums = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('albums.title')} />
      {query.isPending ? (
        <Loader />
      ) : albums.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="images-outline" title={t('albums.empty')} body={t('albums.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {albums.map((album) => (
            <Card key={album.id} className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-grape">
                <Ionicons name="images" size={22} color="#7C5CD8" />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
                  {album.caption.split('\n')[0] || t('albums.title')}
                </Text>
                <Text className="mt-0.5 text-[12px] text-muted">
                  {t('albums.photos', { count: album.mediaCount })}
                  {album.publishedAt ? ` · ${formatDayMonth(album.publishedAt, i18n.language)}` : ''}
                </Text>
              </View>
              {album.status !== 'published' ? (
                <View className="rounded-full bg-pill px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-muted">{t('albums.draft')}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
