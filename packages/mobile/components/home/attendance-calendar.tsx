import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { useAttendanceCalendar, type AttendanceDay } from '@/data/attendance';
import { monthName, parseIsoDate, todayIsoDate, weekdayShortNames } from '@/lib/date';
import { cn } from '@/lib/utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Semantic palette (mirrors tailwind tokens for imperative icon colours).
const MINT = '#46B06A';
const CORAL = '#E8674E';
const SUN = '#F4A621';
const MUTED = '#8A8F99';
const PRIMARY = '#3B8FF3';

type CalendarMonth = { year: number; monthIndex: number };

/** Status → cell fill (static classes so NativeWind picks them up). Days with no
 *  record keep the plain card surface so every day reads as the same tile. */
function cellBg(day: AttendanceDay | undefined): string {
  if (!day) return 'bg-card';
  if (day.attended) return 'bg-mint';
  if (day.status === 'absent') return 'bg-coral';
  if (day.status === 'excused') return 'bg-sunshine';
  return 'bg-card';
}

/** Status → glyph (the legend's vocabulary). */
function glyph(day: AttendanceDay | undefined): { name: IconName; color: string } | null {
  if (!day) return null;
  if (day.attended) return { name: 'checkmark', color: MINT };
  if (day.status === 'absent') return { name: 'close', color: CORAL };
  if (day.status === 'excused') return { name: 'triangle-outline', color: SUN };
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function DayCell({
  day,
  info,
  isToday,
  inMonth,
}: {
  day: number;
  info?: AttendanceDay;
  isToday: boolean;
  inMonth: boolean;
}) {
  const g = inMonth ? glyph(info) : null;
  return (
    <View
      className={cn(
        'h-16 flex-1 rounded-lg border p-1',
        isToday ? 'border-2 border-primary' : 'border-border',
        inMonth ? cellBg(info) : 'bg-card',
      )}>
      {/* Day number centered at top; status glyph tucked into the top-right. */}
      <View>
        <Text
          className={cn(
            'text-center text-[11px] font-semibold',
            inMonth ? 'text-foreground' : 'text-muted-soft',
          )}>
          {day}
        </Text>
        {g ? (
          <View className="absolute right-0 top-0">
            <Ionicons name={g.name} size={11} color={g.color} />
          </View>
        ) : null}
      </View>
      {/* The signature: the actual in/out times, not just a check. */}
      {inMonth && (info?.checkInLabel || info?.checkOutLabel) ? (
        <View className="mt-auto items-center">
          {info?.checkInLabel ? (
            <Text className="text-[9px] font-semibold text-mint-ink" numberOfLines={1}>
              {info.checkInLabel}
            </Text>
          ) : null}
          {info?.checkOutLabel ? (
            <Text className="text-[9px] text-muted" numberOfLines={1}>
              {info.checkOutLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ icon, color, label }: { icon: IconName; color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={icon} size={13} color={color} />
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}

/** Monthly attendance calendar for the active child: a day grid where each cell
 *  carries the attendance status and the recorded check-in/out times, with
 *  absences highlighted. Replaces the old one-line attendance summary. */
export function AttendanceCalendar({
  value,
  onChange,
  onPressMore,
}: {
  /** Controlled selected month; omit for self-managed state (home card). */
  value?: CalendarMonth;
  onChange?: (month: CalendarMonth) => void;
  /** When set, renders a "Full attendance" link (home card → attendance page). */
  onPressMore?: () => void;
} = {}) {
  const { t, i18n } = useTranslation('app');
  const lang = i18n.language;
  const today = todayIsoDate();
  const todayParts = parseIsoDate(today);

  const [internal, setInternal] = useState<CalendarMonth>(() => ({
    year: todayParts.year,
    monthIndex: todayParts.monthIndex,
  }));
  const view = value ?? internal;
  const setView = (month: CalendarMonth) => (onChange ? onChange(month) : setInternal(month));

  const { data: days } = useAttendanceCalendar(view.year, view.monthIndex);

  function shiftMonth(delta: number) {
    const next = new Date(view.year, view.monthIndex + delta, 1);
    setView({ year: next.getFullYear(), monthIndex: next.getMonth() });
  }

  const isCurrentMonth =
    view.year === todayParts.year && view.monthIndex === todayParts.monthIndex;

  // Build the Sunday-first grid, padding leading/trailing slots with the
  // adjacent months' days (dimmed) so every slot is one identical box.
  const firstWeekday = new Date(view.year, view.monthIndex, 1).getDay();
  const daysInMonth = new Date(view.year, view.monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(view.year, view.monthIndex, 0).getDate();

  type Cell = { day: number; inMonth: boolean; iso?: string };
  const cells: Cell[] = [];
  for (let i = firstWeekday; i > 0; i -= 1) {
    cells.push({ day: prevMonthDays - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ day: d, inMonth: true, iso: `${view.year}-${pad(view.monthIndex + 1)}-${pad(d)}` });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, inMonth: false });
    nextDay += 1;
  }
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <Card className="mt-3">
      {/* Identity tag (matches the report/album cards) + Today pill */}
      <View className="flex-row items-center justify-between">
        <Tag
          label={t('parentHome.calendar.tag')}
          icon="calendar-outline"
          iconColor={MINT}
          className="bg-mint"
          textClassName="text-mint-ink"
        />
        <Pressable
          onPress={() => setView({ year: todayParts.year, monthIndex: todayParts.monthIndex })}
          hitSlop={6}
          className={cn(
            'rounded-full border px-3 py-1',
            isCurrentMonth ? 'border-border' : 'border-coral-ink',
          )}>
          <Text
            className={cn(
              'text-xs font-semibold',
              isCurrentMonth ? 'text-muted' : 'text-coral-ink',
            )}>
            {t('parentHome.calendar.today')}
          </Text>
        </Pressable>
      </View>

      {/* Month navigation */}
      <View className="mt-1 flex-row items-center">
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} className="w-10">
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-xs text-muted">{view.year}</Text>
          <Text className="text-lg font-extrabold text-foreground">
            {monthName(view.monthIndex, lang)}
          </Text>
        </View>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} className="w-10 items-end">
          <Ionicons name="chevron-forward" size={22} color={MUTED} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View className="mt-3 flex-row">
        {weekdayShortNames(lang).map((name) => (
          <Text key={name} className="flex-1 text-center text-[11px] font-semibold text-muted">
            {name}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View className="mt-1 gap-1">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row gap-1">
            {week.map((cell, dayIndex) => (
              <DayCell
                key={dayIndex}
                day={cell.day}
                inMonth={cell.inMonth}
                info={cell.iso ? days.get(cell.iso) : undefined}
                isToday={cell.iso === today}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
        <LegendItem icon="checkmark" color={MINT} label={t('parentHome.calendar.present')} />
        <LegendItem icon="triangle-outline" color={SUN} label={t('parentHome.calendar.excused')} />
        <LegendItem icon="close" color={CORAL} label={t('parentHome.calendar.absent')} />
      </View>
      <Text className="mt-2 text-[11px] leading-4 text-muted">
        {t('parentHome.calendar.note')}
      </Text>

      {onPressMore ? (
        <Pressable onPress={onPressMore} className="mt-3 flex-row items-center gap-1">
          <Text className="text-sm font-bold text-primary">{t('parentHome.calendar.more')}</Text>
          <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
        </Pressable>
      ) : null}
    </Card>
  );
}
