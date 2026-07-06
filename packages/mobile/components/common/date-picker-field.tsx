import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { formatLongDate, monthName, todayIsoDate, weekdayLong } from '@/lib/date';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;
const CORAL_BG = '#FFE8E2';
const CORAL_INK = '#E8674E';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: NOW_YEAR + 6 - 2020 }, (_, i) => 2020 + i);

type WheelHandle = { scrollToIndex: (index: number) => void };

const Wheel = forwardRef<
  WheelHandle,
  { labels: string[]; initialIndex: number; width: number; onIndexChange: (index: number) => void }
>(function Wheel({ labels, initialIndex, width, onIndexChange }, ref) {
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(initialIndex);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index) => scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true }),
  }));

  useEffect(() => {
    setActive((current) => clamp(current, 0, labels.length - 1));
    const id = setTimeout(
      () =>
        scrollRef.current?.scrollTo({
          y: clamp(initialIndex, 0, labels.length - 1) * ITEM_HEIGHT,
          animated: false,
        }),
      0,
    );
    return () => clearTimeout(id);
  }, [initialIndex, labels.length]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = clamp(
      Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT),
      0,
      labels.length - 1,
    );
    if (index !== active) {
      setActive(index);
      onIndexChange(index);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      contentContainerStyle={{ paddingVertical: PAD }}
      style={{ height: VISIBLE * ITEM_HEIGHT, width }}>
      {labels.map((label, index) => {
        const distance = Math.abs(index - active);
        return (
          <View key={`${label}-${index}`} style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
            <Text
              className={cn(
                distance === 0
                  ? 'text-xl font-extrabold text-foreground'
                  : distance === 1
                    ? 'text-base font-semibold text-muted'
                    : 'text-sm font-medium text-muted-soft',
              )}>
              {label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
});

/**
 * A tappable date field that opens a three-wheel day/month/year picker. Ported
 * from the teacher app and themed in the caller's accent — reports use coral.
 * `label` and `todayLabel` are passed in so the field stays free of any one
 * feature's translation namespace.
 */
export function DatePickerField({
  value,
  onChange,
  label,
  todayLabel,
  accentBg = CORAL_BG,
  accentInk = CORAL_INK,
}: {
  value: string;
  onChange: (date: string) => void;
  label: string;
  todayLabel: string;
  /** Feature accent for the field's tile, selected-row highlight and confirm
   *  button. Defaults to reports coral; albums pass grape. */
  accentBg?: string;
  accentInk?: string;
}) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIsoDate();
  const start = {
    year: Number(base.slice(0, 4)),
    month: Number(base.slice(5, 7)) - 1,
    day: Number(base.slice(8, 10)),
  };

  const [year, setYear] = useState(start.year);
  const [month, setMonth] = useState(start.month);
  const [day, setDay] = useState(start.day);

  useEffect(() => {
    if (!open) return;
    setYear(start.year);
    setMonth(start.month);
    setDay(start.day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monthLabels = Array.from({ length: 12 }, (_, i) => monthName(i, i18n.language));
  const dayCount = daysInMonth(year, month);
  const dayLabels = Array.from({ length: dayCount }, (_, i) => String(i + 1));
  const safeDay = clamp(day, 1, dayCount);
  const yearIndex = clamp(YEARS.indexOf(year), 0, YEARS.length - 1);
  const pending = `${year}-${pad(month + 1)}-${pad(safeDay)}`;
  const isToday = base === todayIsoDate();

  function confirm() {
    onChange(pending);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-4">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: accentBg }}>
          <Ionicons name="calendar-outline" size={20} color={accentInk} />
        </View>
        <Text numberOfLines={1} className="flex-1 text-[15px] font-bold text-foreground">
          {formatLongDate(value, i18n.language)}, {weekdayLong(value, i18n.language)}
        </Text>
        {isToday ? (
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: accentBg }}>
            <Text className="text-[11px] font-bold" style={{ color: accentInk }}>
              {todayLabel}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="rounded-t-3xl bg-card" style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
              <Text className="text-base font-bold text-foreground">{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View className="items-center pt-3">
              <View className="flex-row items-center justify-center" style={{ height: VISIBLE * ITEM_HEIGHT }}>
                <View
                  pointerEvents="none"
                  className="absolute left-4 right-4 rounded-2xl"
                  style={{ top: PAD, height: ITEM_HEIGHT, backgroundColor: accentBg }}
                />
                <Wheel labels={dayLabels} initialIndex={safeDay - 1} width={64} onIndexChange={(i) => setDay(i + 1)} />
                <Wheel labels={monthLabels} initialIndex={month} width={140} onIndexChange={setMonth} />
                <Wheel
                  labels={YEARS.map(String)}
                  initialIndex={yearIndex}
                  width={84}
                  onIndexChange={(i) => setYear(YEARS[i]!)}
                />
              </View>
            </View>

            <View className="mx-4 mt-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  onChange(todayIsoDate());
                  setOpen(false);
                }}
                className="flex-1 items-center justify-center rounded-full bg-pill py-3.5">
                <Text className="text-[15px] font-bold text-muted">{todayLabel}</Text>
              </Pressable>
              <Pressable
                onPress={confirm}
                className="flex-[1.4] items-center justify-center rounded-full py-3.5"
                style={{ backgroundColor: accentInk }}>
                <Text className="text-[15px] font-bold text-white">{formatLongDate(pending, i18n.language)}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
