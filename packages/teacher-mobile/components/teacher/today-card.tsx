import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import type { TeacherClass, TodayOverview } from '@/data/teacher';
import { formatLongDate, todayIsoDate, weekdayLong } from '@/lib/date';

// Semantic status palette (mirrors the tailwind tokens for imperative fills).
const MINT = '#46B06A'; // on time / present
const SUN = '#F4A621'; // late
const CORAL = '#E8674E'; // absent
const TRACK = '#D7DBE2'; // not checked in — a quiet, unfilled tile

type StatusColor = typeof MINT | typeof SUN | typeof CORAL | typeof TRACK;

/**
 * The waffle: one tile per child in the class, colour-coded by state. It reads
 * like the room itself filling up — count the coral tiles and you know exactly
 * who's missing. Ordered on-time → late → absent → not-in so colour groups stay
 * contiguous and the makeup is legible at a glance.
 */
function PresenceWaffle({ cells }: { cells: StatusColor[] }) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-1.5 rounded-md bg-background p-3">
      {cells.map((color, index) => (
        <View
          key={index}
          style={{ backgroundColor: color }}
          className="h-3.5 w-3.5 rounded-[3px]"
        />
      ))}
    </View>
  );
}

/** A colour-keyed count in the legend strip below the waffle. */
function Stat({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View className="min-w-[68px] flex-row items-center gap-2">
      <View style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full" />
      <Text className="text-base font-extrabold text-foreground">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

/**
 * The home attendance card: "how is my class today?" at a glance. Shows today's
 * date, a hero present/total count with its rate, a waffle chart of the class,
 * and a legend of the four exclusive states. Tapping through opens the
 * attendance page — the teacher's main daily task.
 */
export function TodayCard({
  overview,
  classes = [],
}: {
  overview: TodayOverview;
  classes?: TeacherClass[];
}) {
  const { t, i18n } = useTranslation('teacher');
  const lang = i18n.language;
  const router = useRouter();
  const { attendance, medsPending } = overview;

  // One class → its name; several → "My classes". The room this pulse is for.
  const className =
    classes.length === 1 ? classes[0].name : classes.length > 1 ? t('classInfo.titleMulti') : '';

  const today = todayIsoDate();
  const { total, here, late, absent, notIn } = attendance;

  // `here` already includes late arrivals, so split into four mutually
  // exclusive buckets that sum back to total — the waffle and legend agree.
  const onTime = Math.max(0, total - late - absent - notIn);
  const allHere = total > 0 && here === total;
  const pct = total > 0 ? Math.round((here / total) * 100) : 0;

  const cells: StatusColor[] = [
    ...Array<StatusColor>(onTime).fill(MINT),
    ...Array<StatusColor>(late).fill(SUN),
    ...Array<StatusColor>(absent).fill(CORAL),
    ...Array<StatusColor>(notIn).fill(TRACK),
  ];

  return (
    <Card className="mt-3">
      {/* Title: which class, with today's date beneath + the way to the page. */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {className ? (
            <Text numberOfLines={1} className="text-base font-extrabold text-foreground">
              {className}
            </Text>
          ) : null}
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Ionicons name="calendar-clear-outline" size={14} color={colors.textSecondary} />
            <Text className="text-xs font-semibold text-muted">
              {weekdayLong(today, lang)} · {formatLongDate(today, lang)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/attendance')}
          hitSlop={8}
          className="flex-row items-center gap-1 pl-2">
          <Text className="text-sm font-semibold text-primary">{t('home.openAttendance')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Hero: present count over the roster, with the rate and a health pill. */}
      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <View className="flex-row items-baseline">
            <Text className="text-4xl font-extrabold leading-none text-foreground">{here}</Text>
            <Text className="text-xl font-bold text-muted-soft"> /{total}</Text>
          </View>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('home.hereNow')}
          </Text>
        </View>
        {allHere ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-mint px-3 py-1.5">
            <Ionicons name="checkmark-circle" size={16} color={MINT} />
            <Text className="text-sm font-bold text-mint-ink">{t('home.allHere')}</Text>
          </View>
        ) : total > 0 ? (
          <View className="rounded-full bg-background px-3 py-1.5">
            <Text className="text-sm font-bold text-foreground">
              {t('home.attendanceRate', { pct })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* The graph. */}
      {total > 0 ? <PresenceWaffle cells={cells} /> : null}

      {/* Legend + counts: the four exclusive states, summing to the roster. */}
      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
        <Stat color={MINT} value={onTime} label={t('home.onTime')} />
        <Stat color={SUN} value={late} label={t('home.late')} />
        <Stat color={CORAL} value={absent} label={t('home.absent')} />
        <Stat color={TRACK} value={notIn} label={t('home.notIn')} />
      </View>

      {medsPending > 0 ? (
        <Pressable
          onPress={() => router.push('/medications')}
          className="mt-4 flex-row items-center gap-2 rounded-md bg-coral px-3 py-3">
          <Ionicons name="medkit" size={18} color={CORAL} />
          <Text className="flex-1 text-sm font-semibold text-foreground">
            {t('home.medsToGive', { count: medsPending })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={CORAL} />
        </Pressable>
      ) : null}
    </Card>
  );
}
