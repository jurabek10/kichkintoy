import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { AlbumMosaic } from '@/components/album/album-mosaic';
import { type AlbumSummary, splitCaption } from '@/data/albums';
import { formatLongDate } from '@/lib/date';

const LIKE = '#FF5C7A';

export function AlbumCard({ album }: { album: AlbumSummary }) {
  const { i18n } = useTranslation('albums');
  const { title } = splitCaption(album.caption);

  return (
    <Link href={{ pathname: '/album/[id]', params: { id: album.id } }} asChild>
      <Pressable className="border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">{title}</Text>
            <Text className="mt-0.5 text-xs text-muted">
              {formatLongDate(album.publishedDate, i18n.language)} · {album.authorName}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 pt-0.5">
            <View className="flex-row items-center gap-1">
              <Ionicons name="heart" size={14} color={LIKE} />
              <Text className="text-xs text-muted">{album.heartCount}</Text>
            </View>
            {album.commentCount > 0 ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="chatbubble" size={13} color="#AEB4BE" />
                <Text className="text-xs text-muted">{album.commentCount}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {album.previewMedia.length > 0 ? (
          <View className="mt-3 h-44">
            <AlbumMosaic previewMedia={album.previewMedia} mediaCount={album.mediaCount} />
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
