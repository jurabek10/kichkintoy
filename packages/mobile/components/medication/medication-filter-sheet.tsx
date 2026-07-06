import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { DatePickerField } from '@/components/common/date-picker-field';
import { colors } from '@/constants/theme';
import type { MedicationStatus } from '@/data/medications';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const CORAL_INK = '#E8674E';

export type MedStatusFilter = 'all' | MedicationStatus;
export type MedPeriod = 'all' | 'month' | 'day';

const STATUSES: MedicationStatus[] = ['pending', 'administered', 'skipped', 'cancelled'];

function OptionRow({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between py-3">
      <Text
        numberOfLines={1}
        className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-coral-ink' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={CORAL_INK} />
        ) : (
          <View className="h-5 w-5 rounded-full border border-border" />
        )}
      </View>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-full border px-3.5 py-1.5',
        active ? 'border-coral-ink bg-coral-ink' : 'border-border bg-card',
      )}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

/** ‹ July 2026 › — steps the selected month for the "Month" period. */
function MonthStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { i18n } = useTranslation();
  const [year, month] = value.split('-').map(Number);
  const monthIndex = (month ?? 1) - 1;

  function step(delta: number) {
    const next = new Date(year ?? 2020, monthIndex + delta, 1);
    onChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-border bg-background px-2 py-2">
      <Pressable onPress={() => step(-1)} hitSlop={8} className="h-8 w-8 items-center justify-center">
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text className="text-[15px] font-bold text-foreground">
        {formatMonthYear(year ?? 2020, monthIndex, i18n.language)}
      </Text>
      <Pressable onPress={() => step(1)} hitSlop={8} className="h-8 w-8 items-center justify-center">
        <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

/**
 * Narrow the request history by status and by date — the parent's mobile
 * stand-in for the web table's status + period toolbar. A parent only requests
 * for their own child, so there is no class axis.
 */
export function MedicationFilterSheet({
  open,
  status,
  statusCounts,
  period,
  month,
  day,
  onStatus,
  onPeriod,
  onMonth,
  onDay,
  onReset,
  onClose,
}: {
  open: boolean;
  status: MedStatusFilter;
  statusCounts: Record<MedStatusFilter, number>;
  period: MedPeriod;
  month: string;
  day: string;
  onStatus: (value: MedStatusFilter) => void;
  onPeriod: (value: MedPeriod) => void;
  onMonth: (value: string) => void;
  onDay: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('medications');
  const { height } = useWindowDimensions();

  const statusOptions: { key: MedStatusFilter; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    ...STATUSES.map((value) => ({ key: value, label: t(`status.${value}`) })),
  ];
  const periodOptions: { key: MedPeriod; label: string }[] = [
    { key: 'all', label: t('table.period.all') },
    { key: 'month', label: t('table.period.month') },
    { key: 'day', label: t('table.period.day') },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-coral-ink">{t('reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-1 mt-3 text-[13px] font-bold text-muted">{t('table.status')}</Text>
            {statusOptions.map((option) => (
              <OptionRow
                key={option.key}
                label={option.label}
                count={statusCounts[option.key]}
                active={status === option.key}
                onPress={() => onStatus(option.key)}
              />
            ))}

            <Text className="mb-2 mt-4 text-[13px] font-bold text-muted">{t('table.date')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {periodOptions.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={period === option.key}
                  onPress={() => onPeriod(option.key)}
                />
              ))}
            </View>
            {period === 'month' ? (
              <View className="mt-3">
                <MonthStepper value={month} onChange={onMonth} />
              </View>
            ) : period === 'day' ? (
              <View className="mt-3">
                <DatePickerField value={day} onChange={onDay} label={t('table.date')} todayLabel={t('todaySection')} />
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-coral-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">{t('done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
