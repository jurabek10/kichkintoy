import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ComponentProps, useState } from 'react';
import { Image, View } from 'react-native';

import { colors } from '@/constants/theme';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/** A medication photo or signature loaded through the signed-download flow used
 *  across the app (albums, meals, reports). */
export function SignedImage({
  assetId,
  className,
  resizeMode = 'cover',
  fallbackIcon = 'image-outline',
}: {
  assetId: string;
  className?: string;
  resizeMode?: 'cover' | 'contain';
  fallbackIcon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const [failed, setFailed] = useState(false);
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.media.download(assetId),
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: assetId }),
    staleTime: 4 * 60 * 1000,
  });

  if (isPending) return <View className={cn('bg-segment', className)} />;

  if (error || !data?.downloadUrl || failed) {
    return (
      <View className={cn('items-center justify-center bg-segment', className)}>
        <Ionicons name={fallbackIcon} size={24} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: data.downloadUrl }}
      className={cn('bg-segment', className)}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
