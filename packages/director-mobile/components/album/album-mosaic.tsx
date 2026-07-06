import { Text, View } from 'react-native';

import { SignedAlbumImage } from '@/components/album/signed-album-image';
import type { AlbumMedia } from '@/data/albums';

/**
 * Kidsnote-style album preview: one large photo beside two stacked, with a "+N"
 * badge on the last tile when the album has more photos than shown. Fills its
 * parent's height, so callers size it (the compact home card vs the albums
 * list) with a wrapping height class.
 */
export function AlbumMosaic({
  previewMedia,
  mediaCount,
}: {
  previewMedia: AlbumMedia[];
  mediaCount: number;
}) {
  const [big, ...rest] = previewMedia;
  const small = rest.slice(0, 2);
  const visibleCount = big ? 1 + small.length : 0;
  const remaining = mediaCount - visibleCount;

  if (!big) return null;

  return (
    <View className="h-full flex-row gap-1">
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
