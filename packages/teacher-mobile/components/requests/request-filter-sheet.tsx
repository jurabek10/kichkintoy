import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { JoinRequestKind, JoinRequestStatus } from '@/data/teacher';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const GRAPE_INK = '#7C5CD8';

export type Period = 'all' | 'month';
export type KindFilter = 'all' | JoinRequestKind;

const STATUSES: JoinRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-full border px-3.5 py-1.5',
        active ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card',
      )}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

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
        className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-grape-ink' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={GRAPE_INK} />
        ) : (
          <View className="h-5 w-5 rounded-full border border-border" />
        )}
      </View>
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
 * Narrow the request list by status (which drives the fetch), period (all time
 * or a single month, filtered client-side on when it was submitted), and — when
 * the center gets more than one kind of applicant — by type.
 */
export function RequestFilterSheet({
  open,
  period,
  month,
  status,
  kind,
  kindOptions,
  kindCounts,
  total,
  onPeriod,
  onMonth,
  onStatus,
  onKind,
  onReset,
  onClose,
}: {
  open: boolean;
  period: Period;
  month: string;
  status: JoinRequestStatus;
  kind: KindFilter;
  kindOptions: JoinRequestKind[];
  kindCounts: Record<string, number>;
  total: number;
  onPeriod: (value: Period) => void;
  onMonth: (value: string) => void;
  onStatus: (value: JoinRequestStatus) => void;
  onKind: (value: KindFilter) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const { height } = useWindowDimensions();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('requests.filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-grape-ink">{t('requests.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-2 mt-3 text-[13px] font-bold text-muted">{t('requests.sections.status')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUSES.map((value) => (
                <Chip
                  key={value}
                  label={t(`requests.status.${value}`)}
                  active={status === value}
                  onPress={() => onStatus(value)}
                />
              ))}
            </View>

            <Text className="mb-2 mt-5 text-[13px] font-bold text-muted">{t('requests.sections.period')}</Text>
            <View className="flex-row gap-2">
              <Chip label={t('requests.period.all')} active={period === 'all'} onPress={() => onPeriod('all')} />
              <Chip label={t('requests.period.month')} active={period === 'month'} onPress={() => onPeriod('month')} />
            </View>
            {period === 'month' ? <MonthStepper value={month} onChange={onMonth} /> : null}

            {kindOptions.length > 1 ? (
              <>
                <Text className="mb-1 mt-5 text-[13px] font-bold text-muted">{t('requests.sections.type')}</Text>
                <OptionRow
                  label={t('requests.filters.allTypes')}
                  count={total}
                  active={kind === 'all'}
                  onPress={() => onKind('all')}
                />
                {kindOptions.map((value) => (
                  <OptionRow
                    key={value}
                    label={t(`requests.kind.${value}`)}
                    count={kindCounts[value] ?? 0}
                    active={kind === value}
                    onPress={() => onKind(value)}
                  />
                ))}
              </>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-grape-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">
              {t('requests.done')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
