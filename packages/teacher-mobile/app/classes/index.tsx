import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useTeacherClasses, type TeacherClass } from '@/data/teacher';

function ClassCard({ klass }: { klass: TeacherClass }) {
  const router = useRouter();
  const { t } = useTranslation('teacher');
  const free = klass.maxChildren != null ? Math.max(0, klass.maxChildren - klass.childCount) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/class/[id]', params: { id: klass.id } })}>
      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-grape">
          <Text className="text-lg font-extrabold text-grape-ink">
            {klass.name.trim().charAt(0).toUpperCase() || '·'}
          </Text>
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-bold text-foreground">
            {klass.name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted">
            {t('roster.childrenCount', { count: klass.childCount })}
            {klass.ageGroup ? ` · ${klass.ageGroup}` : ''}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <View className="rounded-full bg-mint px-2.5 py-1">
              <Text className="text-[11px] font-bold text-mint-ink">
                {klass.assignmentRole === 'assistant_teacher' ? t('classes.assistant') : t('classes.teacher')}
              </Text>
            </View>
            {free != null ? (
              <Text className="text-[12px] text-muted">
                {free > 0 ? t('classes.seatsFree', { count: free }) : t('classes.full')}
              </Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

export default function ClassesScreen() {
  const { t } = useTranslation('teacher');
  const { data: classes, isPending } = useTeacherClasses();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('classes.title')} back />
      {isPending ? (
        <Loader />
      ) : classes.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="people-outline" title={t('classes.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {classes.map((klass) => (
            <ClassCard key={klass.id} klass={klass} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
