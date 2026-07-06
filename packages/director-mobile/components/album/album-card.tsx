import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { AlbumMosaic } from '@/components/album/album-mosaic';
import type { StaffAlbumSummary } from '@/data/albums';

const LIKE = '#FF5C7A';

/** One album on the teacher's board — the same mosaic-hero layout parents see,
 *  with a draft pill and engagement counts for the staff view. Taps to detail. */
export function AlbumCard({ album }: { album: StaffAlbumSummary }) {
  const { t } = useTranslation('albums');
  const title = album.title || t('card.emptyTitle');

  return (
    <Link href={{ pathname: '/album/[id]', params: { id: album.id } }} asChild>
      <Pressable className="border-b border-border bg-card px-4 py-4 active:opacity-80">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 text-base font-bold text-foreground">
            {title}
          </Text>
          {album.status !== 'published' ? (
            <View className="rounded-full bg-pill px-2.5 py-0.5">
              <Text className="text-[11px] font-bold text-muted">{t('status.draft')}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
          {album.dateLabel}
          {album.className ? ` · ${album.className}` : ''}
        </Text>

        {album.previewMedia.length > 0 ? (
          <View className="mt-3 h-44">
            <AlbumMosaic previewMedia={album.previewMedia} mediaCount={album.mediaCount} />
          </View>
        ) : null}

        <View className="mt-2.5 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="images-outline" size={14} color="#AEB4BE" />
            <Text className="text-xs text-muted">{album.mediaCount}</Text>
          </View>
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
      </Pressable>
    </Link>
  );
}
