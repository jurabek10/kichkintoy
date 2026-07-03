import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { JoinRequestKind, JoinRequestStatus } from '@/data/teacher';
import { cn } from '@/lib/utils';

const STATUS: Record<JoinRequestStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  approved: { bg: 'bg-mint', text: 'text-mint-ink' },
  rejected: { bg: 'bg-coral', text: 'text-coral-ink' },
  cancelled: { bg: 'bg-pill', text: 'text-muted' },
};

/** The request's lifecycle status as a coloured chip. */
export function RequestStatusChip({ status }: { status: JoinRequestStatus }) {
  const { t } = useTranslation('teacher');
  const v = STATUS[status];
  return (
    <View className={cn('rounded-full px-2.5 py-1', v.bg)}>
      <Text className={cn('text-[11px] font-bold', v.text)}>{t(`requests.status.${status}`)}</Text>
    </View>
  );
}

const KIND: Record<JoinRequestKind, { bg: string; text: string }> = {
  parent: { bg: 'bg-sky', text: 'text-sky-ink' },
  teacher: { bg: 'bg-grape', text: 'text-grape-ink' },
  director: { bg: 'bg-bubblegum', text: 'text-bubblegum-ink' },
};

/** Who is asking to join — parent, teacher, or director. */
export function RequestKindBadge({ kind }: { kind: JoinRequestKind }) {
  const { t } = useTranslation('teacher');
  const v = KIND[kind];
  return (
    <View className={cn('self-start rounded-full px-2 py-0.5', v.bg)}>
      <Text className={cn('text-[10px] font-bold uppercase tracking-wide', v.text)}>
        {t(`requests.kind.${kind}`)}
      </Text>
    </View>
  );
}
