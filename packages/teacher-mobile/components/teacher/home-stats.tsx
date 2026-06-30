import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import type { TeacherClass } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

function Tile({
  icon,
  tone,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  value: number | string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-1 rounded-md bg-background py-3">
      <View className={`h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Ionicons name={icon} size={18} />
      </View>
      <Text className="text-lg font-extrabold text-foreground">{value}</Text>
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}

/**
 * The two data cards the web teacher home shows below the attendance pulse:
 * class make-up (children / free seats / boys / girls) and today's report
 * progress. Both read the same per-class report-status source as the Reports
 * tab, so the numbers never disagree.
 */
export function HomeStats({ classes }: { classes: TeacherClass[] }) {
  const { t } = useTranslation('teacher');
  const date = todayIsoDate();

  const statusQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: teacherQueryKeys.classReportStatuses(klass.id, date),
      queryFn: () => orpc.reports.classStatuses({ classId: klass.id, reportDate: date }),
      enabled: classes.length > 0,
    })),
  });

  let boys = 0;
  let girls = 0;
  let sent = 0;
  let expected = 0;
  statusQueries.forEach((query, i) => {
    const rows = query.data ?? [];
    for (const row of rows) {
      if (row.gender === 'boy') boys += 1;
      else if (row.gender === 'girl') girls += 1;
    }
    sent += rows.filter((r) => r.report?.status === 'published').length;
    expected += rows.length || classes[i]?.childCount || 0;
  });

  const children = classes.reduce((sum, k) => sum + k.childCount, 0);
  const capacity = classes.reduce((sum, k) => sum + (k.maxChildren ?? 0), 0);
  const emptySeats = Math.max(0, capacity - children);
  const pct = expected > 0 ? Math.round((sent / expected) * 100) : 0;

  if (classes.length === 0) return null;

  return (
    <>
      <Card className="mt-3">
        <Text className="mb-3 text-base font-extrabold text-foreground">{t('home.classInfo')}</Text>
        <View className="flex-row gap-2">
          <Tile icon="people" tone="bg-grape" value={children} label={t('roster.title')} />
          <Tile icon="add-circle" tone="bg-mint" value={capacity > 0 ? emptySeats : '—'} label={t('home.emptySeats')} />
          <Tile icon="male" tone="bg-sky" value={boys} label={t('roster.boys')} />
          <Tile icon="female" tone="bg-coral" value={girls} label={t('roster.girls')} />
        </View>
      </Card>

      <Card className="mt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-foreground">{t('home.todayReports')}</Text>
          <Text className="text-sm font-bold text-muted">
            {t('reports.sent', { sent, total: expected })}
          </Text>
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-segment">
          <View className="h-full rounded-full bg-coral-ink" style={{ width: `${pct}%` }} />
        </View>
        <Text className="mt-2 text-[12px] text-muted">{t('home.reportsPct', { pct })}</Text>
      </Card>
    </>
  );
}
