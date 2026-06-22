import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { AttendanceDay } from '@/data/attendance';
import { parseIsoDate, weekdayShort } from '@/lib/date';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

const MINT_INK = '#46B06A';
const MUTED = '#8A8F99';

/** Status → i18n key for the title/label. */
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

/** Status → one cohesive visual: a left rail (ink), a soft-bg status badge with
 *  a filled-circle glyph, and the matching ink for the weekday. Sharing the
 *  "-circle" glyph family keeps the three states reading as one set. */
type StatusVisual = {
  rail: string; // ink fill for the accent rail
  badgeBg: string; // soft candy surface behind the glyph
  ink: string; // ink text class (weekday + glyph tint via badge)
  iconColor: string; // ink hex for the Ionicon
  glyph: IconName;
};

function statusVisual(day: AttendanceDay): StatusVisual {
  if (day.attended)
    return {
      rail: 'bg-mint-ink',
      badgeBg: 'bg-mint',
      ink: 'text-mint-ink',
      iconColor: '#46B06A',
      glyph: 'checkmark-circle',
    };
  if (day.status === 'excused')
    return {
      rail: 'bg-sunshine-ink',
      badgeBg: 'bg-sunshine',
      ink: 'text-sunshine-ink',
      iconColor: '#F4A621',
      glyph: 'alert-circle',
    };
  if (day.status === 'absent')
    return {
      rail: 'bg-coral-ink',
      badgeBg: 'bg-coral',
      ink: 'text-coral-ink',
      iconColor: '#E8674E',
      glyph: 'close-circle',
    };
  return {
    rail: 'bg-border',
    badgeBg: 'bg-pill',
    ink: 'text-muted',
    iconColor: MUTED,
    glyph: 'ellipse-outline',
  };
}

/** A compact in/out time pill with a directional arrow. */
function TimePill({
  icon,
  iconColor,
  label,
  time,
  className,
  textClassName,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  time: string;
  className: string;
  textClassName: string;
}) {
  return (
    <View className={cn('flex-row items-center gap-1 rounded-full px-2.5 py-1', className)}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text className={cn('text-xs font-semibold', textClassName)}>{label}</Text>
      <Text className={cn('text-xs font-bold', textClassName)}>{time}</Text>
    </View>
  );
}

/** One day in the full attendance list: a status-tinted date column, the status
 *  with its glyph, the recorded in/out times, and any pickup / reason / note. */
export function AttendanceDayRow({ day }: { day: AttendanceDay }) {
  const { t, i18n } = useTranslation('app');
  const lang = i18n.language;
  const { day: dayNum } = parseIsoDate(day.date);
  const v = statusVisual(day);
  const statusLabel = t(STATUS_KEY[day.status] ?? 'parentHome.calendar.present');
  const relationshipLabel = day.pickedUpRelationship
    ? t(RELATIONSHIP_KEY[day.pickedUpRelationship] ?? 'parentHome.calendar.relationship.other')
    : null;
  const hasTimes = !!(day.checkInLabel || day.checkOutLabel);

  return (
    <View className="flex-row overflow-hidden rounded-xl border border-border bg-card">
      {/* Status accent rail — state at a glance without flooding the tile. */}
      <View className={cn('w-1.5', v.rail)} />

      {/* Date column: weekday over a large day number, with a hairline divider. */}
      <View className="w-16 items-center justify-center border-r border-border py-3">
        <Text className={cn('text-[11px] font-bold uppercase tracking-wide', v.ink)}>
          {weekdayShort(day.date, lang)}
        </Text>
        <Text className="text-2xl font-extrabold leading-7 text-foreground">{dayNum}</Text>
      </View>

      {/* Content */}
      <View className="min-w-0 flex-1 p-3">
        <View className="flex-row items-center gap-2">
          <View className={cn('h-7 w-7 items-center justify-center rounded-full', v.badgeBg)}>
            <Ionicons name={v.glyph} size={18} color={v.iconColor} />
          </View>
          <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>

        {hasTimes ? (
          <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
            {day.checkInLabel ? (
              <TimePill
                icon="arrow-down"
                iconColor={MINT_INK}
                label={t('parentHome.calendar.checkIn')}
                time={day.checkInLabel}
                className="bg-mint"
                textClassName="text-mint-ink"
              />
            ) : null}
            {day.checkOutLabel ? (
              <TimePill
                icon="arrow-up"
                iconColor={MUTED}
                label={t('parentHome.calendar.checkOut')}
                time={day.checkOutLabel}
                className="bg-pill"
                textClassName="text-foreground"
              />
            ) : null}
          </View>
        ) : null}

        {day.pickedUpBy ? (
          <View className="mt-2.5 flex-row items-center gap-2 rounded-lg bg-pill px-2.5 py-2">
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
          <Text className="mt-2 text-sm leading-5 text-muted">
            <Text className="font-semibold text-foreground">
              {t('parentHome.calendar.reason')}:{' '}
            </Text>
            {day.absenceReason}
          </Text>
        ) : null}

        {day.note ? <Text className="mt-1.5 text-sm leading-5 text-muted">{day.note}</Text> : null}
      </View>
    </View>
  );
}
