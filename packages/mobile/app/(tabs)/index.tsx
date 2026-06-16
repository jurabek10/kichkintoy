import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui/loader';
import {
  useAttendanceSummary,
  useCenter,
  useCurrentChild,
  useHomeFeed,
  useUpcomingEvents,
} from '@/data/parent';

import { AttendanceCard } from './_components/attendance-card';
import { CenterCard } from './_components/center-card';
import { GreetingBanner } from './_components/greeting-banner';
import { HomeFeed } from './_components/home-feed';
import { HomeHeader } from './_components/home-header';
import { UpcomingCard } from './_components/upcoming-card';

export default function HomeScreen() {
  const child = useCurrentChild();
  const center = useCenter();
  const homeFeed = useHomeFeed();
  const summary = useAttendanceSummary();
  const upcoming = useUpcomingEvents();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {child.isPending || center.isPending || homeFeed.isPending ? (
        <Loader />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-6">
          <HomeHeader child={child.data} />
          <GreetingBanner />
          <CenterCard centerName={center.data.name} childClassName={child.data.className} />
          <HomeFeed feed={homeFeed.data} />
          <AttendanceCard attended={summary.data.attended} total={summary.data.total} />
          <UpcomingCard events={upcoming.data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
