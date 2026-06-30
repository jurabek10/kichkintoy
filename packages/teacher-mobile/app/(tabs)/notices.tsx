import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { useAuthorNotices } from '@/data/teacher';
import { formatDayMonth } from '@/lib/date';
import i18n from '@/i18n';

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-pill', text: 'text-muted' },
  scheduled: { bg: 'bg-sky', text: 'text-sky-ink' },
  published: { bg: 'bg-mint', text: 'text-mint-ink' },
};

export default function NoticesScreen() {
  const { t } = useTranslation('teacher');
  const query = useAuthorNotices();
  const notices = query.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('notices.title')} />
      {query.isPending ? (
        <Loader />
      ) : notices.length === 0 ? (
        <View className="p-4">
          <EmptyState icon="megaphone-outline" title={t('notices.empty')} body={t('notices.emptyBody')} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
          {notices.map((notice) => {
            const tone = STATUS_TONE[notice.status] ?? STATUS_TONE.draft;
            return (
              <Card key={notice.id}>
                <View className="flex-row items-start gap-2">
                  {notice.isPinned ? (
                    <Ionicons name="pin" size={16} color="#E8674E" style={{ marginTop: 2 }} />
                  ) : null}
                  <Text className="flex-1 text-[15px] font-bold text-foreground">{notice.title}</Text>
                  <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
                    <Text className={`text-[11px] font-bold ${tone.text}`}>
                      {t(`notices.status.${notice.status}`, { defaultValue: notice.status })}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={2} className="mt-1.5 text-[13px] leading-5 text-muted">
                  {notice.bodyPreview}
                </Text>
                <View className="mt-3 flex-row items-center gap-4">
                  {notice.publishedAt ? (
                    <Text className="text-[12px] text-muted">{formatDayMonth(notice.publishedAt, i18n.language)}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="eye-outline" size={14} color="#8A8F99" />
                    <Text className="text-[12px] text-muted">{notice.readCount}/{notice.recipientCount}</Text>
                  </View>
                  {notice.requiresConfirmation ? (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="checkmark-done-outline" size={14} color="#8A8F99" />
                      <Text className="text-[12px] text-muted">{notice.confirmedCount}</Text>
                    </View>
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
