import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignedAlbumImage } from '@/components/album/signed-album-image';
import { CommentBar } from '@/components/common/comment-bar';
import { CommentList } from '@/components/common/comment-list';
import { PhotoViewer } from '@/components/common/photo-viewer';
import { Avatar } from '@/components/ui/avatar';
import { Loader } from '@/components/ui/loader';
import {
  splitCaption,
  useAddAlbumComment,
  useAlbum,
  useSignedAlbumUrls,
  useToggleAlbumReaction,
} from '@/data/albums';
import { formatLongDate } from '@/lib/date';

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

function HeartButton({
  count,
  reacted,
  onPress,
}: {
  count: number;
  reacted: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5">
      <Ionicons name={reacted ? 'heart' : 'heart-outline'} size={16} color={LIKE} />
      <Text className="text-sm font-semibold text-foreground">{count}</Text>
    </Pressable>
  );
}

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation('albums');
  const { data: album, isPending } = useAlbum(String(id));
  const addComment = useAddAlbumComment(String(id));
  const toggleReaction = useToggleAlbumReaction(String(id));
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

  return (
    <View className="flex-1 bg-background">
      <Header title={t('title')} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Author */}
          <View className="flex-row items-center gap-3 px-4 py-4">
            <Avatar uri={album.authorPhoto} size={40} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{album.authorName}</Text>
              <Text className="text-xs text-muted">
                {formatLongDate(album.publishedDate, i18n.language)} · {album.time}
              </Text>
            </View>
          </View>

          {/* Recipients */}
          {album.className ? (
            <View className="mx-4 flex-row items-center gap-2 self-start rounded-full bg-pill px-3 py-1.5">
              <Avatar size={22} />
              <Text className="text-xs font-semibold text-muted">
                {album.className}
                {album.taggedFamilies > 0 ? ` · +${album.taggedFamilies}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Caption */}
          {title ? <Text className="px-4 pt-4 text-base font-bold text-foreground">{title}</Text> : null}
          {body ? (
            <Text className="px-4 pt-1 text-[15px] leading-6 text-foreground">{body}</Text>
          ) : null}

          {/* Photo grid */}
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

          {/* Reaction */}
          <View className="px-4">
            <HeartButton
              count={album.heartCount}
              reacted={album.myReacted}
              onPress={() => toggleReaction.mutate()}
            />
          </View>

          {/* Comments */}
          <View className="mx-4 mt-6">
            <Text className="mb-3 text-base font-bold text-foreground">{t('detail.comments')}</Text>
            <CommentList comments={album.comments} emptyLabel={t('detail.noComments')} />
          </View>
          <View className="h-6" />
        </ScrollView>

        {album.allowComments ? (
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
