import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { DatePickerField } from '@/components/common/date-picker-field';
import { colors } from '@/constants/theme';
import { formatMonthYear } from '@/lib/date';
import { cn } from '@/lib/utils';

const GRAPE_INK = '#7C5CD8';

export type AlbumStatusFilter = 'all' | 'published' | 'draft';
export type AlbumPeriod = 'all' | 'month' | 'day';
export type ClassOption = { id: string; name: string };

/** A selectable row with a trailing count and radio-style check. */
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('rounded-full border px-3.5 py-1.5', active ? 'border-grape-ink bg-grape-ink' : 'border-border bg-card')}>
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
 * The single place to narrow the album board: by status, class (only when the
 * teacher runs more than one), and time period. The screen renders the filtered
 * result — the mobile stand-in for the web table's status/class/period toolbar.
 */
export function AlbumFilterSheet({
  open,
  status,
  statusCounts,
  classId,
  classOptions,
  classCounts,
  total,
  period,
  month,
  day,
  onStatus,
  onClass,
  onPeriod,
  onMonth,
  onDay,
  onReset,
  onClose,
}: {
  open: boolean;
  status: AlbumStatusFilter;
  statusCounts: Record<AlbumStatusFilter, number>;
  classId: string;
  classOptions: ClassOption[];
  classCounts: Record<string, number>;
  total: number;
  period: AlbumPeriod;
  month: string;
  day: string;
  onStatus: (value: AlbumStatusFilter) => void;
  onClass: (value: string) => void;
  onPeriod: (value: AlbumPeriod) => void;
  onMonth: (value: string) => void;
  onDay: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('albums');
  const { height } = useWindowDimensions();

  const statusOptions: { key: AlbumStatusFilter; label: string }[] = [
    { key: 'all', label: t('table.allStatuses') },
    { key: 'published', label: t('status.published') },
    { key: 'draft', label: t('status.draft') },
  ];
  const periodOptions: { key: AlbumPeriod; label: string }[] = [
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
              <Text className="text-sm font-semibold text-grape-ink">{t('reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-1 mt-3 text-[13px] font-bold text-muted">{t('table.status')}</Text>
            {statusOptions.map((o) => (
              <OptionRow
                key={o.key}
                label={o.label}
                count={statusCounts[o.key]}
                active={status === o.key}
                onPress={() => onStatus(o.key)}
              />
            ))}

            {/* Class only matters when the teacher runs more than one. */}
            {classOptions.length > 1 ? (
              <>
                <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('table.allClasses')}</Text>
                <OptionRow
                  label={t('table.allClasses')}
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

            <Text className="mb-2 mt-4 text-[13px] font-bold text-muted">{t('table.date')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {periodOptions.map((o) => (
                <Chip key={o.key} label={o.label} active={period === o.key} onPress={() => onPeriod(o.key)} />
              ))}
            </View>
            {period === 'month' ? (
              <View className="mt-3">
                <MonthStepper value={month} onChange={onMonth} />
              </View>
            ) : period === 'day' ? (
              <View className="mt-3">
                <DatePickerField value={day} onChange={onDay} label={t('table.date')} />
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-grape-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">
              {t('done')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
