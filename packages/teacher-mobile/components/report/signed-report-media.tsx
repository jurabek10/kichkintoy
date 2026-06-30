import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { ReportMedia } from '@/data/reports';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

/** Report media loaded through the same signed-download flow used on web. */
export function SignedReportMedia({ media }: { media: ReportMedia }) {
  const { t } = useTranslation(['common', 'reports']);
  const [imageFailed, setImageFailed] = useState(false);
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.media.download(media.id),
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: media.id }),
    staleTime: 4 * 60 * 1000,
  });

  if (isPending) {
    return (
      <View className="h-56 w-72 items-center justify-center rounded-lg bg-segment">
        <Text className="text-xs font-semibold text-muted">{t('status.loading', { ns: 'common' })}</Text>
      </View>
    );
  }

  if (error || !data?.downloadUrl || imageFailed) {
    return (
      <View className="h-56 w-72 items-center justify-center gap-2 rounded-lg bg-segment px-4">
        <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
        <Text className="text-center text-xs font-semibold text-muted">
          {t('detail.mediaUnavailable', { ns: 'reports', defaultValue: 'Media unavailable' })}
        </Text>
      </View>
    );
  }

  if (media.mediaType === 'video') {
    return (
      <View className="h-56 w-72 items-center justify-center gap-2 rounded-lg bg-segment px-4">
        <Ionicons name="videocam-outline" size={30} color={colors.textSecondary} />
        <Text className="text-center text-xs font-semibold text-muted">
          {t('detail.videoUnavailable', { ns: 'reports', defaultValue: 'Video preview is not available yet.' })}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: data.downloadUrl }}
      className="h-56 w-72 rounded-lg bg-segment"
      resizeMode="cover"
      onError={() => setImageFailed(true)}
    />
  );
}
