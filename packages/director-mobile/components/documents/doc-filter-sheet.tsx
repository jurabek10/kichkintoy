import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { DocStatus } from '@/data/teacher';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const MINT_INK = '#46B06A';

export type Period = 'all' | 'month';
export type StatusFilter = 'all' | DocStatus;
export type ClassOption = { id: string; name: string };

const STATUSES: DocStatus[] = [
  'not_started',
  'in_progress',
  'submitted',
  'needs_correction',
  'accepted',
  'closed',
];

const STATUS_KEY: Record<DocStatus, string> = {
  not_started: 'notStarted',
  in_progress: 'inProgress',
  submitted: 'submitted',
  needs_correction: 'needsCorrection',
  accepted: 'accepted',
  closed: 'closed',
};

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
        className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-mint-ink' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={MINT_INK} />
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
      className={cn('rounded-full border px-3.5 py-1.5', active ? 'border-mint-ink bg-mint-ink' : 'border-border bg-card')}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

/** ‹ July 2026 › — steps the month the list is scoped to. */
function MonthStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { i18n } = useTranslation();
  const [year, month] = value.split('-').map(Number);
  const monthIndex = (month ?? 1) - 1;

  function step(delta: number) {
    const next = new Date(year ?? 2020, monthIndex + delta, 1);
    onChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <View className="mt-3 flex-row items-center justify-between rounded-xl border border-border bg-background px-2 py-2">
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
 * Narrow the document list by status, period (all time or one month, filtered on
 * when the request was created), and — when the teacher runs more than one — class.
 */
export function DocFilterSheet({
  open,
  status,
  statusCounts,
  period,
  month,
  classId,
  classOptions,
  classCounts,
  total,
  onStatus,
  onPeriod,
  onMonth,
  onClass,
  onReset,
  onClose,
}: {
  open: boolean;
  status: StatusFilter;
  statusCounts: Record<string, number>;
  period: Period;
  month: string;
  classId: string;
  classOptions: ClassOption[];
  classCounts: Record<string, number>;
  total: number;
  onStatus: (value: StatusFilter) => void;
  onPeriod: (value: Period) => void;
  onMonth: (value: string) => void;
  onClass: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const { t: td } = useTranslation('documents');
  const { height } = useWindowDimensions();

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('documents.allStatuses') },
    ...STATUSES.map((value) => ({ key: value, label: td(`status.${STATUS_KEY[value]}`) })),
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('documents.filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-mint-ink">{t('documents.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-2 mt-3 text-[13px] font-bold text-muted">{t('documents.sections.period')}</Text>
            <View className="flex-row gap-2">
              <Chip label={t('documents.period.all')} active={period === 'all'} onPress={() => onPeriod('all')} />
              <Chip label={t('documents.period.month')} active={period === 'month'} onPress={() => onPeriod('month')} />
            </View>
            {period === 'month' ? <MonthStepper value={month} onChange={onMonth} /> : null}

            <Text className="mb-1 mt-5 text-[13px] font-bold text-muted">{t('documents.sections.status')}</Text>
            {statusOptions.map((o) => (
              <OptionRow
                key={o.key}
                label={o.label}
                count={statusCounts[o.key] ?? 0}
                active={status === o.key}
                onPress={() => onStatus(o.key)}
              />
            ))}

            {classOptions.length > 1 ? (
              <>
                <Text className="mb-1 mt-5 text-[13px] font-bold text-muted">{t('documents.sections.class')}</Text>
                <OptionRow
                  label={t('documents.allClasses')}
                  count={total}
                  active={classId === 'all'}
                  onPress={() => onClass('all')}
                />
                {classOptions.map((item) => (
                  <OptionRow
                    key={item.id}
                    label={item.name}
                    count={classCounts[item.id] ?? 0}
                    active={classId === item.id}
                    onPress={() => onClass(item.id)}
                  />
                ))}
              </>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-mint-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">
              {t('documents.done')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
