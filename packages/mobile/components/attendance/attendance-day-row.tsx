import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { AttendanceDay } from '@/data/attendance';
import { parseIsoDate, weekdayShort } from '@/lib/date';
import { cn } from '@/lib/utils';

const MINT = '#46B06A';
const MUTED = '#8A8F99';

/** Status → i18n key for the chip label. */
const STATUS_KEY: Record<string, string> = {
  present: 'parentHome.calendar.present',
  late: 'parentHome.calendar.late',
  left_early: 'parentHome.calendar.leftEarly',
  picked_up: 'parentHome.calendar.pickedUp',
  excused: 'parentHome.calendar.excused',
  absent: 'parentHome.calendar.absent',
};

const RELATIONSHIP_KEY: Record<string, string> = {
  mother: 'parentHome.calendar.relationship.mother',
  father: 'parentHome.calendar.relationship.father',
  grandparent: 'parentHome.calendar.relationship.grandparent',
  other: 'parentHome.calendar.relationship.other',
};

/** Status → chip/badge colours (mirrors the calendar's palette). */
function chipClasses(day: AttendanceDay): { bg: string; text: string } {
  if (day.attended) return { bg: 'bg-mint', text: 'text-mint-ink' };
  if (day.status === 'absent') return { bg: 'bg-coral', text: 'text-coral-ink' };
  if (day.status === 'excused') return { bg: 'bg-sunshine', text: 'text-sunshine-ink' };
  return { bg: 'bg-pill', text: 'text-muted' };
}

/** One day in the full attendance list: date badge, status, in/out times, and
 *  the absence reason or note when present. */
export function AttendanceDayRow({ day }: { day: AttendanceDay }) {
  const { t, i18n } = useTranslation('app');
  const lang = i18n.language;
  const { day: dayNum } = parseIsoDate(day.date);
  const chip = chipClasses(day);
  const relationshipLabel = day.pickedUpRelationship
    ? t(RELATIONSHIP_KEY[day.pickedUpRelationship] ?? 'parentHome.calendar.relationship.other')
    : null;

  return (
    <View className="flex-row gap-3 rounded-lg border border-border bg-card p-3">
      <View className="w-14 items-center pt-0.5">
        <View className={cn('h-12 w-12 items-center justify-center rounded-full', chip.bg)}>
          <Text className={cn('text-xl font-extrabold', chip.text)}>{dayNum}</Text>
        </View>
        <Text className="mt-1 text-[11px] font-bold text-muted" numberOfLines={1}>
          {weekdayShort(day.date, lang)}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
            {day.checkInLabel || day.checkOutLabel
              ? t('parentHome.calendar.recorded')
              : t(STATUS_KEY[day.status] ?? 'parentHome.calendar.present')}
          </Text>
          <View className={cn('rounded-full px-2 py-0.5', chip.bg)}>
            <Text className={cn('text-[11px] font-semibold', chip.text)}>
              {t(STATUS_KEY[day.status] ?? 'parentHome.calendar.present')}
            </Text>
          </View>
        </View>

        {day.checkInLabel || day.checkOutLabel ? (
          <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
            {day.checkInLabel ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="log-in-outline" size={15} color={MINT} />
                <Text className="text-sm text-foreground">
                  {t('parentHome.calendar.checkIn')} {day.checkInLabel}
                </Text>
              </View>
            ) : null}
            {day.checkOutLabel ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="log-out-outline" size={15} color={MUTED} />
                <Text className="text-sm text-foreground">
                  {t('parentHome.calendar.checkOut')} {day.checkOutLabel}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {day.pickedUpBy ? (
          <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-pill px-2.5 py-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-card">
              <Ionicons name="person-outline" size={15} color={MUTED} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-semibold uppercase text-muted">
                {t('parentHome.calendar.pickedUpBy')}
              </Text>
              <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                {day.pickedUpBy}
              </Text>
            </View>
            {relationshipLabel ? (
              <View className="rounded-full bg-card px-2 py-1">
                <Text className="text-[11px] font-semibold text-primary">{relationshipLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {day.status === 'absent' && day.absenceReason ? (
          <Text className="mt-1 text-sm text-muted">
            <Text className="font-semibold text-foreground">
              {t('parentHome.calendar.reason')}:{' '}
            </Text>
            {day.absenceReason}
          </Text>
        ) : null}

        {day.note ? <Text className="mt-1 text-sm text-muted">{day.note}</Text> : null}
      </View>
    </View>
  );
}
