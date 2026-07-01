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
import { colors } from '@/constants/theme';
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

  const remaining = Math.max(0, row.total - row.sent);
  const initial = row.klass.name.trim().charAt(0).toUpperCase() || '·';

  return (
    <Pressable onPress={() => router.push({ pathname: '/class-report/[id]', params: { id: row.klass.id } })}>
      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className={`h-10 w-10 items-center justify-center rounded-xl ${done ? 'bg-mint' : 'bg-sky'}`}>
            {done ? (
              <Ionicons name="checkmark" size={20} color="#46B06A" />
            ) : (
              <Text className="text-[15px] font-extrabold text-sky-ink">{initial}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[15px] font-bold text-foreground">
              {row.klass.name}
            </Text>
            <Text className="mt-0.5 text-[12px] text-muted">
              {row.loading
                ? t('roster.childrenCount', { count: row.klass.childCount })
                : done
                  ? t('reports.allSent')
                  : t('reports.pending', { count: remaining })}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[13px] font-extrabold text-foreground">
              {row.loading ? '—' : `${row.sent}/${row.total}`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-segment">
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

  const anyLoading = rows.some((r) => r.loading);
  const totalSent = rows.reduce((n, r) => n + r.sent, 0);
  const totalExpected = rows.reduce((n, r) => n + r.total, 0);
  const totalPct = totalExpected > 0 ? Math.round((totalSent / totalExpected) * 100) : 0;
  const allDone = !anyLoading && totalExpected > 0 && totalSent >= totalExpected;

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
          {/* Overall progress across every class today. */}
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                  {t('reports.todayTitle')}
                </Text>
                <Text className="mt-0.5 text-2xl font-extrabold text-foreground">
                  {anyLoading ? '—' : `${totalSent} / ${totalExpected}`}
                </Text>
              </View>
              <View
                className={`items-center justify-center rounded-full px-3 py-1.5 ${allDone ? 'bg-mint' : 'bg-sky'}`}>
                <Text className={`text-[13px] font-extrabold ${allDone ? 'text-mint-ink' : 'text-sky-ink'}`}>
                  {anyLoading ? '—' : allDone ? t('reports.allSent') : `${totalPct}%`}
                </Text>
              </View>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-segment">
              <View
                className={`h-full rounded-full ${allDone ? 'bg-mint-ink' : 'bg-primary'}`}
                style={{ width: `${anyLoading ? 0 : totalPct}%` }}
              />
            </View>
            {anyLoading ? null : (
              <Text className="text-[12px] font-semibold text-muted">
                {allDone ? t('reports.allSent') : t('reports.pending', { count: totalExpected - totalSent })}
              </Text>
            )}
          </Card>

          <Text className="mt-1 px-1 text-[13px] font-semibold text-muted">{t('reports.subtitle')}</Text>
          {rows.map((row) => (
            <ClassProgress key={row.klass.id} row={row} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
