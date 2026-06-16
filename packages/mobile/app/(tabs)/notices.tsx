import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/feed-card';
import { ScreenHeader } from '@/components/screen-header';
import { Loader } from '@/components/ui/loader';
import { useHomeFeed } from '@/data/parent';

export default function NoticesScreen() {
  const { t } = useTranslation(['nav', 'app']);
  const { data: feed, isPending } = useHomeFeed();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('items.notices', { ns: 'nav' })} />
      {isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4">
          <FeedCard
            kind="notice"
            tag={t('parentHome.notice.tag', { ns: 'app' })}
            time={feed.notice.dateLabel}
            title={feed.notice.title}
            body={feed.notice.body}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
