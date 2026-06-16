import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import {
  useAttendanceSummary,
  useCenter,
  useCurrentChild,
  useHomeFeed,
  useUpcomingEvents,
} from '@/data/parent';
import { useAuth } from '@/lib/auth';

import { AttendanceCard } from '@/components/home/attendance-card';
import { CenterCard } from '@/components/home/center-card';
import { GreetingBanner } from '@/components/home/greeting-banner';
import { HomeFeed } from '@/components/home/home-feed';
import { HomeHeader } from '@/components/home/home-header';
import { UpcomingCard } from '@/components/home/upcoming-card';

export default function HomeScreen() {
  const { t } = useTranslation(['app', 'account']);
  const router = useRouter();
  const { signOut } = useAuth();
  const child = useCurrentChild();
  const center = useCenter();
  const homeFeed = useHomeFeed();
  const summary = useAttendanceSummary();
  const upcoming = useUpcomingEvents();

  if (child.isPending) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Loader />
      </SafeAreaView>
    );
  }

  if (!child.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background p-4">
        <EmptyState
          icon="people-outline"
          title={t('parentHome.noChildrenTitle')}
          body={t('parentHome.noChildrenBody')}
        />
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
          className="mt-4 items-center rounded-md bg-primary py-3.5">
          <Text className="text-base font-bold text-white">{t('menu.signOut', { ns: 'account' })}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-6">
        <HomeHeader child={child.data} />
        <GreetingBanner />
        <CenterCard centerName={center.data.name} childClassName={child.data.className} />
        <HomeFeed feed={homeFeed.data} />
        <AttendanceCard attended={summary.data.attended} total={summary.data.total} />
        <UpcomingCard events={upcoming.data} />
      </ScrollView>
    </SafeAreaView>
  );
}
