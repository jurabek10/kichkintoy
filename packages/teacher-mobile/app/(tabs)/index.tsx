import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureGrid } from '@/components/home/feature-grid';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { ClassesCard } from '@/components/teacher/classes-card';
import { HomeStats } from '@/components/teacher/home-stats';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { TodayCard } from '@/components/teacher/today-card';
import { colors } from '@/constants/theme';
import { useTeacherClasses, useTodayOverview } from '@/data/teacher';
import { useAuth } from '@/lib/auth';

/** The greeting + center line, by time of day. */
function Greeting() {
  const { t } = useTranslation('teacher');
  const { session } = useAuth();
  const firstName = (session?.user.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const centerName = session?.membership.centerName ?? '';
  const hour = new Date().getHours();
  const slot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <Card className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-sunshine">
        <Ionicons name="sunny" size={22} color="#F0A93B" />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-base font-bold text-foreground">
          {t(`home.greeting.${slot}`, { name: firstName })}
        </Text>
        {centerName ? <Text className="text-[13px] text-muted">{centerName}</Text> : null}
      </View>
    </Card>
  );
}

export default function TeacherHomeScreen() {
  const { t } = useTranslation('teacher');
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const overview = useTodayOverview();
  const classes = useTeacherClasses();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <TeacherHeader />
        <Greeting />

        {overview.isPending ? (
          <View className="mt-6">
            <Loader />
          </View>
        ) : (
          <TodayCard overview={overview.data} />
        )}

        <Card className="mt-3">
          <Text className="text-base font-extrabold text-foreground">{t('home.shortcuts')}</Text>
          <FeatureGrid />
        </Card>

        {!classes.isPending ? (
          <>
            <HomeStats classes={classes.data} />
            <ClassesCard classes={classes.data} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
