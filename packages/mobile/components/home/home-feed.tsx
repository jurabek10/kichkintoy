import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { FeedCard } from '@/components/feed-card';
import { EmptyFeedCard } from '@/components/home/empty-feed-card';
import { colors } from '@/constants/theme';
import type { HomeFeed as HomeFeedData } from '@/data/parent';

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

/** The "Today" section: latest report (with stats), album, and notice. Each
 *  slot always renders — its content, or a "nothing yet" placeholder. */
export function HomeFeed({ feed }: { feed: HomeFeedData }) {
  const { t } = useTranslation('app');
  const router = useRouter();

  return (
    <>
      <Text className="mb-3 mt-5 text-lg font-extrabold text-foreground">
        {t('parentHome.today')}
      </Text>

      <View className="gap-3">
        {feed.report ? (
          <FeedCard
            kind="report"
            tag={t('parentHome.report.tag')}
            time={feed.report.dateLabel}
            title={t('parentHome.report.title')}
            body={feed.report.note || t('parentHome.report.empty')}
            cta={t('parentHome.report.cta')}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: feed.report!.id } })}>
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
        ) : (
          <EmptyFeedCard
            kind="report"
            tag={t('parentHome.report.tag')}
            title={t('parentHome.report.none')}
            subtitle={t('parentHome.caughtUp')}
          />
        )}

        {feed.album ? (
          <FeedCard
            kind="album"
            tag={t('parentHome.photos.tag')}
            time={feed.album.dateLabel}
            title={feed.album.caption || t('parentHome.photos.tag')}
            body={t('parentHome.photos.caption', { count: feed.album.photoCount })}
            cta={t('parentHome.photos.cta')}
          />
        ) : (
          <EmptyFeedCard
            kind="album"
            tag={t('parentHome.photos.tag')}
            title={t('parentHome.photos.none')}
            subtitle={t('parentHome.caughtUp')}
          />
        )}

        {feed.notice ? (
          <FeedCard
            kind="notice"
            tag={t('parentHome.notice.tag')}
            time={feed.notice.dateLabel}
            title={feed.notice.title}
            body={feed.notice.body}
            cta={t('parentHome.notice.cta')}
          />
        ) : (
          <EmptyFeedCard
            kind="notice"
            tag={t('parentHome.notice.tag')}
            title={t('parentHome.notice.none')}
            subtitle={t('parentHome.caughtUp')}
          />
        )}
      </View>
    </>
  );
}
