import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { PickupStatus } from '@/data/pickups';
import { cn } from '@/lib/utils';

const STATUS: Record<PickupStatus, { bg: string; text: string }> = {
  submitted: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  changed: { bg: 'bg-sky', text: 'text-sky-ink' },
  acknowledged: { bg: 'bg-mint', text: 'text-mint-ink' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

/** The notice's lifecycle status as a coloured chip. */
export function PickupStatusChip({ status }: { status: PickupStatus }) {
  const { t } = useTranslation('pickups');
  const v = STATUS[status];
  return (
    <View className={cn('rounded-full px-2.5 py-1', v.bg)}>
      <Text className={cn('text-[11px] font-bold', v.text)}>{t(`status.${status}`)}</Text>
    </View>
  );
}
