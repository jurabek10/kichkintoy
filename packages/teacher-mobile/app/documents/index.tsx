import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChips } from '@/components/common/filter-chips';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useStaffDocuments, type DocStatus } from '@/data/teacher';
import i18n from '@/i18n';
import { formatDayMonth } from '@/lib/date';

type Filter = 'all' | 'submitted' | 'accepted' | 'needs_correction';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  submitted: { bg: 'bg-sunshine', text: 'text-sunshine-ink' },
  accepted: { bg: 'bg-mint', text: 'text-mint-ink' },
  needs_correction: { bg: 'bg-coral', text: 'text-coral-ink' },
  in_progress: { bg: 'bg-sky', text: 'text-sky-ink' },
  not_started: { bg: 'bg-pill', text: 'text-muted' },
  closed: { bg: 'bg-pill', text: 'text-muted' },
};

export default function DocumentsScreen() {
  const { t } = useTranslation('teacher');
  const [filter, setFilter] = useState<Filter>('all');
  const query = useStaffDocuments(filter === 'all' ? undefined : (filter as DocStatus));
  const submissions = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('documents.title')} back />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('documents.filter.all') },
          { value: 'submitted', label: t('documents.status.submitted') },
          { value: 'needs_correction', label: t('documents.status.needs_correction') },
          { value: 'accepted', label: t('documents.status.accepted') },
        ]}
      />
      {query.isPending ? (
        <Loader />
      ) : submissions.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="document-attach-outline" title={t('documents.empty')} body={t('documents.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {submissions.map((sub) => {
            const tone = STATUS_TONE[sub.status] ?? STATUS_TONE.not_started;
            return (
              <Card key={sub.id}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-[15px] font-bold text-foreground">{sub.childName}</Text>
                  <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
                    <Text className={`text-[11px] font-bold ${tone.text}`}>
                      {t(`documents.status.${sub.status}`, { defaultValue: sub.status })}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted">
                  {sub.requestTitle}
                  {sub.className ? ` · ${sub.className}` : ''}
                </Text>
                <View className="mt-2 flex-row items-center gap-4">
                  {sub.attachmentCount > 0 ? (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="attach-outline" size={14} color="#8A8F99" />
                      <Text className="text-[12px] text-muted">{sub.attachmentCount}</Text>
                    </View>
                  ) : null}
                  {sub.dueDate ? (
                    <Text className="text-[12px] text-muted">
                      {t('documents.due', { date: formatDayMonth(sub.dueDate, i18n.language) })}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
