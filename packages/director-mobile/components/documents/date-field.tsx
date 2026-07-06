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
import { formatLongDate, monthName } from '@/lib/date';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;
const MINT_BG = '#DCF2E3';
const MINT_INK = '#46B06A';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

// A wide enough window for a birth date through a near-future expiry.
const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: NOW_YEAR + 6 - 1990 }, (_, i) => 1990 + i);

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

/** A labelled date field that opens a day / month / year wheel sheet. Stores an
 *  ISO `YYYY-MM-DD` string; supports any date (birth dates through expiries). */
export function DateField({
  label,
  value,
  onChange,
  required,
  helpText,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('documents');
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const base = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  const start = base
    ? { y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1, d: Number(base.slice(8, 10)) }
    : { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };

  const [year, setYear] = useState(start.y);
  const [month, setMonth] = useState(start.m);
  const [day, setDay] = useState(start.d);

  const yearRef = useRef<WheelHandle>(null);
  const monthRef = useRef<WheelHandle>(null);
  const dayRef = useRef<WheelHandle>(null);

  useEffect(() => {
    if (!open) return;
    setYear(start.y);
    setMonth(start.m);
    setDay(start.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monthLabels = Array.from({ length: 12 }, (_, i) => monthName(i, i18n.language));
  const dayCount = daysInMonth(year, month);
  const dayLabels = Array.from({ length: dayCount }, (_, i) => String(i + 1));
  const safeDay = clamp(day, 1, dayCount);
  const yearIndex = clamp(YEARS.indexOf(year), 0, YEARS.length - 1);

  function confirm() {
    const iso = `${year}-${pad(month + 1)}-${pad(safeDay)}`;
    onChange(iso);
    setOpen(false);
  }

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">
        {label}
        {required ? <Text className="text-mint-ink"> *</Text> : null}
      </Text>
      {helpText ? <Text className="-mt-0.5 text-xs text-muted">{helpText}</Text> : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        className={cn(
          'flex-row items-center justify-between rounded-2xl border border-border px-4 py-3',
          disabled ? 'bg-segment' : 'bg-card',
        )}>
        <Text className={cn('text-[15px]', value ? 'text-foreground' : 'text-muted')}>
          {value ? formatLongDate(value, i18n.language) : t('form.datePlaceholder')}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={MINT_INK} />
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
                  style={{ top: PAD, height: ITEM_HEIGHT, backgroundColor: MINT_BG }}
                />
                <Wheel
                  ref={dayRef}
                  labels={dayLabels}
                  initialIndex={safeDay - 1}
                  width={64}
                  onIndexChange={(i) => setDay(i + 1)}
                />
                <Wheel
                  ref={monthRef}
                  labels={monthLabels}
                  initialIndex={month}
                  width={140}
                  onIndexChange={setMonth}
                />
                <Wheel
                  ref={yearRef}
                  labels={YEARS.map(String)}
                  initialIndex={yearIndex}
                  width={84}
                  onIndexChange={(i) => setYear(YEARS[i])}
                />
              </View>
            </View>

            <Pressable
              onPress={confirm}
              className="mx-4 mt-3 items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: MINT_INK }}>
              <Text className="text-[15px] font-bold text-white">
                {formatLongDate(`${year}-${pad(month + 1)}-${pad(safeDay)}`, i18n.language)}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
