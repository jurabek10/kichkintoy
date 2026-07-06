import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';

import { DatePickerField } from '@/components/common/date-picker-field';
import { colors } from '@/constants/theme';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

export type ReportPeriod = 'all' | 'month' | 'day';

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
 * The parent's stand-in for the web reports toolbar: narrow the timeline to a
 * month or a single day. A child has one class and only published reports show,
 * so date is the one dimension worth filtering — free-text search covers the rest.
 */
export function ReportFilterSheet({
  open,
  period,
  month,
  day,
  onPeriod,
  onMonth,
  onDay,
  onReset,
  onClose,
}: {
  open: boolean;
  period: ReportPeriod;
  month: string;
  day: string;
  onPeriod: (value: ReportPeriod) => void;
  onMonth: (value: string) => void;
  onDay: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('reports');

  const periodOptions: { key: ReportPeriod; label: string }[] = [
    { key: 'all', label: t('parent.periodAll') },
    { key: 'month', label: t('parent.periodMonth') },
    { key: 'day', label: t('parent.periodDay') },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('parent.filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-coral-ink">{t('parent.reset')}</Text>
            </Pressable>
          </View>

          <Text className="mb-2 mt-3 text-[13px] font-bold text-muted">{t('parent.date')}</Text>
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
              <DatePickerField
                value={day}
                onChange={onDay}
                label={t('parent.date')}
                todayLabel={t('parent.today')}
              />
            </View>
          ) : null}

          <Pressable onPress={onClose} className="mt-5 items-center rounded-md bg-coral-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">
              {t('parent.done')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
