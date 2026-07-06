import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { DatePickerField } from '@/components/common/date-picker-field';
import { colors } from '@/constants/theme';
import type { PickupStatus, PickupView } from '@/data/pickups';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const SUN_INK = '#F4A621';

export type PickupStatusFilter = 'all' | PickupStatus;
export type ClassOption = { id: string; name: string };

const STATUSES: PickupStatus[] = ['submitted', 'changed', 'acknowledged', 'cancelled'];

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
        className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-sunshine-ink' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={SUN_INK} />
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
      className={cn('rounded-full border px-3.5 py-1.5', active ? 'border-sunshine-ink bg-sunshine-ink' : 'border-border bg-card')}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

/** ‹ July 2026 › — steps the month the history list is scoped to. */
function MonthStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { i18n } = useTranslation();
  const [year, month] = value.split('-').map(Number);
  const monthIndex = (month ?? 1) - 1;

  function step(delta: number) {
    const next = new Date((year ?? 2020), monthIndex + delta, 1);
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
 * Narrow the pickup history by month, status, and (when the teacher runs more
 * than one) class. The month drives which notices are fetched; status and class
 * filter the result on the client.
 */
export function PickupFilterSheet({
  open,
  view,
  month,
  day,
  status,
  statusCounts,
  classId,
  classOptions,
  classCounts,
  total,
  onView,
  onMonth,
  onDay,
  onStatus,
  onClass,
  onReset,
  onClose,
}: {
  open: boolean;
  view: PickupView;
  month: string;
  day: string;
  status: PickupStatusFilter;
  statusCounts: Record<PickupStatusFilter, number>;
  classId: string;
  classOptions: ClassOption[];
  classCounts: Record<string, number>;
  total: number;
  onView: (value: PickupView) => void;
  onMonth: (value: string) => void;
  onDay: (value: string) => void;
  onStatus: (value: PickupStatusFilter) => void;
  onClass: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('pickups');
  const { height } = useWindowDimensions();

  const statusOptions: { key: PickupStatusFilter; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    ...STATUSES.map((value) => ({ key: value, label: t(`status.${value}`) })),
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
              <Text className="text-sm font-semibold text-sunshine-ink">{t('reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-2 mt-3 text-[13px] font-bold text-muted">{t('records')}</Text>
            <View className="mb-3 flex-row gap-2">
              <Chip label={t('view.month')} active={view === 'month'} onPress={() => onView('month')} />
              <Chip label={t('view.day')} active={view === 'day'} onPress={() => onView('day')} />
            </View>
            {view === 'month' ? (
              <MonthStepper value={month} onChange={onMonth} />
            ) : (
              <DatePickerField value={day} onChange={onDay} label={t('view.day')} />
            )}

            <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('table.status')}</Text>
            {statusOptions.map((o) => (
              <OptionRow key={o.key} label={o.label} count={statusCounts[o.key]} active={status === o.key} onPress={() => onStatus(o.key)} />
            ))}

            {classOptions.length > 1 ? (
              <>
                <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('filters.allClasses')}</Text>
                <OptionRow label={t('filters.allClasses')} count={total} active={classId === 'all'} onPress={() => onClass('all')} />
                {classOptions.map((item) => (
                  <OptionRow key={item.id} label={item.name} count={classCounts[item.id] ?? 0} active={classId === item.id} onPress={() => onClass(item.id)} />
                ))}
              </>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-sunshine-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">{t('done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
