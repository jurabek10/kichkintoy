import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { MedicationStatus } from '@/data/medications';
import { cn } from '@/lib/utils';

const STATUS: Record<MedicationStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  administered: { bg: 'bg-mint', text: 'text-mint-ink' },
  skipped: { bg: 'bg-pill', text: 'text-muted' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

/** The request's lifecycle status as a coloured chip. */
export function StatusChip({ status }: { status: MedicationStatus }) {
  const { t } = useTranslation('medications');
  const v = STATUS[status];
  return (
    <View className={cn('rounded-full px-2.5 py-1', v.bg)}>
      <Text className={cn('text-[11px] font-bold', v.text)}>{t(`status.${status}`)}</Text>
    </View>
  );
}
