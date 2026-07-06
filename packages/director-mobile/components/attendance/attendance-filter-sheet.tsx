import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { TeacherClass } from '@/data/teacher';
import { cn } from '@/lib/utils';

export type SexFilter = 'all' | 'boy' | 'girl';
export type StatusFilter = 'all' | 'present' | 'late' | 'absent' | 'not_checked_in' | 'checked_out';

type Summary = {
  present: number;
  late: number;
  absent: number;
  excused: number;
  notCheckedIn: number;
  pickedUp: number;
  leftEarly: number;
};

/** Collapse the raw per-child status into the buckets the filter offers. */
export function statusBucket(status: string): StatusFilter {
  if (status === 'present') return 'present';
  if (status === 'late') return 'late';
  if (status === 'absent' || status === 'excused') return 'absent';
  if (status === 'not_checked_in') return 'not_checked_in';
  return 'checked_out';
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('rounded-full border px-3.5 py-1.5', active ? 'border-primary bg-primary' : 'border-border bg-card')}>
      <Text className={cn('text-[13px] font-semibold', active ? 'text-white' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

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
      <Text numberOfLines={1} className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-primary' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        ) : (
          <View className="h-5 w-5 rounded-full border border-border" />
        )}
      </View>
    </Pressable>
  );
}

/**
 * The single place to narrow the roster: class, sex and status. The screen
 * shows the filtered result; every choice lives here so the list stays clean.
 */
export function AttendanceFilterSheet({
  open,
  classId,
  classes,
  sex,
  status,
  summary,
  boys,
  girls,
  total,
  onClass,
  onSex,
  onStatus,
  onReset,
  onClose,
}: {
  open: boolean;
  classId: string;
  classes: TeacherClass[];
  sex: SexFilter;
  status: StatusFilter;
  summary: Summary | undefined;
  boys: number;
  girls: number;
  total: number;
  onClass: (id: string) => void;
  onSex: (s: SexFilter) => void;
  onStatus: (s: StatusFilter) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const { height } = useWindowDimensions();

  const classOptions = [{ id: 'all', name: t('attendance.allClasses'), childCount: null }, ...classes];
  const sexOptions: { key: SexFilter; label: string }[] = [
    { key: 'all', label: `${t('attendance.all')} ${total}` },
    { key: 'boy', label: `${t('attendance.boys')} ${boys}` },
    { key: 'girl', label: `${t('attendance.girls')} ${girls}` },
  ];
  const statusOptions: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: t('attendance.all'), count: total },
    { key: 'present', label: t('attendance.present'), count: summary?.present ?? 0 },
    { key: 'late', label: t('attendance.late'), count: summary?.late ?? 0 },
    { key: 'absent', label: t('attendance.absent'), count: (summary?.absent ?? 0) + (summary?.excused ?? 0) },
    { key: 'not_checked_in', label: t('attendance.notIn'), count: summary?.notCheckedIn ?? 0 },
    {
      key: 'checked_out',
      label: t('attendance.checkedOut'),
      count: (summary?.pickedUp ?? 0) + (summary?.leftEarly ?? 0),
    },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-card px-4 pb-9 pt-3" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-segment" />
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-foreground">{t('attendance.filter')}</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-semibold text-primary">{t('attendance.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.62 }} showsVerticalScrollIndicator={false}>
            {/* Class only matters when the teacher runs more than one — most run just one. */}
            {classes.length > 1 ? (
              <>
                <Text className="mb-1 mt-3 text-[13px] font-bold text-muted">{t('attendance.class')}</Text>
                {classOptions.map((item) => (
                  <OptionRow
                    key={item.id}
                    label={item.name}
                    count={item.childCount ?? total}
                    active={classId === item.id}
                    onPress={() => onClass(item.id)}
                  />
                ))}
              </>
            ) : null}

            <Text className="mb-2 mt-4 text-[13px] font-bold text-muted">{t('attendance.sex')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {sexOptions.map((o) => (
                <Chip key={o.key} label={o.label} active={sex === o.key} onPress={() => onSex(o.key)} />
              ))}
            </View>

            <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('attendance.status')}</Text>
            {statusOptions.map((o) => (
              <OptionRow
                key={o.key}
                label={o.label}
                count={o.count}
                active={status === o.key}
                onPress={() => onStatus(o.key)}
              />
            ))}
          </ScrollView>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-primary py-3">
            <Text className="text-[15px] font-bold text-white">{t('attendance.done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
