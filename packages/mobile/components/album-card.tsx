import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';

import { type Album, splitCaption } from '@/constants/data';
import { formatLongDate } from '@/lib/date';

const LIKE = '#FF5C7A';

/** Kidsnote-style preview: one large photo + two stacked, the last carrying a
 *  "+N" overlay for the remaining media. */
function Mosaic({ photos, mediaCount }: { photos: string[]; mediaCount: number }) {
  const [big, ...rest] = photos;
  const small = rest.slice(0, 2);
  const remaining = mediaCount - (1 + small.length);

  if (!big) return null;

  return (
    <View className="h-44 flex-row gap-1">
      <Image source={{ uri: big }} className="flex-1 rounded-md bg-segment" />
      {small.length > 0 ? (
        <View className="flex-1 gap-1">
          {small.map((photo, index) => (
            <View key={photo} className="flex-1">
              <Image source={{ uri: photo }} className="h-full w-full rounded-md bg-segment" />
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

export function AlbumCard({ album }: { album: Album }) {
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

        <View className="mt-3">
          <Mosaic photos={album.photos} mediaCount={album.mediaCount} />
        </View>
      </Pressable>
    </Link>
  );
}
