import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useTeacherClasses, type TeacherClass } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type Row = { klass: TeacherClass; sent: number; total: number; loading: boolean };

function ClassProgress({ row }: { row: Row }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const pct = row.total > 0 ? Math.round((row.sent / row.total) * 100) : 0;
  const done = !row.loading && row.total > 0 && row.sent >= row.total;

  return (
    <Pressable onPress={() => router.push({ pathname: '/class-report/[id]', params: { id: row.klass.id } })}>
    <Card>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${done ? 'bg-mint' : 'bg-coral'}`}>
            {done ? (
              <Ionicons name="checkmark-circle" size={20} color="#46B06A" />
            ) : (
              <Text className="text-sm font-extrabold text-coral-ink">
                {row.klass.name.trim().charAt(0).toUpperCase() || '·'}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
              {row.klass.name}
            </Text>
            <Text className="text-[12px] text-muted">
              {t('roster.childrenCount', { count: row.klass.childCount })}
            </Text>
          </View>
        </View>
        <Text className="text-[12px] font-bold text-muted">
          {row.loading ? '—' : done ? t('reports.allSent') : t('reports.sent', { sent: row.sent, total: row.total })}
        </Text>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-segment">
        <View
          className={`h-full rounded-full ${done ? 'bg-mint-ink' : 'bg-primary'}`}
          style={{ width: `${row.loading ? 0 : pct}%` }}
        />
      </View>
    </Card>
    </Pressable>
  );
}

export default function ReportsScreen() {
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();
  const { data: classes, isPending } = useTeacherClasses();

  const statusQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: teacherQueryKeys.classReportStatuses(klass.id, date),
      queryFn: () => orpc.reports.classStatuses({ classId: klass.id, reportDate: date }),
      enabled: classes.length > 0,
    })),
  });

  const rows: Row[] = classes.map((klass, i) => {
    const data = statusQueries[i]?.data ?? [];
    const total = data.length || klass.childCount;
    const sent = data.filter((r) => r.report?.status === 'published').length;
    return { klass, sent, total, loading: statusQueries[i]?.isPending ?? true };
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('reports.title')} />
      {isPending ? (
        <Loader />
      ) : classes.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="document-text-outline" title={t('reports.empty')} body={t('classes.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          <Text className="px-1 text-[13px] text-muted">{t('reports.subtitle')}</Text>
          {rows.map((row) => (
            <ClassProgress key={row.klass.id} row={row} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
