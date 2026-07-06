import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

const SKY_INK = '#3E8FE0';

export type NoticeParentFilter = 'all' | 'unread' | 'toConfirm';

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
        className={cn('flex-1 pr-3 text-[15px]', active ? 'font-bold text-sky-ink' : 'text-foreground')}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] text-muted">{count}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={SKY_INK} />
        ) : (
          <View className="h-5 w-5 rounded-full border border-border" />
        )}
      </View>
    </Pressable>
  );
}

/**
 * The parent's stand-in for the web notices filter tabs: show everything, only
 * what's unread, or only what still needs confirming. One dimension, so a single
 * section — the same bottom-sheet shape the teacher board uses.
 */
export function NoticeFilterSheet({
  open,
  filter,
  counts,
  onFilter,
  onReset,
  onClose,
}: {
  open: boolean;
  filter: NoticeParentFilter;
  counts: Record<NoticeParentFilter, number>;
  onFilter: (value: NoticeParentFilter) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('notices');

  const options: { key: NoticeParentFilter; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'unread', label: t('filters.unread') },
    { key: 'toConfirm', label: t('filters.toConfirm') },
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
              <Text className="text-sm font-semibold text-sky-ink">{t('reset')}</Text>
            </Pressable>
          </View>

          <View className="mt-2">
            {options.map((option) => (
              <OptionRow
                key={option.key}
                label={option.label}
                count={counts[option.key]}
                active={filter === option.key}
                onPress={() => onFilter(option.key)}
              />
            ))}
          </View>

          <Pressable onPress={onClose} className="mt-4 items-center rounded-md bg-sky-ink py-3">
            <Text numberOfLines={1} className="text-[15px] font-bold text-white">
              {t('done')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
