import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { formatLongDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const UZ_OFFSET_H = 5; // Uzbekistan is a fixed UTC+5, matching lib/date.
const ITEM_H = 40;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;
const MINT_INK = '#46B06A';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant for a UZ wall-clock time on `reportDate` (UTC+5, no DST). */
function toIso(reportDate: string, hour: number, minute: number) {
  const [y, m, d] = reportDate.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d, hour - UZ_OFFSET_H, minute)).toISOString();
}

/** UZ wall-clock hour/minute of an ISO instant. */
function fromIso(iso: string) {
  const d = new Date(new Date(iso).getTime() + UZ_OFFSET_H * 3600_000);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

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

/**
 * Publish now, or flip the switch to send the report later. When on, a compact
 * time wheel sets the publish time on the report's date.
 */
export function ReportScheduleField({
  reportDate,
  value,
  onChange,
}: {
  reportDate: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { t, i18n } = useTranslation('reports');
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const current = value ? fromIso(value) : { hour: 17, minute: 0 };

  function toggle(on: boolean) {
    onChange(on ? toIso(reportDate, 17, 0) : '');
  }

  function setTime(hour: number, minute: number) {
    onChange(toIso(reportDate, hour, minute));
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-2">
          <Ionicons name="time-outline" size={18} color={MINT_INK} />
          <Text className="text-[15px] font-bold text-foreground">{t('composer.sendLater')}</Text>
        </View>
        <Switch
          value={!!value}
          onValueChange={toggle}
          trackColor={{ true: MINT_INK, false: colors.textMuted }}
          thumbColor="#FFFFFF"
        />
      </View>

      {value ? (
        <Pressable
          onPress={() => setOpen(true)}
          className="flex-row items-center justify-between rounded-xl bg-background px-3 py-3">
          <Text className="text-[13px] text-muted">{formatLongDate(reportDate, i18n.language)}</Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[16px] font-extrabold text-foreground">
              {pad(current.hour)}:{pad(current.minute)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="rounded-t-3xl bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="mb-2 items-center">
              <View className="h-1 w-10 rounded-full bg-segment" />
            </View>
            <View className="flex-row items-center justify-center" style={{ height: VISIBLE * ITEM_H }}>
              <View
                pointerEvents="none"
                className="absolute left-6 right-6 rounded-xl bg-mint"
                style={{ top: PAD, height: ITEM_H }}
              />
              <Wheel values={HOURS} value={current.hour} onChange={(h) => setTime(h, current.minute)} />
              <Text className="px-1 text-xl font-extrabold text-foreground">:</Text>
              <Wheel values={MINUTES} value={current.minute} onChange={(m) => setTime(current.hour, m)} />
            </View>
            <Pressable onPress={() => setOpen(false)} className="mt-3 items-center rounded-full bg-primary py-3.5">
              <Text className="text-[15px] font-bold text-white">{t('composer.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Card>
  );
}
