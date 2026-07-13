import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { CommentAttachment } from '@kichkintoy/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Modal, Pressable, Text, View } from 'react-native';

import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

function sizeLabel(bytes: number | null) {
  if (bytes === null) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Attachment({ attachment }: { attachment: CommentAttachment }) {
  const { t } = useTranslation('common');
  const query = useQuery({
    queryKey: queryKeys.media.download(attachment.mediaAssetId),
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: attachment.mediaAssetId }),
    staleTime: 4 * 60 * 1000,
  });
  const url = query.data?.downloadUrl;
  const [open, setOpen] = useState(false);

  if (attachment.mediaType === 'file') {
    return (
      <Pressable disabled={!url} onPress={() => url && Linking.openURL(url)} className="mt-2 max-w-full flex-row items-center gap-2 self-start rounded-lg border border-border bg-segment px-3 py-2">
        <Ionicons name="document-text-outline" size={20} color="#606773" />
        <View className="max-w-[210px]">
          <Text numberOfLines={1} ellipsizeMode="middle" className="text-xs font-semibold text-foreground">{attachment.fileName ?? t('comments.attachmentKind.file')}</Text>
          <Text className="text-[10px] text-muted">{sizeLabel(attachment.sizeBytes)}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable disabled={!url} onPress={() => attachment.mediaType === 'image' ? setOpen(true) : url && Linking.openURL(url)} className="relative aspect-square w-[48%] overflow-hidden rounded-lg bg-segment">
        {url ? <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" /> : null}
        {attachment.mediaType === 'video' ? (
          <View className="absolute inset-0 items-center justify-center bg-black/20"><Ionicons name="play-circle" size={36} color="#FFFFFF" /></View>
        ) : null}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/95 p-4">
          {url ? <Image source={{ uri: url }} className="h-full w-full" resizeMode="contain" /> : null}
          <Ionicons name="close-circle" size={34} color="#FFFFFF" style={{ position: 'absolute', right: 16, top: 48 }} />
        </Pressable>
      </Modal>
    </>
  );
}

export function CommentAttachments({ attachments }: { attachments: CommentAttachment[] }) {
  if (attachments.length === 0) return null;
  const media = attachments.filter((item) => item.mediaType !== 'file');
  const files = attachments.filter((item) => item.mediaType === 'file');
  return (
    <View>
      {media.length > 0 ? <View className="mt-2 flex-row flex-wrap gap-1.5">{media.map((item) => <Attachment key={item.mediaAssetId} attachment={item} />)}</View> : null}
      {files.map((item) => <Attachment key={item.mediaAssetId} attachment={item} />)}
    </View>
  );
}
