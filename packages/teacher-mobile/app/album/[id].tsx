import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { SignedAlbumImage } from '@/components/album/signed-album-image';
import { CommentBar } from '@/components/common/comment-bar';
import { PhotoViewer } from '@/components/common/photo-viewer';
import { Avatar } from '@/components/ui/avatar';
import { Loader } from '@/components/ui/loader';
import {
  splitCaption,
  useAddAlbumComment,
  useDeleteAlbum,
  usePublishAlbum,
  useSignedAlbumUrls,
  useStaffAlbum,
  useToggleAlbumReaction,
  type StaffAlbumDetail,
} from '@/data/albums';
import { cn } from '@/lib/utils';

const GRAPE = '#7C5CD8';
const LIKE = '#FF5C7A';

function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="bg-grape-ink">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-white">{title}</Text>
        <View className="w-6" />
      </View>
    </SafeAreaView>
  );
}

/** Status / visibility / class chips under the title. */
function Badges({ album }: { album: StaffAlbumDetail }) {
  const { t } = useTranslation('albums');
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View className={cn('rounded-full px-2.5 py-1', album.status === 'published' ? 'bg-mint' : 'bg-pill')}>
        <Text className={cn('text-[11px] font-bold', album.status === 'published' ? 'text-mint-ink' : 'text-muted')}>
          {t(`status.${album.status}`)}
        </Text>
      </View>
      <View className="rounded-full bg-grape px-2.5 py-1">
        <Text className="text-[11px] font-bold text-grape-ink">
          {t(album.visibility === 'class' ? 'visibility.class' : 'visibility.taggedChildren')}
        </Text>
      </View>
      {album.classes.map((klass) => (
        <View key={klass.id} className="rounded-full bg-pill px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-muted">{klass.name}</Text>
        </View>
      ))}
    </View>
  );
}

/** Publish / delete controls for the album's author (or a director). */
function ManageBar({ album }: { album: StaffAlbumDetail }) {
  const { t } = useTranslation('albums');
  const router = useRouter();
  const publish = usePublishAlbum(album.id);
  const remove = useDeleteAlbum(album.id);

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
      {album.status === 'draft' ? (
        <Pressable
          onPress={() => publish.mutate()}
          disabled={publish.isPending}
          className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-grape-ink px-2">
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

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id);
  const { t } = useTranslation('albums');
  const { data: album, isPending } = useStaffAlbum(postId);
  const addComment = useAddAlbumComment(postId);
  const toggleReaction = useToggleAlbumReaction(postId);
  const photoUrls = useSignedAlbumUrls(album?.media ?? []);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <Loader />
      </View>
    );
  }

  if (!album) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('title')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </View>
    );
  }

  const { title, body } = splitCaption(album.caption);
  const canComment = album.allowComments && album.status === 'published';

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header block */}
          <View className="gap-3 bg-card px-4 pb-4 pt-4">
            <Badges album={album} />
            <View className="flex-row items-center gap-3">
              <Avatar size={40} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">{album.authorName}</Text>
                <Text className="text-xs text-muted">
                  {album.dateLabel}
                  {album.timeLabel ? ` · ${album.timeLabel}` : ''}
                </Text>
              </View>
            </View>
            <ManageBar album={album} />
          </View>

          {/* Caption */}
          {title ? <Text className="px-4 pt-4 text-base font-bold text-foreground">{title}</Text> : null}
          {body ? <Text className="px-4 pt-1 text-[15px] leading-6 text-foreground">{body}</Text> : null}

          {/* Photo grid */}
          {album.media.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5 p-4">
              {album.media.map((media, mediaIndex) => (
                <Pressable
                  key={media.id}
                  className="aspect-square w-[31.8%]"
                  onPress={() => setViewerIndex(mediaIndex)}>
                  <SignedAlbumImage media={media} className="h-full w-full rounded-md" />
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="mx-4 mt-4 items-center justify-center rounded-md border border-border bg-pill py-10">
              <Ionicons name="image-outline" size={28} color="#AEB4BE" />
            </View>
          )}

          {/* Tagged children */}
          {album.taggedChildren.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 px-4">
              {album.taggedChildren.map((child) => (
                <View key={child.id} className="rounded-full border border-border px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-muted">{child.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Reaction */}
          <View className="flex-row items-center gap-3 px-4 pt-4">
            <Pressable
              onPress={() => toggleReaction.mutate()}
              className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
              <Ionicons name={album.myReacted ? 'heart' : 'heart-outline'} size={16} color={LIKE} />
              <Text className="text-sm font-semibold text-foreground">{album.heartCount}</Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="chatbubble-outline" size={15} color="#AEB4BE" />
              <Text className="text-sm text-muted">{album.commentCount}</Text>
            </View>
          </View>

          {/* Comments */}
          <View className="mx-4 mt-6">
            <Text className="mb-3 text-base font-bold text-foreground">{t('detail.comments')}</Text>
            {album.comments.length === 0 ? (
              <Text className="text-sm text-muted">{t('detail.noComments')}</Text>
            ) : (
              album.comments.map((comment) => (
                <View key={comment.id} className="mb-3 flex-row gap-3">
                  <Avatar size={36} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-foreground">{comment.authorName}</Text>
                      <Text className="text-xs text-muted">{comment.dateLabel}</Text>
                    </View>
                    <Text
                      className={cn(
                        'mt-0.5 text-sm leading-5',
                        comment.deleted ? 'italic text-muted' : 'text-foreground',
                      )}>
                      {comment.deleted ? t('detail.commentDeleted') : comment.body}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {canComment ? (
          <CommentBar
            placeholder={t('detail.writeComment')}
            accentColor={GRAPE}
            onSubmit={async (text) => {
              await addComment.mutateAsync(text);
            }}
          />
        ) : null}
      </KeyboardAvoidingView>

      <PhotoViewer
        photos={photoUrls.map((url) => url ?? '')}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
