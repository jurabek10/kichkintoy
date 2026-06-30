import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import type { TodayOverview } from '@/data/teacher';

/** A labelled segment of the attendance bar. Only renders when it has children. */
function BarSegment({ value, total, color }: { value: number; total: number; color: string }) {
  if (value <= 0 || total <= 0) return null;
  return <View style={{ flex: value / total, backgroundColor: color }} />;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full" />
      <Text className="text-sm font-bold text-foreground">{value}</Text>
      <Text className="text-sm text-muted">{label}</Text>
    </View>
  );
}

/**
 * The home hero: "how is my class today?" at a glance. A single attendance bar
 * (here / late / absent / not in) over the day's roster, plus a medicine nudge.
 * Tapping it opens the attendance page — the teacher's main daily task.
 */
export function TodayCard({ overview }: { overview: TodayOverview }) {
  const { t } = useTranslation('teacher');
  const router = useRouter();
  const { attendance, medsPending } = overview;
  const allHere = attendance.total > 0 && attendance.here === attendance.total;

  return (
    <Card className="mt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-2xl bg-mint">
            <Ionicons name="calendar-number" size={18} color={colors.primary} />
          </View>
          <Text className="text-base font-extrabold text-foreground">{t('home.today')}</Text>
        </View>
        <Pressable onPress={() => router.push('/attendance')} hitSlop={8} className="flex-row items-center gap-1">
          <Text className="text-sm font-semibold text-primary">{t('home.openAttendance')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-3xl font-extrabold text-foreground">
            {attendance.here}
            <Text className="text-lg text-muted">/{attendance.total}</Text>
          </Text>
          <Text className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('home.hereNow')}
          </Text>
        </View>
        {allHere ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-mint px-3 py-1.5">
            <Ionicons name="checkmark-circle" size={16} color="#46B06A" />
            <Text className="text-sm font-bold text-mint-ink">{t('home.allHere')}</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3 h-2.5 flex-row overflow-hidden rounded-full bg-segment">
        <BarSegment value={attendance.here} total={attendance.total} color="#46B06A" />
        <BarSegment value={attendance.late} total={attendance.total} color="#F4A621" />
        <BarSegment value={attendance.absent} total={attendance.total} color="#E8674E" />
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-2">
        <Legend color="#46B06A" label={t('home.here')} value={attendance.here} />
        <Legend color="#F4A621" label={t('home.late')} value={attendance.late} />
        <Legend color="#E8674E" label={t('home.absent')} value={attendance.absent} />
        <Legend color="#AEB4BE" label={t('home.notIn')} value={attendance.notIn} />
      </View>

      {medsPending > 0 ? (
        <Pressable
          onPress={() => router.push('/medications')}
          className="mt-4 flex-row items-center gap-2 rounded-md bg-coral px-3 py-3">
          <Ionicons name="medkit" size={18} color="#E8674E" />
          <Text className="flex-1 text-sm font-semibold text-foreground">
            {t('home.medsToGive', { count: medsPending })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#E8674E" />
        </Pressable>
      ) : null}
    </Card>
  );
}
