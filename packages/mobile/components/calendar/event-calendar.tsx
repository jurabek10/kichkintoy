import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import type { DayMarks } from '@/data/calendar';
import { monthName, parseIsoDate, todayIsoDate, weekdayShortNames } from '@/lib/date';
import { cn } from '@/lib/utils';

const PRIMARY = '#3B8FF3';
const MUTED = '#8A8F99';
const SUN_INK = '#F4A621';

// One glyph per kind, shared by the grid cells and the legend.
const BIRTHDAY_ICON = 'gift' as const;
const EVENT_ICON = 'star' as const;

export type CalendarMonth = { year: number; monthIndex: number };

const pad = (n: number) => String(n).padStart(2, '0');

/** A single grid day: the number, plus small dots when the day carries a
 *  birthday (sunshine) and/or an event (primary). */
function DayCell({
  day,
  marks,
  isToday,
  inMonth,
}: {
  day: number;
  marks?: DayMarks;
  isToday: boolean;
  inMonth: boolean;
}) {
  return (
    <View
      className={cn(
        'h-12 flex-1 items-center justify-center rounded-lg border',
        isToday ? 'border-2 border-primary bg-sky' : 'border-transparent',
      )}>
      <Text
        className={cn(
          'text-[13px]',
          isToday ? 'font-extrabold text-primary' : 'font-semibold',
          inMonth ? 'text-foreground' : 'text-muted-soft',
        )}>
        {day}
      </Text>
      {inMonth && marks ? (
        <View className="mt-0.5 h-3.5 flex-row items-center gap-0.5">
          {marks.birthday ? <Ionicons name={BIRTHDAY_ICON} size={12} color={SUN_INK} /> : null}
          {marks.event ? <Ionicons name={EVENT_ICON} size={12} color={PRIMARY} /> : null}
        </View>
      ) : (
        <View className="mt-0.5 h-3.5" />
      )}
    </View>
  );
}

/** Monthly grid for the calendar page: dots mark which days have an event or a
 *  birthday. Controlled — the list below tracks the same month. */
export function EventCalendar({
  value,
  onChange,
  byDay,
}: {
  value: CalendarMonth;
  onChange: (month: CalendarMonth) => void;
  byDay: Map<string, DayMarks>;
}) {
  const { t, i18n } = useTranslation(['app', 'nav']);
  const lang = i18n.language;
  const today = todayIsoDate();
  const todayParts = parseIsoDate(today);

  function shiftMonth(delta: number) {
    const next = new Date(value.year, value.monthIndex + delta, 1);
    onChange({ year: next.getFullYear(), monthIndex: next.getMonth() });
  }

  const isCurrentMonth =
    value.year === todayParts.year && value.monthIndex === todayParts.monthIndex;

  // Sunday-first grid, padding adjacent months (dimmed) so every slot is one box.
  const firstWeekday = new Date(value.year, value.monthIndex, 1).getDay();
  const daysInMonth = new Date(value.year, value.monthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(value.year, value.monthIndex, 0).getDate();

  type Cell = { day: number; inMonth: boolean; iso?: string };
  const cells: Cell[] = [];
  for (let i = firstWeekday; i > 0; i -= 1) {
    cells.push({ day: prevMonthDays - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ day: d, inMonth: true, iso: `${value.year}-${pad(value.monthIndex + 1)}-${pad(d)}` });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, inMonth: false });
    nextDay += 1;
  }
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Tag
          label={t('items.calendar', { ns: 'nav' })}
          icon="calendar-outline"
          iconColor={PRIMARY}
          className="bg-sky"
          textClassName="text-sky-ink"
        />
        <Pressable
          onPress={() => onChange({ year: todayParts.year, monthIndex: todayParts.monthIndex })}
          hitSlop={6}
          className={cn(
            'rounded-full border px-3 py-1',
            isCurrentMonth ? 'border-border' : 'border-primary',
          )}>
          <Text
            className={cn('text-xs font-semibold', isCurrentMonth ? 'text-muted' : 'text-primary')}>
            {t('parentHome.calendar.today', { ns: 'app' })}
          </Text>
        </Pressable>
      </View>

      <View className="mt-1 flex-row items-center">
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} className="w-10">
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-xs text-muted">{value.year}</Text>
          <Text className="text-lg font-extrabold text-foreground">
            {monthName(value.monthIndex, lang)}
          </Text>
        </View>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} className="w-10 items-end">
          <Ionicons name="chevron-forward" size={22} color={MUTED} />
        </Pressable>
      </View>

      <View className="mt-3 flex-row">
        {weekdayShortNames(lang).map((name) => (
          <Text key={name} className="flex-1 text-center text-[11px] font-semibold text-muted">
            {name}
          </Text>
        ))}
      </View>

      <View className="mt-1 gap-1">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row gap-1">
            {week.map((cell, dayIndex) => (
              <DayCell
                key={dayIndex}
                day={cell.day}
                inMonth={cell.inMonth}
                marks={cell.iso ? byDay.get(cell.iso) : undefined}
                isToday={cell.iso === today}
              />
            ))}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row gap-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name={BIRTHDAY_ICON} size={13} color={SUN_INK} />
          <Text className="text-[11px] text-muted">{t('schedule.legendBirthday', { ns: 'app' })}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name={EVENT_ICON} size={13} color={PRIMARY} />
          <Text className="text-[11px] text-muted">{t('schedule.legendEvent', { ns: 'app' })}</Text>
        </View>
      </View>
    </Card>
  );
}
