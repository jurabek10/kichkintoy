import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import type { ReportComment } from '@/data/reports';

/** Comment thread under a report. */
export function ReportComments({ comments }: { comments: ReportComment[] }) {
  const { t } = useTranslation('reports');

  return (
    <View className="mx-4 mt-6">
      <Text className="mb-3 text-base font-bold text-foreground">{t('detail.comments')}</Text>
      {comments.length === 0 ? (
        <Text className="text-sm text-muted">{t('detail.noComments')}</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} className="mb-3 flex-row gap-3">
            <Avatar size={36} />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-foreground">{comment.authorName}</Text>
                <Text className="text-xs text-muted">{comment.dateLabel}</Text>
              </View>
              <Text className="mt-0.5 text-sm leading-5 text-foreground">{comment.body}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
