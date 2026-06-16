import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Loader } from '@/components/ui/loader';
import { useHomeFeed } from '@/data/parent';

const PHOTOS = [64, 12, 5, 23, 41, 8, 33, 27, 19];

export default function AlbumsScreen() {
  const { t } = useTranslation(['nav', 'app']);
  const { data: feed, isPending } = useHomeFeed();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.albums', { ns: 'nav' })} />
      {isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="p-4">
          <Text className="text-base font-bold text-foreground">{feed.album.caption}</Text>
          <Text className="mb-4 mt-0.5 text-[13px] text-muted">
            {t('parentHome.photos.caption', { ns: 'app', count: feed.album.photoCount })}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PHOTOS.map((id) => (
              <Image
                key={id}
                source={{ uri: `https://picsum.photos/id/${id}/200` }}
                className="aspect-square w-[31.8%] rounded-md bg-segment"
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
