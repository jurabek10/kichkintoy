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
import { cn } from '@/lib/utils';

// A finger-friendly 24-hour time picker. Uzbekistan reads time as 00–23, so
// there is deliberately no AM/PM — two snapping wheels (hours, 5-minute steps)
// plus one-tap chips for the usual end-of-day pickup times.

const ITEM_HEIGHT = 48;
const VISIBLE = 5; // odd, so one row sits dead-centre
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00,05,…,55
const QUICK_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

const pad = (n: number) => String(n).padStart(2, '0');
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Snap the freeform minute of an existing value to the nearest 5-minute step. */
function nearestMinuteIndex(minute: number) {
  return clamp(Math.round(minute / 5), 0, MINUTES.length - 1);
}

function parse(value: string): { hourIndex: number; minuteIndex: number } {
  const [h, m] = value.split(':').map((part) => Number(part));
  return {
    hourIndex: clamp(Number.isFinite(h) ? h : 17, 0, 23),
    minuteIndex: nearestMinuteIndex(Number.isFinite(m) ? m : 30),
  };
}

type WheelHandle = { scrollToIndex: (index: number, animated?: boolean) => void };

const Wheel = forwardRef<
  WheelHandle,
  { data: number[]; initialIndex: number; onIndexChange: (index: number) => void }
>(function Wheel({ data, initialIndex, onIndexChange }, ref) {
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(initialIndex);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, animated = true) =>
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated }),
  }));

  // Centre the initial value (and sync the highlight) whenever it changes —
  // covers first mount and a re-sync after the sheet reopens.
  useEffect(() => {
    setActive(initialIndex);
    const id = setTimeout(
      () => scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false }),
      0,
    );
    return () => clearTimeout(id);
  }, [initialIndex]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = clamp(
      Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT),
      0,
      data.length - 1,
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
      style={{ height: VISIBLE * ITEM_HEIGHT, width: 84 }}>
      {data.map((value, index) => {
        const distance = Math.abs(index - active);
        return (
          <View key={value} style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
            <Text
              className={cn(
                'tabular-nums',
                distance === 0
                  ? 'text-3xl font-extrabold text-foreground'
                  : distance === 1
                    ? 'text-2xl font-semibold text-muted'
                    : 'text-xl font-medium text-muted-soft',
              )}>
              {pad(value)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
});

export function TimePickerSheet({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('pickups');
  const insets = useSafeAreaInsets();
  const initial = parse(value);
  const [hourIndex, setHourIndex] = useState(initial.hourIndex);
  const [minuteIndex, setMinuteIndex] = useState(initial.minuteIndex);
  const hourRef = useRef<WheelHandle>(null);
  const minuteRef = useRef<WheelHandle>(null);

  // Re-sync to the incoming value each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const next = parse(value);
    setHourIndex(next.hourIndex);
    setMinuteIndex(next.minuteIndex);
  }, [visible, value]);

  const preview = `${pad(HOURS[hourIndex])}:${pad(MINUTES[minuteIndex])}`;

  function pickQuick(time: string) {
    const next = parse(time);
    setHourIndex(next.hourIndex);
    setMinuteIndex(next.minuteIndex);
    hourRef.current?.scrollToIndex(next.hourIndex);
    minuteRef.current?.scrollToIndex(next.minuteIndex);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl bg-card" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
            <Text className="text-base font-bold text-foreground">{t('timePicker.title')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Live preview */}
          <View className="items-center pt-5">
            <View className="flex-row items-center gap-2 rounded-2xl bg-sunshine px-5 py-2">
              <Ionicons name="time" size={20} color="#F4A621" />
              <Text className="text-3xl font-extrabold tabular-nums text-foreground">{preview}</Text>
            </View>
          </View>

          {/* Quick picks */}
          <Text className="mt-5 px-4 text-[11px] font-semibold uppercase text-muted">
            {t('timePicker.quick')}
          </Text>
          <View className="flex-row flex-wrap gap-2 px-4 pt-2">
            {QUICK_TIMES.map((time) => {
              const selected = time === preview;
              return (
                <Pressable
                  key={time}
                  onPress={() => pickQuick(time)}
                  className={cn(
                    'rounded-full border px-4 py-2',
                    selected ? 'border-sunshine-ink bg-sunshine' : 'border-border bg-card',
                  )}>
                  <Text
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      selected ? 'text-sunshine-ink' : 'text-muted',
                    )}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Wheels */}
          <View className="items-center pt-4">
            <View className="flex-row items-center justify-center" style={{ height: VISIBLE * ITEM_HEIGHT }}>
              {/* Centre selection band, behind the numbers */}
              <View
                pointerEvents="none"
                className="absolute left-6 right-6 rounded-2xl bg-sunshine"
                style={{ top: PAD, height: ITEM_HEIGHT }}
              />
              <Wheel
                ref={hourRef}
                data={HOURS}
                initialIndex={hourIndex}
                onIndexChange={setHourIndex}
              />
              <Text className="px-1 text-3xl font-extrabold text-foreground">:</Text>
              <Wheel
                ref={minuteRef}
                data={MINUTES}
                initialIndex={minuteIndex}
                onIndexChange={setMinuteIndex}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              onChange(preview);
              onClose();
            }}
            className="mx-4 mt-4 items-center justify-center rounded-full bg-sunshine-ink py-3.5">
            <Text className="text-[15px] font-bold text-white">{t('timePicker.done')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
