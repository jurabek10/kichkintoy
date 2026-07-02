import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { MedicationStatus } from '@/data/medications';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const CORAL_INK = '#E8674E';

export type MedStatusFilter = 'all' | MedicationStatus;
export type ClassOption = { id: string; name: string };

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
 * Narrow the request history by month, status, and (when the teacher runs more
 * than one) class. The month drives which requests are fetched; status and class
 * filter the result on the client.
 */
export function MedicationFilterSheet({
  open,
  month,
  status,
  statusCounts,
  classId,
  classOptions,
  classCounts,
  total,
  onMonth,
  onStatus,
  onClass,
  onReset,
  onClose,
}: {
  open: boolean;
  month: string;
  status: MedStatusFilter;
  statusCounts: Record<MedStatusFilter, number>;
  classId: string;
  classOptions: ClassOption[];
  classCounts: Record<string, number>;
  total: number;
  onMonth: (value: string) => void;
  onStatus: (value: MedStatusFilter) => void;
  onClass: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('medications');
  const { height } = useWindowDimensions();

  const statusOptions: { key: MedStatusFilter; label: string }[] = [
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
              <Text className="text-sm font-semibold text-coral-ink">{t('reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-2 mt-3 text-[13px] font-bold text-muted">{t('table.period.month')}</Text>
            <MonthStepper value={month} onChange={onMonth} />

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

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-coral-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">{t('done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
