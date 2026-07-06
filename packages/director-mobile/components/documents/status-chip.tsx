import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { DocumentStatus } from '@/data/documents';
import { cn } from '@/lib/utils';

const STATUS: Record<DocumentStatus, { bg: string; text: string; key: string }> = {
  not_started: { bg: 'bg-pill', text: 'text-muted', key: 'notStarted' },
  in_progress: { bg: 'bg-sunshine', text: 'text-sunshine-ink', key: 'inProgress' },
  submitted: { bg: 'bg-sky', text: 'text-sky-ink', key: 'submitted' },
  needs_correction: { bg: 'bg-coral', text: 'text-coral-ink', key: 'needsCorrection' },
  accepted: { bg: 'bg-mint', text: 'text-mint-ink', key: 'accepted' },
  closed: { bg: 'bg-pill', text: 'text-muted', key: 'closed' },
};

/** A submission's review status as a coloured chip. */
export function DocumentStatusChip({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation('documents');
  const v = STATUS[status];
  return (
    <View className={cn('rounded-full px-2.5 py-1', v.bg)}>
      <Text className={cn('text-[11px] font-bold', v.text)}>{t(`status.${v.key}`)}</Text>
    </View>
  );
}
