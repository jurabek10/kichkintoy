import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import type { TeacherClass } from '@/data/teacher';
import { todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

// Gender-bar fills (the ratio meter). Mirrors the web's sky/bubblegum.
const SKY = '#3E8FE0';
const PINK = '#EC5E92';
const MINT = '#46B06A';
const CORAL = '#E8674E';
const PRIMARY = '#3B8FF3';

type ReportRow = { klass: TeacherClass; sent: number; total: number; loading: boolean };

/** One class's report progress: an initial (or a mint check when finished), the
 *  class name + roster size, a sent/total tag, and its own progress bar. Taps
 *  through to that class's report board — the teacher's next thing to write. */
function ClassReportRow({ row }: { row: ReportRow }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const { klass, sent, total, loading } = row;
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const done = !loading && total > 0 && sent >= total;
  const initial = klass.name.trim().charAt(0).toUpperCase() || '—';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/class-report/[id]', params: { id: klass.id } })}
      className="gap-2 rounded-md bg-background p-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${done ? 'bg-mint' : 'bg-pill'}`}>
            {done ? (
              <Ionicons name="checkmark" size={18} color={MINT} />
            ) : (
              <Text className="text-sm font-extrabold text-foreground">{initial}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-sm font-bold text-foreground">
              {klass.name}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted">
              {t('home.childrenCount', { count: klass.childCount })}
            </Text>
          </View>
        </View>
        <Text className={`text-xs font-bold ${done ? 'text-mint-ink' : 'text-muted'}`}>
          {loading ? '—' : done ? t('reports.allSent') : t('reports.sent', { sent, total })}
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-segment">
        <View
          className="h-full rounded-full"
          style={{ width: `${loading ? 0 : pct}%`, backgroundColor: done ? MINT : PRIMARY }}
        />
      </View>
    </Pressable>
  );
}

/** One composition figure: a tinted icon, its count, and a label. Two per row
 *  so each has room to breathe (the web packs four across a wider canvas). */
function InfoTile({
  icon,
  tone,
  ink,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  ink: string;
  value: number | string;
  label: string;
}) {
  return (
    <View className="w-[48%] flex-row items-center gap-3 rounded-md bg-background p-3">
      <View className={`h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
        <Ionicons name={icon} size={19} color={ink} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-extrabold text-foreground">{value}</Text>
        <Text numberOfLines={1} className="text-[11px] text-muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * The two data cards the web teacher home shows below the attendance pulse:
 * class make-up (children / free seats / boys / girls, with a gender ratio bar)
 * and today's report progress. Both read the same per-class report-status
 * source as the Reports tab, so the numbers never disagree.
 */
export function HomeStats({ classes }: { classes: TeacherClass[] }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
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
  const pending = Math.max(0, expected - sent);

  const reportRows: ReportRow[] = classes.map((klass, i) => {
    const rows = statusQueries[i]?.data ?? [];
    return {
      klass,
      sent: rows.filter((r) => r.report?.status === 'published').length,
      total: rows.length || klass.childCount,
      loading: statusQueries[i]?.isPending ?? false,
    };
  });

  const genderLoading = statusQueries.some((q) => q.isPending);
  const genderTotal = boys + girls;
  const title = classes.length === 1 ? classes[0].name : t('classInfo.titleMulti');

  if (classes.length === 0) return null;

  return (
    <>
      <Card className="mt-3">
        {/* Header: identity + the way through to the classes page (web parity). */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-grape">
              <Ionicons name="people-outline" size={20} color="#7C5CD8" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-base font-extrabold text-foreground">
                {title}
              </Text>
              <Text className="text-[13px] text-muted">{t('classInfo.sub')}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/classes')}
            hitSlop={8}
            className="flex-row items-center gap-1 pl-2">
            <Text className="text-sm font-semibold text-primary">{t('classInfo.viewAll')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* 2×2 composition tiles. */}
        <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
          <InfoTile
            icon="people-outline"
            tone="bg-grape"
            ink="#7C5CD8"
            value={children}
            label={t('classInfo.children')}
          />
          <InfoTile
            icon="person-add-outline"
            tone="bg-mint"
            ink="#46B06A"
            value={capacity > 0 ? emptySeats : '—'}
            label={t('classInfo.emptySeats')}
          />
          <InfoTile
            icon="male-outline"
            tone="bg-sky"
            ink={SKY}
            value={genderLoading ? '—' : boys}
            label={t('classInfo.boys')}
          />
          <InfoTile
            icon="female-outline"
            tone="bg-bubblegum"
            ink={PINK}
            value={genderLoading ? '—' : girls}
            label={t('classInfo.girls')}
          />
        </View>

        {/* Gender ratio bar. */}
        {!genderLoading && genderTotal > 0 ? (
          <View className="mt-4">
            <View className="h-2 flex-row overflow-hidden rounded-full bg-segment">
              <View style={{ flex: boys, backgroundColor: SKY }} />
              <View style={{ flex: girls, backgroundColor: PINK }} />
            </View>
            <Text className="mt-2 text-[11px] text-muted">
              {t('classInfo.ratio', { boys, girls })}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card className="mt-3">
        {/* Header: identity + the way through to the full reports tab. */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-coral">
              <Ionicons name="document-text-outline" size={20} color={CORAL} />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-base font-extrabold text-foreground">
                {t('home.todayReports')}
              </Text>
              <Text className="text-[13px] text-muted">{t('home.todayReportsSub')}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/reports')}
            hitSlop={8}
            className="flex-row items-center gap-1 pl-2">
            <Text className="text-sm font-semibold text-primary">{t('home.allReports')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Overall progress: the big rate, the emphasized track, the split. */}
        <View className="mt-4 flex-row items-end justify-between">
          <View className="flex-row items-baseline">
            <Text className="text-4xl font-extrabold leading-none text-foreground">{pct}</Text>
            <Text className="text-xl font-bold text-muted-soft">%</Text>
          </View>
          <View className="items-end gap-1">
            <View className="flex-row items-center gap-1.5">
              <View style={{ backgroundColor: MINT }} className="h-2.5 w-2.5 rounded-full" />
              <Text className="text-sm font-bold text-foreground">{sent}</Text>
              <Text className="text-xs text-muted">{t('home.reportsSent')}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View style={{ backgroundColor: CORAL }} className="h-2.5 w-2.5 rounded-full" />
              <Text className="text-sm font-bold text-foreground">{pending}</Text>
              <Text className="text-xs text-muted">{t('home.reportsPending')}</Text>
            </View>
          </View>
        </View>
        <View className="mt-3 h-2.5 flex-row overflow-hidden rounded-full bg-segment">
          <View style={{ flex: sent, backgroundColor: MINT }} />
          <View style={{ flex: pending, backgroundColor: CORAL }} />
        </View>

        {/* Per-class breakdown — the teacher's actual worklist. */}
        <View className="mt-4 gap-2.5">
          {reportRows.map((row) => (
            <ClassReportRow key={row.klass.id} row={row} />
          ))}
        </View>
      </Card>
    </>
  );
}
