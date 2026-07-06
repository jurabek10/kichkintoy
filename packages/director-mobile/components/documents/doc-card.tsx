import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { DocumentStatusChip } from '@/components/documents/status-chip';
import type { StaffDocument } from '@/data/teacher';
import { formatDayMonth } from '@/lib/date';

const MUTED = '#8A8F99';

/** One document on the teacher's board — child-forward, with the request it
 *  belongs to and its review status. Taps through to a read-only detail. */
export function DocCard({ doc }: { doc: StaffDocument }) {
  const { t, i18n } = useTranslation('teacher');

  return (
    <Link href={{ pathname: '/documents/[id]', params: { id: doc.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-90">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-mint">
          <Ionicons name="document-text" size={20} color="#46B06A" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[15px] font-bold text-foreground" numberOfLines={1}>
              {doc.childName}
            </Text>
            <DocumentStatusChip status={doc.status} />
          </View>
          <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
            {doc.requestTitle}
            {doc.className ? ` · ${doc.className}` : ''}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-3">
            {doc.attachmentCount > 0 ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="attach-outline" size={13} color={MUTED} />
                <Text className="text-[11px] text-muted">{doc.attachmentCount}</Text>
              </View>
            ) : null}
            <View className="flex-1" />
            {doc.dueDate ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={12} color={MUTED} />
                <Text className="text-[11px] text-muted">
                  {t('documents.due', { date: formatDayMonth(doc.dueDate, i18n.language) })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </Pressable>
    </Link>
  );
}
