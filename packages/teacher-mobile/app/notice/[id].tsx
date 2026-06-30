import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentBar } from '@/components/common/comment-bar';
import { Avatar } from '@/components/ui/avatar';
import { Loader } from '@/components/ui/loader';
import { useAddNoticeComment, useConfirmNotice, useNotice } from '@/data/notices';
import { formatLongDate, formatTime, localIsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const SKY = '#3E8FE0';

/** Sky identity header — the notice feature colour, with its own status inset. */
function Header({ title, pinned }: { title: string; pinned?: boolean }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="bg-sky-ink">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        {pinned ? <Ionicons name="bookmark" size={20} color="#FFFFFF" /> : <View className="w-6" />}
      </View>
    </SafeAreaView>
  );
}

function ConfirmCard({ noticeId, confirmed }: { noticeId: string; confirmed: boolean }) {
  const { t } = useTranslation('notices');
  const confirm = useConfirmNotice(noticeId);
  const isConfirmed = confirmed || confirm.isPending;
  return (
    <View className="mx-4 mt-5 items-center gap-3 rounded-lg border border-border bg-card p-4">
      <Text className="text-center text-sm text-muted">{t('detail.confirmPrompt')}</Text>
      <Pressable
        onPress={() => confirm.mutate()}
        disabled={isConfirmed}
        className={cn('flex-row items-center gap-1 rounded-full px-6 py-2', isConfirmed ? 'bg-segment' : 'bg-sky-ink')}>
        {isConfirmed ? <Ionicons name="checkmark" size={16} color="#8A8F99" /> : null}
        <Text className={cn('text-sm font-bold', isConfirmed ? 'text-muted' : 'text-white')}>
          {isConfirmed ? t('badges.confirmed') : t('detail.confirm')}
        </Text>
      </Pressable>
    </View>
  );
}

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('notices');
  const { data: notice, isPending } = useNotice(String(id));
  const addComment = useAddNoticeComment(String(id));

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!notice) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} pinned={notice.isPinned} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Author */}
          <View className="flex-row items-center gap-3 px-4 py-4">
            <Avatar size={40} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{notice.authorName}</Text>
              <Text className="text-xs text-muted">
                {formatLongDate(notice.publishedDate, i18n.language)} · {notice.time}
              </Text>
            </View>
          </View>

          {/* Title */}
          <View className="border-b border-border px-4 pb-4">
            <Text className="text-lg font-bold leading-6 text-foreground">{notice.title}</Text>
          </View>

          {/* Body */}
          <Text className="px-4 pt-4 text-[15px] leading-6 text-foreground">{notice.body}</Text>

          {/* Confirmation (project's equivalent of a reaction CTA) */}
          {notice.requiresConfirmation ? (
            <ConfirmCard noticeId={notice.id} confirmed={notice.isConfirmed} />
          ) : null}

          {/* Comment thread */}
          <View className="mt-5 px-4">
            <Text className="mb-1 text-sm font-bold text-foreground">{t('detail.comments')}</Text>
            {notice.comments.length === 0 ? (
              <Text className="py-3 text-sm text-muted">{t('detail.startConversation')}</Text>
            ) : (
              notice.comments.map((comment) => (
                <View key={comment.id} className="flex-row gap-3 border-b border-border py-3">
                  <Avatar size={32} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-foreground">{comment.authorName}</Text>
                      <Text className="text-xs text-muted">
                        {formatLongDate(localIsoDate(comment.createdAt), i18n.language)} ·{' '}
                        {formatTime(comment.createdAt)}
                      </Text>
                    </View>
                    <Text
                      className={cn(
                        'mt-0.5 text-[15px] leading-5',
                        comment.deleted ? 'italic text-muted' : 'text-foreground',
                      )}>
                      {comment.deleted ? t('detail.commentDeleted') : comment.body}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View className="h-6" />
        </ScrollView>

        {notice.allowComments ? (
          <CommentBar
            placeholder={t('detail.writeComment')}
            accentColor={SKY}
            onSubmit={async (text) => {
              await addComment.mutateAsync(text);
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
