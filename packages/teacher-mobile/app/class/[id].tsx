import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useClassRoster, useTeacherClasses, type RosterChild } from '@/data/teacher';

function ChildTile({ child }: { child: RosterChild }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
      className="w-1/3 items-center gap-1.5 py-3">
      <Avatar uri={child.photo} size={64} />
      <Text numberOfLines={1} className="px-1 text-[13px] font-semibold text-foreground">
        {child.name}
      </Text>
      {child.ageLabel ? <Text className="text-[11px] text-muted">{child.ageLabel}</Text> : null}
    </Pressable>
  );
}

export default function ClassRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? '';
  const { t } = useTranslation('teacher');
  const classes = useTeacherClasses();
  const roster = useClassRoster(classId);

  const klass = useMemo(() => classes.data.find((c) => c.id === classId), [classes.data, classId]);
  const boys = roster.data.filter((c) => c.gender === 'boy').length;
  const girls = roster.data.filter((c) => c.gender === 'girl').length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={klass?.name ?? t('roster.title')} back />
      {roster.isPending ? (
        <Loader />
      ) : (
        <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
          <Card className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-xl font-extrabold text-foreground">{roster.data.length}</Text>
              <Text className="text-[12px] text-muted">{t('roster.title')}</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-extrabold text-sky-ink">{boys}</Text>
              <Text className="text-[12px] text-muted">{t('roster.boys')}</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-extrabold text-coral-ink">{girls}</Text>
              <Text className="text-[12px] text-muted">{t('roster.girls')}</Text>
            </View>
          </Card>

          {roster.data.length === 0 ? (
            <View className="mt-3">
              <EmptyState icon="people-outline" title={t('roster.empty')} body={t('roster.emptyBody')} />
            </View>
          ) : (
            <Card className="mt-3">
              <View className="flex-row flex-wrap">
                {roster.data.map((child) => (
                  <ChildTile key={child.id} child={child} />
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
