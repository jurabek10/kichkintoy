import { Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile/profile-avatar';

export type CommentItem = {
  id: string;
  authorName: string;
  body: string;
  dateLabel: string;
  /** Author photo — a media asset id (staff avatar or child photo) or a legacy URL. */
  photoMediaAssetId?: string | null;
  photoUrl?: string | null;
};

/** Generic comment thread (avatar + name + date + body), shared across features.
 *  A parent's comment shows their child's name + photo; staff show their own. */
export function CommentList({ comments, emptyLabel }: { comments: CommentItem[]; emptyLabel: string }) {
  if (comments.length === 0) {
    return <Text className="text-sm text-muted">{emptyLabel}</Text>;
  }
  return (
    <View className="gap-3">
      {comments.map((comment) => (
        <View key={comment.id} className="flex-row gap-3">
          <ProfileAvatar
            avatarMediaAssetId={comment.photoMediaAssetId ?? null}
            photoUrl={comment.photoUrl ?? null}
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
            <Text className="mt-0.5 text-sm leading-5 text-foreground">{comment.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
