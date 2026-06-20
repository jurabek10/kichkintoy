import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { AlbumMedia } from '@/data/albums';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/** Album media loaded through the same signed-download flow used on web and for
 *  reports. `className` controls the framing so the same component serves the
 *  list cover and the detail grid cells. */
export function SignedAlbumImage({ media, className }: { media: AlbumMedia; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.media.download(media.assetId),
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: media.assetId }),
    staleTime: 4 * 60 * 1000,
  });

  if (isPending) {
    return <View className={cn('bg-segment', className)} />;
  }

  if (error || !data?.downloadUrl || imageFailed || media.mediaType === 'video') {
    return (
      <View className={cn('items-center justify-center bg-segment', className)}>
        <Ionicons
          name={media.mediaType === 'video' ? 'videocam-outline' : 'image-outline'}
          size={24}
          color={colors.textSecondary}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: data.downloadUrl }}
      className={cn('bg-segment', className)}
      resizeMode="cover"
      onError={() => setImageFailed(true)}
    />
  );
}
