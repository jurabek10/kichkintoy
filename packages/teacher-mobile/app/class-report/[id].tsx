import { Ionicons } from '@expo/vector-icons';
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
import { colors } from '@/constants/theme';
import { useClassReportStatuses, useTeacherClasses, type ClassReportStatus } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  published: { bg: 'bg-mint', text: 'text-mint-ink' },
  draft: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  none: { bg: 'bg-pill', text: 'text-muted' },
};

function ChildRow({ row }: { row: ClassReportStatus }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const tone = STATUS_TONE[row.status];
  return (
    <Pressable onPress={() => router.push({ pathname: '/child/[id]', params: { id: row.childId } })}>
      <Card className="flex-row items-center gap-3">
        <Avatar uri={row.photo} size={40} />
        <Text className="flex-1 text-[15px] font-bold text-foreground">{row.name}</Text>
        <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
          <Text className={`text-[11px] font-bold ${tone.text}`}>
            {t(`reports.status.${row.status}`)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

export default function ClassReportBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? '';
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();
  const classes = useTeacherClasses();
  const statuses = useClassReportStatuses(classId, date);

  const klass = useMemo(() => classes.data.find((c) => c.id === classId), [classes.data, classId]);
  const sent = statuses.data.filter((r) => r.status === 'published').length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={klass?.name ?? t('reports.title')} back />
      {statuses.isPending ? (
        <Loader />
      ) : statuses.data.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="document-text-outline" title={t('roster.empty')} body={t('roster.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          <Text className="px-1 text-[13px] text-muted">
            {t('reports.sent', { sent, total: statuses.data.length })}
          </Text>
          {statuses.data.map((row) => (
            <ChildRow key={row.childId} row={row} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
