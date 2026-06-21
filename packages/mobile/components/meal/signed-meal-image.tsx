import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { MealMedia } from '@/data/meals';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/** Meal food photo loaded through the same signed-download flow used for albums
 *  and reports. `className` controls the framing. */
export function SignedMealImage({ media, className }: { media: MealMedia; className?: string }) {
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
