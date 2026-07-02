import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;
const PRIMARY = '#3B8FF3';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

function Wheel({ values, value, onChange }: { values: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(id);
  }, [index]);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (values[i] !== value) onChange(values[i]!);
  }

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={onMomentumEnd}
      contentContainerStyle={{ paddingVertical: PAD }}
      style={{ height: VISIBLE * ITEM_H, width: 72 }}>
      {values.map((v) => (
        <View key={v} style={{ height: ITEM_H }} className="items-center justify-center">
          <Text className={cn('text-xl', v === value ? 'font-extrabold text-foreground' : 'font-medium text-muted-soft')}>
            {pad(v)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/** A tap-to-open time field: shows the chosen "HH:mm" (or a placeholder) and opens
 *  an hour/minute wheel. Minutes snap to 5. */
export function TimeField({
  label,
  value,
  placeholder,
  doneLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  doneLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const [h, m] = value ? value.split(':').map(Number) : [9, 0];
  const hour = Number.isFinite(h) ? (h as number) : 9;
  const minute = MINUTES.includes(m as number) ? (m as number) : 0;

  function set(nextHour: number, nextMinute: number) {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  }

  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-[13px] font-semibold text-muted">{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        className={cn(
          'h-11 flex-row items-center justify-between rounded-md border border-border px-3',
          disabled ? 'bg-pill' : 'bg-background',
        )}>
        <Text className={cn('text-[15px]', value && !disabled ? 'text-foreground' : 'text-muted-soft')}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="rounded-t-3xl bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="mb-2 items-center">
              <View className="h-1 w-10 rounded-full bg-segment" />
            </View>
            <Text className="mb-1 text-center text-base font-extrabold text-foreground">{label}</Text>
            <View className="flex-row items-center justify-center" style={{ height: VISIBLE * ITEM_H }}>
              <View
                pointerEvents="none"
                className="absolute left-10 right-10 rounded-xl bg-sky"
                style={{ top: PAD, height: ITEM_H }}
              />
              <Wheel values={HOURS} value={hour} onChange={(next) => set(next, minute)} />
              <Text className="px-1 text-xl font-extrabold text-foreground">:</Text>
              <Wheel values={MINUTES} value={minute} onChange={(next) => set(hour, next)} />
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={{ backgroundColor: PRIMARY }}
              className="mt-3 items-center rounded-full py-3.5">
              <Text className="text-[15px] font-bold text-white">{doneLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
