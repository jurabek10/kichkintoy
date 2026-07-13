import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { CommentAttachments } from '@/components/common/comment-attachments';
import type { ReportComment } from '@/data/reports';

/** Comment thread under a report. A parent's comment shows their child's name +
 *  photo; staff show their own. */
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
            <ProfileAvatar
              avatarMediaAssetId={comment.photoMediaAssetId}
              photoUrl={comment.photoUrl}
              name={comment.authorName}
              size={36}
              fallbackClassName="bg-sky"
              fallbackTextClassName="text-sky-ink"
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-foreground">{comment.authorName}</Text>
                <Text className="text-xs text-muted">{comment.dateLabel}</Text>
              </View>
              {comment.body ? <Text className="mt-0.5 text-sm leading-5 text-foreground">{comment.body}</Text> : null}
              <CommentAttachments attachments={comment.attachments} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
