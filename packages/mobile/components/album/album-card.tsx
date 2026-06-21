import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { SignedAlbumImage } from '@/components/album/signed-album-image';
import { type AlbumSummary, splitCaption } from '@/data/albums';
import { formatLongDate } from '@/lib/date';

const LIKE = '#FF5C7A';

/** Kidsnote-style preview: one large photo + two stacked, with +N on the last. */
function Mosaic({ album }: { album: AlbumSummary }) {
  const [big, ...rest] = album.previewMedia;
  const small = rest.slice(0, 2);
  const visibleCount = big ? 1 + small.length : 0;
  const remaining = album.mediaCount - visibleCount;

  if (!big) return null;

  return (
    <View className="h-44 flex-row gap-1">
      <SignedAlbumImage media={big} className="flex-1 rounded-md" />
      {small.length > 0 ? (
        <View className="flex-1 gap-1">
          {small.map((media, index) => (
            <View key={media.id} className="flex-1">
              <SignedAlbumImage media={media} className="h-full w-full rounded-md" />
              {index === small.length - 1 && remaining > 0 ? (
                <View className="absolute inset-0 items-center justify-center rounded-md bg-black/45">
                  <Text className="text-base font-bold text-white">+{remaining}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

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
          <View className="mt-3">
            <Mosaic album={album} />
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
