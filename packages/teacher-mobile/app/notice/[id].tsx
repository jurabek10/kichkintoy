import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentBar } from '@/components/common/comment-bar';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import {
  type NoticeCommentView,
  type StaffNoticeDetail,
  useAddNoticeComment,
  useAuthorNotice,
  useDeleteNotice,
  useDeleteNoticeComment,
  usePublishNotice,
} from '@/data/notices';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const SKY = '#3E8FE0';

const STATUS_DOT: Record<StaffNoticeDetail['status'], string> = {
  published: 'bg-mint-ink',
  scheduled: 'bg-sunshine-ink',
  draft: 'bg-muted-soft',
};

/** Sky identity header, with its own (sky) status-bar inset. */
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

/** The audience / important / pinned / status chips under the title. */
function MetaStrip({ notice }: { notice: StaffNoticeDetail }) {
  const { t } = useTranslation('notices');
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View className="rounded-full bg-pill px-2.5 py-1">
        <Text className="text-[11px] font-semibold text-muted">{t(`audience.${notice.audience}`)}</Text>
      </View>
      {notice.isImportant ? (
        <View className="flex-row items-center gap-1 rounded-full bg-coral px-2.5 py-1">
          <Ionicons name="star" size={11} color="#E8674E" />
          <Text className="text-[11px] font-bold text-coral-ink">{t('badges.important')}</Text>
        </View>
      ) : null}
      {notice.isPinned ? (
        <View className="flex-row items-center gap-1 rounded-full bg-sunshine px-2.5 py-1">
          <Ionicons name="bookmark" size={11} color="#F4A621" />
          <Text className="text-[11px] font-bold text-sunshine-ink">{t('badges.pinned')}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-1.5">
        <View className={cn('h-2 w-2 rounded-full', STATUS_DOT[notice.status])} />
        <Text className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {t(`status.${notice.status}`)}
        </Text>
      </View>
    </View>
  );
}

/** Publish / delete controls, shown to the author or a director. */
function ManageBar({ notice }: { notice: StaffNoticeDetail }) {
  const { t } = useTranslation('notices');
  const router = useRouter();
  const publish = usePublishNotice(notice.id);
  const remove = useDeleteNotice(notice.id);

  function confirmDelete() {
    Alert.alert(t('detail.deleteConfirmTitle'), t('detail.deleteConfirmBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }),
      },
    ]);
  }

  return (
    <View className="flex-row gap-2">
      {notice.status !== 'published' ? (
        <Pressable
          onPress={() => publish.mutate()}
          disabled={publish.isPending}
          className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-sky-ink px-2">
          {publish.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={15} color="#FFFFFF" />
          )}
          <Text numberOfLines={1} className="shrink text-[13px] font-bold text-white">
            {t('detail.publish')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={confirmDelete}
        disabled={remove.isPending}
        className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-coral-ink/30 bg-coral px-2">
        <Ionicons name="trash-outline" size={15} color="#E8674E" />
        <Text numberOfLines={1} className="shrink text-[13px] font-bold text-coral-ink">
          {t('detail.delete')}
        </Text>
      </Pressable>
    </View>
  );
}

/** Who has read (and confirmed) the notice — the author's after-the-send view. */
function ReceiptsCard({ notice }: { notice: StaffNoticeDetail }) {
  const { t } = useTranslation('notices');
  return (
    <Card className="mx-4 gap-3">
      <View>
        <Text className="text-[15px] font-extrabold text-foreground">{t('detail.readReceipts')}</Text>
        <Text className="mt-0.5 text-[12px] text-muted">
          {t('readCount', { read: notice.readCount, total: notice.recipientCount })}
          {notice.requiresConfirmation
            ? ` · ${t('confirmedCount', { confirmed: notice.confirmedCount, total: notice.recipientCount })}`
            : ''}
        </Text>
      </View>

      {notice.recipients.length === 0 ? (
        <Text className="text-[13px] text-muted">{t('detail.noReceipts')}</Text>
      ) : (
        <View className="gap-2.5">
          {notice.recipients.map((recipient) => (
            <View key={recipient.id} className="flex-row items-center gap-2.5">
              <View
                className={cn(
                  'h-2 w-2 rounded-full',
                  recipient.readLabel ? 'bg-mint-ink' : 'bg-segment',
                )}
              />
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-foreground">{recipient.userName}</Text>
                {recipient.childName ? (
                  <Text className="text-[11px] text-muted">
                    {recipient.childName}
                    {recipient.className ? ` · ${recipient.className}` : ''}
                  </Text>
                ) : null}
              </View>
              <Text className="text-[11px] text-muted">
                {recipient.readLabel
                  ? notice.requiresConfirmation && recipient.confirmedLabel
                    ? t('detail.confirmedAt', { date: recipient.confirmedLabel })
                    : t('detail.readAt', { date: recipient.readLabel })
                  : t('detail.unread')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function CommentRow({
  comment,
  noticeAuthorId,
  canDelete,
  onDelete,
}: {
  comment: NoticeCommentView;
  noticeAuthorId: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation('notices');
  const isAuthor = comment.authorId === noticeAuthorId;
  return (
    <View className="flex-row gap-3 border-b border-border py-3">
      <Avatar size={32} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[13px] font-bold text-foreground">{comment.authorName}</Text>
          {isAuthor ? (
            <View className="rounded-full bg-sky px-1.5 py-0.5">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-sky-ink">
                {t('detail.author')}
              </Text>
            </View>
          ) : null}
          <Text className="text-[11px] text-muted">{comment.dateLabel}</Text>
          {canDelete ? (
            <Pressable onPress={onDelete} hitSlop={8} className="ml-auto">
              <Ionicons name="trash-outline" size={14} color="#AEB4BE" />
            </Pressable>
          ) : null}
        </View>
        <Text
          className={cn(
            'mt-0.5 text-[14px] leading-5',
            comment.deleted ? 'italic text-muted' : 'text-foreground',
          )}>
          {comment.deleted ? t('detail.commentDeleted') : comment.body}
        </Text>
      </View>
    </View>
  );
}

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noticeId = String(id);
  const { t } = useTranslation('notices');
  const { session } = useAuth();
  const { data: notice, isPending } = useAuthorNotice(noticeId);
  const addComment = useAddNoticeComment(noticeId);
  const deleteComment = useDeleteNoticeComment(noticeId);

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

  const userId = session?.user.id;
  const canManage = session?.user.role === 'director' || notice.authorId === userId;
  const canComment = notice.allowComments && notice.status === 'published';

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} pinned={notice.isPinned} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header block */}
          <View className="gap-3 bg-card px-4 pb-4 pt-4">
            <MetaStrip notice={notice} />
            <Text className="text-[22px] font-extrabold leading-7 text-foreground">{notice.title}</Text>

            <View className="flex-row items-center gap-3">
              <Avatar size={40} />
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-foreground">{notice.authorName}</Text>
                <Text className="text-[12px] text-muted">{notice.publishedLabel}</Text>
              </View>
            </View>

            {canManage ? <ManageBar notice={notice} /> : null}
          </View>

          {/* Body */}
          <Text className="border-b border-border bg-card px-4 pb-5 text-[15px] leading-6 text-foreground">
            {notice.body}
          </Text>

          {/* Read receipts */}
          <View className="mt-3">
            <ReceiptsCard notice={notice} />
          </View>

          {/* Comments */}
          <View className="mt-5 px-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="chatbubble-outline" size={15} color={SKY} />
              <Text className="text-[15px] font-bold text-foreground">{t('detail.comments')}</Text>
              {notice.comments.length > 0 ? (
                <View className="rounded-full bg-pill px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-muted">{notice.comments.length}</Text>
                </View>
              ) : null}
            </View>
            {notice.comments.length === 0 ? (
              <Text className="py-3 text-[13px] text-muted">{t('detail.startConversation')}</Text>
            ) : (
              notice.comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  noticeAuthorId={notice.authorId}
                  canDelete={!comment.deleted && (canManage || comment.authorId === userId)}
                  onDelete={() => deleteComment.mutate(comment.id)}
                />
              ))
            )}
          </View>
        </ScrollView>

        {canComment ? (
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
