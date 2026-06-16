import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { FeedCard } from '@/components/feed-card';
import type { HomeFeed as HomeFeedData } from '@/constants/data';
import { colors } from '@/constants/theme';

function Stat({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-md bg-background py-3">
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text className="text-[11px] font-semibold text-muted">{label}</Text>
      <Text numberOfLines={1} className="text-sm font-bold text-foreground">
        {value}
      </Text>
    </View>
  );
}

/** The "Today" section: latest report (with stats), album, and notice. */
export function HomeFeed({ feed }: { feed: HomeFeedData }) {
  const { t } = useTranslation('app');
  return (
    <>
      <Text className="mb-3 mt-5 text-lg font-extrabold text-foreground">
        {t('parentHome.today')}
      </Text>

      <View className="gap-3">
        <FeedCard
          kind="report"
          tag={t('parentHome.report.tag')}
          time={feed.report.dateLabel}
          title={feed.report.title}
          body={feed.report.note}
          cta={t('parentHome.report.cta')}>
          <View className="mt-3 flex-row gap-2">
            <Stat icon="happy-outline" label={t('parentHome.report.mood')} value={feed.report.mood} />
            <Stat
              icon="images-outline"
              label={t('parentHome.report.photos')}
              value={String(feed.report.photoCount)}
            />
            <Stat
              icon="document-text-outline"
              label={t('parentHome.report.updates')}
              value={String(feed.report.updateCount)}
            />
          </View>
        </FeedCard>

        <FeedCard
          kind="album"
          tag={t('parentHome.photos.tag')}
          time={feed.album.dateLabel}
          title={feed.album.caption}
          body={t('parentHome.photos.caption', { count: feed.album.photoCount })}
          cta={t('parentHome.photos.cta')}
        />

        <FeedCard
          kind="notice"
          tag={t('parentHome.notice.tag')}
          time={feed.notice.dateLabel}
          title={feed.notice.title}
          body={feed.notice.body}
          cta={t('parentHome.notice.cta')}
        />
      </View>
    </>
  );
}
