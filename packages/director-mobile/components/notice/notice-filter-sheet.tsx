import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { cn } from '@/lib/utils';

const SKY_INK = '#3E8FE0';

export type NoticeStatusFilter = 'all' | 'published' | 'scheduled' | 'draft';
export type NoticeAudienceFilter = 'all' | 'center' | 'class' | 'child';

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
 * The single place to narrow the notice board: by status and by audience. The
 * screen renders the filtered result; every choice lives here so the list stays
 * clean — the mobile stand-in for the web table's status tabs + facet filter.
 */
export function NoticeFilterSheet({
  open,
  status,
  audience,
  statusCounts,
  audienceCounts,
  onStatus,
  onAudience,
  onReset,
  onClose,
}: {
  open: boolean;
  status: NoticeStatusFilter;
  audience: NoticeAudienceFilter;
  statusCounts: Record<NoticeStatusFilter, number>;
  audienceCounts: Record<NoticeAudienceFilter, number>;
  onStatus: (value: NoticeStatusFilter) => void;
  onAudience: (value: NoticeAudienceFilter) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('notices');
  const { height } = useWindowDimensions();

  const statusOptions: { key: NoticeStatusFilter; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'published', label: t('status.published') },
    { key: 'scheduled', label: t('status.scheduled') },
    { key: 'draft', label: t('status.draft') },
  ];
  const audienceOptions: { key: NoticeAudienceFilter; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'center', label: t('audience.center') },
    { key: 'class', label: t('audience.class') },
    { key: 'child', label: t('audience.child') },
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

            <Text className="mb-1 mt-4 text-[13px] font-bold text-muted">{t('table.audience')}</Text>
            {audienceOptions.map((o) => (
              <OptionRow
                key={o.key}
                label={o.label}
                count={audienceCounts[o.key]}
                active={audience === o.key}
                onPress={() => onAudience(o.key)}
              />
            ))}
          </ScrollView>

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
