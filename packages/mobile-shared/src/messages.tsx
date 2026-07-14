/// <reference path="./nativewind-types.d.ts" />
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  DirectMessage,
  MessageAttachment,
  MessageContact,
  MessageContactGroup,
  ThreadDetail,
  ThreadListResponse,
} from '@kichkintoy/shared';

export type MessagesApi = {
  contacts(input: { centerId?: string }): Promise<MessageContactGroup[]>;
  threads(input: { cursor?: string; limit?: number }): Promise<ThreadListResponse>;
  thread(input: { threadId: string; cursor?: string; limit?: number }): Promise<ThreadDetail>;
  startThread(input: { recipientUserId: string; centerId?: string; body?: string; attachmentMediaAssetIds?: string[] }): Promise<ThreadDetail>;
  send(input: { threadId: string; body?: string; attachmentMediaAssetIds?: string[] }): Promise<DirectMessage>;
  editMessage(input: { messageId: string; body: string }): Promise<DirectMessage>;
  deleteMessage(input: { messageId: string }): Promise<DirectMessage>;
};

type Navigation = {
  back(): void;
  openThread(threadId: string): void;
  newMessage(): void;
};

type ResolvePhoto = (mediaAssetId: string) => Promise<string | null>;
export type MessageUpload = (params: { uri: string; centerId: string; mimeType: string; fileName: string }) => Promise<string>;
type PendingAttachment = { id: string; uri: string; fileName: string; mimeType: string; sizeBytes: number; kind: 'image' | 'video' | 'file' };
const MAX_ATTACHMENTS = 4;
const FILE_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;
type IdentityPerson = Pick<MessageContact, 'displayName' | 'parentContext'> & {
  role?: MessageContact['role'];
  classLabel?: string | null;
};
type IdentityParts = { primary: string; secondary: string | null; searchText: string };

function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: () => void; right?: ReactNode }) {
  return (
    <View className="min-h-14 flex-row items-center gap-2 border-b border-border bg-card px-3 pb-3 pt-2">
      {back ? (
        <Pressable onPress={back} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full active:bg-segment">
          <Ionicons name="arrow-back" size={23} color="#1F2937" />
        </Pressable>
      ) : <View className="w-2" />}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[21px] font-extrabold tracking-tight text-foreground">{title}</Text>
        {subtitle ? <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Avatar({ person, resolvePhoto, displayName, size = 44 }: { person: { displayName: string; photoMediaAssetId: string | null; photoUrl: string | null }; resolvePhoto: ResolvePhoto; displayName?: string; size?: number }) {
  const signedPhoto = useQuery({
    queryKey: ['media', 'download', person.photoMediaAssetId],
    queryFn: () => resolvePhoto(person.photoMediaAssetId!),
    enabled: Boolean(person.photoMediaAssetId),
    staleTime: 240_000,
  });
  const imageUrl = signedPhoto.data ?? person.photoUrl;
  const initials = (displayName ?? person.displayName).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: Math.round(size * 0.36) }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.36) }} className="items-center justify-center bg-grape">
      <Text className="text-xs font-extrabold text-grape-ink">{initials}</Text>
    </View>
  );
}

/** A photo/video attachment: rendered as a bare rounded thumbnail — no colored
 *  bubble frame around it — so a shared image reads as an image, not a big box. */
function AttachmentImage({ attachment, resolvePhoto, single }: { attachment: MessageAttachment; resolvePhoto: ResolvePhoto; single: boolean }) {
  const { t } = useTranslation('messages');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ['media', 'download', attachment.mediaAssetId],
    queryFn: () => resolvePhoto(attachment.mediaAssetId),
    staleTime: 240_000,
  });
  const url = query.data;
  const run = async () => {
    if (!url || busy) return;
    setBusy(true);
    try {
      await openAttachment({ url, mediaAssetId: attachment.mediaAssetId, fileName: attachment.fileName, mimeType: attachment.mimeType });
    } catch {
      Alert.alert(t('openFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Pressable disabled={!url} onPress={() => (attachment.mediaType === 'image' ? setOpen(true) : void run())} className={`relative aspect-square overflow-hidden rounded-2xl bg-segment ${single ? 'w-full' : 'w-[49%]'}`}>
        {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <View className="h-full w-full items-center justify-center"><ActivityIndicator color="#AEB4BE" /></View>}
        {attachment.mediaType === 'video' ? <View className="absolute inset-0 items-center justify-center bg-black/25">{busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="play-circle" size={38} color="#FFFFFF" />}</View> : null}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/95 p-4">
          {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
          <Pressable onPress={() => setOpen(false)} hitSlop={12} style={{ position: 'absolute', right: 16, top: 48 }}>
            <Ionicons name="close-circle" size={34} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={run} disabled={busy} className="absolute flex-row items-center gap-2 rounded-full bg-white/15 px-5 py-3 active:bg-white/25" style={{ bottom: 44 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="share-outline" size={18} color="#FFFFFF" />}
            <Text className="font-bold text-white">{t('saveToFiles')}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** A file attachment chip. Tints to the bubble color when it's the sender's own. */
function AttachmentFile({ attachment, resolvePhoto, mine }: { attachment: MessageAttachment; resolvePhoto: ResolvePhoto; mine: boolean }) {
  const { t } = useTranslation('messages');
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ['media', 'download', attachment.mediaAssetId],
    queryFn: () => resolvePhoto(attachment.mediaAssetId),
    staleTime: 240_000,
  });
  const url = query.data;
  const run = async () => {
    if (!url || busy) return;
    setBusy(true);
    try {
      await openAttachment({ url, mediaAssetId: attachment.mediaAssetId, fileName: attachment.fileName, mimeType: attachment.mimeType });
    } catch {
      Alert.alert(t('openFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable disabled={!url || busy} onPress={run} className={`flex-row items-center gap-2.5 rounded-2xl px-3 py-2.5 ${mine ? 'bg-primary' : 'border border-border bg-card'}`}>
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${mine ? 'bg-white/20' : 'bg-segment'}`}>
        {busy ? <ActivityIndicator color={mine ? '#FFFFFF' : '#606773'} /> : <Ionicons name="document-text" size={18} color={mine ? '#FFFFFF' : '#606773'} />}
      </View>
      <View className="max-w-[176px]">
        <Text numberOfLines={1} ellipsizeMode="middle" className={`text-[13px] font-semibold ${mine ? 'text-white' : 'text-foreground'}`}>{attachment.fileName ?? t('previewKind.file')}</Text>
        <Text className={`text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>{busy ? t('opening') : sizeLabel(attachment.sizeBytes)}</Text>
      </View>
      <Ionicons name="download-outline" size={17} color={mine ? '#FFFFFF' : '#89919E'} />
    </Pressable>
  );
}

/** One message: photos as bare thumbnails, files as chips, text in a colored
 *  bubble. Under the last message of a sender's run: the timestamp, an "edited"
 *  tag, and — for your own messages — a sent (✓) / read (✓✓) receipt. Tapping
 *  your own read message reveals when it was read. */
function MessageBubble({ item, mine, groupEnd, timeLabel, read, readTimeLabel, revealed, onPress, onLongPress, resolvePhoto, t }: { item: DirectMessage; mine: boolean; groupEnd: boolean; timeLabel: string; read: boolean; readTimeLabel: string | null; revealed: boolean; onPress?: () => void; onLongPress?: () => void; resolvePhoto: ResolvePhoto; t: TFunction<'messages'> }) {
  const media = item.attachments.filter((a) => a.mediaType !== 'file');
  const files = item.attachments.filter((a) => a.mediaType === 'file');
  const shape = groupEnd ? (mine ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md') : 'rounded-2xl';
  const showReceipt = mine && !item.deletedAt;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress} className={`gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      {item.deletedAt ? (
        <View className={`max-w-[80%] px-3.5 py-2.5 ${shape} ${mine ? 'bg-primary/50' : 'border border-border bg-card'}`}>
          <Text className={mine ? 'text-[13px] italic text-white/80' : 'text-[13px] italic text-muted'}>{t('deleted')}</Text>
        </View>
      ) : (
        <>
          {media.length ? (
            <View className={`w-56 max-w-[78%] flex-row flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
              {media.map((a) => <AttachmentImage key={a.mediaAssetId} attachment={a} resolvePhoto={resolvePhoto} single={media.length === 1} />)}
            </View>
          ) : null}
          {files.map((a) => <AttachmentFile key={a.mediaAssetId} attachment={a} resolvePhoto={resolvePhoto} mine={mine} />)}
          {item.body ? (
            <View className={`max-w-[80%] px-3.5 py-2 ${shape} ${mine ? 'bg-primary' : 'border border-border bg-card'}`}>
              <Text className={mine ? 'text-[14.5px] leading-[20px] text-white' : 'text-[14.5px] leading-[20px] text-foreground'}>{item.body}</Text>
            </View>
          ) : null}
        </>
      )}
      {groupEnd ? (
        <View className="flex-row items-center gap-1 px-1">
          {item.editedAt && !item.deletedAt ? <Text className="text-[10px] text-muted">{t('edited')}</Text> : null}
          <Text className="text-[10px] text-muted">{timeLabel}</Text>
          {showReceipt ? <Ionicons name={read ? 'checkmark-done' : 'checkmark'} size={15} color={read ? '#3B8FF3' : '#AEB4BE'} /> : null}
        </View>
      ) : null}
      {showReceipt && revealed && read && readTimeLabel ? (
        <Text className="px-1 text-[10px] font-semibold text-primary">{t('readAt', { time: readTimeLabel })}</Text>
      ) : null}
    </Pressable>
  );
}

function PendingAttachments({ value, onChange }: { value: PendingAttachment[]; onChange: (items: PendingAttachment[]) => void }) {
  return value.length ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
      {value.map((item) => <View key={item.id} className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-segment">
        {item.kind === 'image' ? <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} /> : <View className="h-full items-center justify-center px-1"><Ionicons name={item.kind === 'video' ? 'videocam' : 'document-text'} size={20} color="#606773" /><Text numberOfLines={1} className="w-full text-center text-[9px] text-muted">{item.fileName}</Text></View>}
        <Pressable onPress={() => onChange(value.filter((entry) => entry.id !== item.id))} className="absolute right-0 top-0 h-5 w-5 items-center justify-center rounded-bl-md bg-black/70"><Ionicons name="close" size={13} color="#FFFFFF" /></Pressable>
      </View>)}
    </ScrollView>
  ) : null;
}

async function pickAttachments(kind: 'image' | 'video' | 'file', current: PendingAttachment[], setCurrent: (items: PendingAttachment[]) => void, t: TFunction<'messages'>) {
  const remaining = MAX_ATTACHMENTS - current.length;
  if (!remaining) { Alert.alert(t('attachmentLimit', { count: MAX_ATTACHMENTS })); return; }
  let items: PendingAttachment[] = [];
  if (kind === 'file') {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    items = result.assets.map((asset, index) => ({ id: `${Date.now()}-${index}`, uri: asset.uri, fileName: asset.name, mimeType: asset.mimeType || mimeTypeFromName(asset.name), sizeBytes: asset.size ?? 0, kind: 'file' }));
  } else {
    if (kind === 'video') await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'image' ? 'images' : 'videos', allowsMultipleSelection: kind === 'image', selectionLimit: remaining, quality: 1 });
    if (result.canceled) return;
    items = result.assets.map((asset, index) => ({ id: `${Date.now()}-${index}`, uri: asset.uri, fileName: asset.fileName ?? `${kind}-${Date.now()}-${index}.${kind === 'image' ? 'jpg' : 'mp4'}`, mimeType: asset.mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4'), sizeBytes: asset.fileSize ?? 0, kind }));
  }
  if (items.length > remaining) Alert.alert(t('attachmentLimit', { count: MAX_ATTACHMENTS }));
  const accepted = items.slice(0, remaining).filter((item) => {
    if (item.sizeBytes <= (item.kind === 'video' ? VIDEO_LIMIT : FILE_LIMIT)) return true;
    Alert.alert(t('attachmentTooLarge'));
    return false;
  });
  setCurrent([...current, ...accepted]);
}

function openAttachmentActions(current: PendingAttachment[], setCurrent: (items: PendingAttachment[]) => void, t: TFunction<'messages'>) {
  Alert.alert(t('send'), undefined, [
    { text: t('attachPhoto'), onPress: () => void pickAttachments('image', current, setCurrent, t) },
    { text: t('attachVideo'), onPress: () => void pickAttachments('video', current, setCurrent, t) },
    { text: t('attachFile'), onPress: () => void pickAttachments('file', current, setCurrent, t) },
    { text: t('cancel'), style: 'cancel' },
  ]);
}

export function MessagesListScreen({ api, navigation, resolvePhoto }: { api: MessagesApi; navigation: Navigation; resolvePhoto: ResolvePhoto }) {
  const { t, i18n } = useTranslation('messages');
  const [search, setSearch] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['messages', 'threads'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.threads({ cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
      (row) => !q || messageIdentityParts(row.otherParticipant, t).searchText.toLocaleLowerCase().includes(q),
    );
  }, [query.data, search, t]);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={t('title')} subtitle={t('subtitle')} back={navigation.back} right={<Pressable onPress={navigation.newMessage} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80"><Ionicons name="create-outline" size={20} color="#FFFFFF" /></Pressable>} />
      <View className="mx-4 mb-2 mt-3 h-12 flex-row items-center gap-2.5 rounded-full bg-segment px-4">
        <Ionicons name="search" size={18} color="#89919E" />
        <TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor="#89919E" returnKeyType="search" className="h-12 flex-1 text-[15px] text-foreground" />
        {search.length ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#C4C9D1" /></Pressable> : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.threadId}
        contentContainerClassName={rows.length ? 'pb-8' : 'flex-1'}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#4D9FEC" />}
        onEndReached={() => query.hasNextPage && void query.fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<View className="flex-1 items-center justify-center gap-2 px-8"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-grape"><Ionicons name="chatbubbles" size={26} color="#7C5CD8" /></View><Text className="mt-2 text-base font-extrabold text-foreground">{t('noMessages')}</Text><Text className="text-center text-[13px] leading-5 text-muted">{t('noMessagesBody')}</Text><Pressable onPress={navigation.newMessage} className="mt-2 rounded-xl bg-primary px-4 py-3"><Text className="font-bold text-white">{t('newMessage')}</Text></Pressable></View>}
        renderItem={({ item }) => {
          const identity = messageIdentityParts(item.otherParticipant, t);
          const unread = item.unreadCount > 0;
          return (
            <Pressable onPress={() => navigation.openThread(item.threadId)} className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3.5 active:bg-segment">
              <Avatar person={item.otherParticipant} resolvePhoto={resolvePhoto} displayName={identity.primary} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-start gap-2">
                  <Text numberOfLines={1} className={unread ? 'flex-1 text-[15px] font-extrabold text-foreground' : 'flex-1 text-[15px] font-bold text-foreground'}>{identity.primary}</Text>
                  <Text className={unread ? 'text-[11px] font-bold text-primary' : 'text-[11px] font-semibold text-muted'}>{formatThreadTime(item.lastMessageAt, i18n.language)}</Text>
                </View>
                {identity.secondary ? <Text numberOfLines={1} className="text-[11px] text-muted">{identity.secondary}</Text> : null}
                <View className="mt-0.5 flex-row items-center gap-2">
                  {item.lastMessagePreview ? <Text numberOfLines={1} className={unread ? 'flex-1 text-[13px] font-semibold text-foreground' : 'flex-1 text-[13px] text-muted'}>{item.lastMessagePreview}</Text> : item.lastMessageKind && item.lastMessageKind !== 'text' ? <View className="flex-1 flex-row items-center gap-1"><Ionicons name={item.lastMessageKind === 'image' ? 'image-outline' : item.lastMessageKind === 'video' ? 'videocam-outline' : 'document-text-outline'} size={14} color="#89919E" /><Text numberOfLines={1} className={unread ? 'text-[13px] font-semibold text-foreground' : 'text-[13px] text-muted'}>{t(`previewKind.${item.lastMessageKind}`)}</Text></View> : <Text numberOfLines={1} className={unread ? 'flex-1 text-[13px] font-semibold text-foreground' : 'flex-1 text-[13px] text-muted'}>{t('deleted')}</Text>}
                  {unread ? <View className="min-w-5 items-center rounded-full bg-primary px-1.5 py-0.5"><Text className="text-[10px] font-extrabold text-white">{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#AEB4BE" />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

export function NewMessageScreen({ api, navigation, resolvePhoto, upload }: { api: MessagesApi; navigation: Navigation; resolvePhoto: ResolvePhoto; upload: MessageUpload }) {
  const { t } = useTranslation('messages');
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MessageContact | null>(null);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const contacts = useQuery({ queryKey: ['messages', 'contacts'], queryFn: () => api.contacts({}) });
  const start = useMutation({
    mutationFn: async () => {
      const attachmentMediaAssetIds: string[] = [];
      for (const attachment of attachments) attachmentMediaAssetIds.push(await upload({ uri: attachment.uri, centerId: selected!.centerId, mimeType: attachment.mimeType, fileName: attachment.fileName }));
      return api.startThread({ recipientUserId: selected!.userId, centerId: selected!.centerId, body: body.trim() || undefined, attachmentMediaAssetIds });
    },
    onSuccess: (detail) => navigation.openThread(detail.thread.threadId),
    onError: () => Alert.alert(t('sendError')),
  });
  const groups = contacts.data ?? [];
  const selectedIdentity = selected ? messageIdentityParts(selected, t) : null;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header title={selectedIdentity?.primary ?? t('chooseContact')} back={selected ? () => { setSelected(null); setBody(''); setAttachments([]); } : navigation.back} />
      {selected && selectedIdentity ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <Avatar person={selected} resolvePhoto={resolvePhoto} displayName={selectedIdentity.primary} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-extrabold text-foreground">{selectedIdentity.primary}</Text>
                <Text numberOfLines={1} className="text-[12px] text-muted">{selectedIdentity.secondary ?? t(`roles.${selected.role}`)}</Text>
              </View>
            </View>
            <TextInput autoFocus multiline value={body} onChangeText={setBody} maxLength={2000} placeholder={t('firstMessage')} placeholderTextColor="#89919E" textAlignVertical="top" className="mt-4 min-h-40 rounded-2xl border border-border bg-card p-4 text-[15px] leading-[21px] text-foreground" />
          </ScrollView>
          <View className="border-t border-border bg-card px-3 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
            <PendingAttachments value={attachments} onChange={setAttachments} />
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => openAttachmentActions(attachments, setAttachments, t)} className="h-12 w-12 items-center justify-center rounded-full bg-segment active:opacity-70"><Ionicons name="add" size={22} color="#606773" /></Pressable>
              <Pressable disabled={(!body.trim() && !attachments.length) || start.isPending} onPress={() => start.mutate()} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 disabled:opacity-40 active:opacity-90"><Ionicons name="send" size={16} color="#FFFFFF" /><Text className="text-base font-extrabold text-white">{start.isPending ? t('sending') : t('send')}</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => group.centerId}
          contentContainerClassName={groups.length ? 'p-4 pb-8' : 'flex-1'}
          ListEmptyComponent={<View className="flex-1 items-center justify-center gap-2 px-8"><Ionicons name="people-outline" size={34} color="#89919E" /><Text className="font-extrabold text-foreground">{t('noContacts')}</Text><Text className="text-center text-[13px] text-muted">{t('noContactsBody')}</Text></View>}
          renderItem={({ item: group }) => (
            <View className="mb-5">
              <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">{group.label}</Text>
              {group.contacts.map((person) => {
                const identity = messageIdentityParts(person, t);
                return (
                  <Pressable key={`${person.centerId}:${person.userId}`} onPress={() => setSelected(person)} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-segment">
                    <Avatar person={person} resolvePhoto={resolvePhoto} displayName={identity.primary} />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-extrabold text-foreground">{identity.primary}</Text>
                      <Text numberOfLines={1} className="text-[12px] text-muted">{identity.secondary ?? t(`roles.${person.role}`)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#AEB4BE" />
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export function ConversationScreen({ api, navigation, threadId, currentUserId, resolvePhoto, upload }: { api: MessagesApi; navigation: Navigation; threadId: string; currentUserId: string; resolvePhoto: ResolvePhoto; upload: MessageUpload }) {
  const { t, i18n } = useTranslation('messages');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  // Editing an existing message reuses the composer; `revealedId` is the message
  // whose read time is currently shown (tap a read message to reveal it).
  const [editing, setEditing] = useState<{ id: string; original: string } | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['messages', 'thread', threadId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.thread({ threadId, cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const thread = query.data?.pages[0]?.thread;
  const otherLastReadAt = thread?.otherLastReadAt ?? null;
  const identity = thread ? messageIdentityParts(thread.otherParticipant, t) : null;
  // Newest first: the natural order for an inverted chat list, so the screen
  // opens at the latest message and new arrivals appear at the bottom.
  const messages = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => [...page.messages].reverse()),
    [query.data],
  );
  useEffect(() => {
    if (!query.data) return;
    void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    void queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
  }, [query.data, queryClient]);
  const appendToCache = (message: DirectMessage) => {
    queryClient.setQueryData<InfiniteData<ThreadDetail, string | null>>(
      ['messages', 'thread', threadId],
      (data) => {
        const first = data?.pages[0];
        if (!data || !first) return data;
        if (data.pages.some((page) => page.messages.some((item) => item.id === message.id))) return data;
        return { ...data, pages: [{ ...first, messages: [...first.messages, message] }, ...data.pages.slice(1)] };
      },
    );
  };
  const send = useMutation({
    mutationFn: async (draft: { body?: string; attachments: PendingAttachment[] }) => {
      const attachmentMediaAssetIds: string[] = [];
      for (const attachment of draft.attachments) attachmentMediaAssetIds.push(await upload({ uri: attachment.uri, centerId: thread!.centerId, mimeType: attachment.mimeType, fileName: attachment.fileName }));
      return api.send({ threadId, body: draft.body, attachmentMediaAssetIds });
    },
    onMutate: () => { setBody(''); setAttachments([]); },
    onSuccess: (message) => {
      appendToCache(message);
      void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    },
    onError: (_error, draft) => {
      setBody(draft.body ?? '');
      setAttachments(draft.attachments);
      Alert.alert(t('uploadFailed'), t('retry'));
    },
  });
  const remove = useMutation({
    mutationFn: (messageId: string) => api.deleteMessage({ messageId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
  const edit = useMutation({
    mutationFn: (vars: { messageId: string; body: string }) => api.editMessage(vars),
    onSuccess: () => {
      setEditing(null);
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => Alert.alert(t('editFailed')),
  });
  const confirmDelete = (messageId: string) => Alert.alert(t('deleteTitle'), t('deleteBody'), [{ text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => remove.mutate(messageId) }]);
  const startEdit = (message: DirectMessage) => {
    setEditing({ id: message.id, original: message.body ?? '' });
    setAttachments([]);
    setBody(message.body ?? '');
    setRevealedId(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    setBody('');
  };
  // Long-press your own message: text-only messages sent within the edit window
  // can be edited; any of your own messages can be deleted.
  const openMessageActions = (message: DirectMessage) => {
    const canEdit = !message.deletedAt && message.attachments.length === 0 && Boolean(message.body) && withinEditWindow(message.createdAt);
    const buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [];
    if (canEdit) buttons.push({ text: t('edit'), onPress: () => startEdit(message) });
    buttons.push({ text: t('delete'), style: 'destructive', onPress: () => confirmDelete(message.id) });
    buttons.push({ text: t('cancel'), style: 'cancel' });
    Alert.alert(t('messageOptions'), undefined, buttons);
  };
  const saveEdit = () => {
    const text = body.trim();
    if (!editing || !text || text === editing.original || edit.isPending) return;
    edit.mutate({ messageId: editing.id, body: text });
  };
  const pendingDraft = send.isPending ? send.variables : null;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="min-h-14 flex-row items-center gap-3 border-b border-border bg-card px-4 py-2">
        <Pressable onPress={navigation.back} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full active:bg-segment">
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </Pressable>
        {thread ? <Avatar person={thread.otherParticipant} resolvePhoto={resolvePhoto} displayName={identity?.primary} size={38} /> : null}
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-extrabold text-foreground">{identity?.primary ?? t('title')}</Text>
          {identity?.secondary ? <Text numberOfLines={1} className="text-[11px] text-muted">{identity.secondary}</Text> : null}
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0} className="flex-1">
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-4"
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={pendingDraft ? (
            <View className="mt-3 items-end gap-1">
              {pendingDraft.attachments.length ? <Text className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/60 px-3.5 py-2 text-[12px] text-white/90">{t(`previewKind.${pendingDraft.attachments[0]!.kind}`)}</Text> : null}
              {pendingDraft.body ? <View className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/60 px-3.5 py-2"><Text className="text-[14.5px] leading-[20px] text-white">{pendingDraft.body}</Text></View> : null}
              <Text className="px-1 text-[10px] text-muted">{t('sending')}</Text>
            </View>
          ) : null}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="my-3" color="#4D9FEC" /> : null}
          renderItem={({ item, index }) => {
            const mine = item.senderUserId === currentUserId;
            const older = messages[index + 1];
            const newer = messages[index - 1];
            const showDate = older ? dayKey(older.createdAt) !== dayKey(item.createdAt) : !query.hasNextPage;
            const groupStart = !older || older.senderUserId !== item.senderUserId || showDate;
            const groupEnd = !newer || newer.senderUserId !== item.senderUserId || dayKey(newer.createdAt) !== dayKey(item.createdAt);
            const read = mine && !item.deletedAt && Boolean(otherLastReadAt) && item.createdAt <= otherLastReadAt!;
            return (
              <View className={groupStart ? 'mt-3' : 'mt-0.5'}>
                {showDate ? <View className="my-3 items-center"><Text className="rounded-full bg-segment px-3 py-1 text-[11px] font-semibold text-muted">{formatDate(item.createdAt, i18n.language)}</Text></View> : null}
                <MessageBubble
                  item={item}
                  mine={mine}
                  groupEnd={groupEnd}
                  timeLabel={formatTime(item.createdAt, i18n.language)}
                  read={read}
                  readTimeLabel={otherLastReadAt ? formatTime(otherLastReadAt, i18n.language) : null}
                  revealed={revealedId === item.id}
                  onPress={read ? () => setRevealedId((current) => (current === item.id ? null : item.id)) : undefined}
                  onLongPress={mine && !item.deletedAt ? () => openMessageActions(item) : undefined}
                  resolvePhoto={resolvePhoto}
                  t={t}
                />
              </View>
            );
          }}
        />
        <View className="border-t border-border bg-card" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
          {editing ? (
            <View className="flex-row items-center gap-2.5 border-b border-border px-4 py-2">
              <Ionicons name="pencil" size={16} color="#3B8FF3" />
              <View className="min-w-0 flex-1">
                <Text className="text-[12px] font-extrabold text-primary">{t('editing')}</Text>
                <Text numberOfLines={1} className="text-[12px] text-muted">{editing.original}</Text>
              </View>
              <Pressable onPress={cancelEdit} hitSlop={8}><Ionicons name="close" size={20} color="#89919E" /></Pressable>
            </View>
          ) : (
            <PendingAttachments value={attachments} onChange={setAttachments} />
          )}
          <View className="flex-row items-end gap-2 px-3 pt-2">
            {editing ? null : <Pressable onPress={() => openAttachmentActions(attachments, setAttachments, t)} className="h-10 w-10 items-center justify-center rounded-full bg-segment active:opacity-70"><Ionicons name="add" size={22} color="#606773" /></Pressable>}
            <TextInput multiline value={body} onChangeText={setBody} maxLength={2000} placeholder={t('messagePlaceholder')} placeholderTextColor="#89919E" className="max-h-28 min-h-10 flex-1 rounded-3xl bg-segment px-4 py-2.5 text-[15px] text-foreground" />
            {editing ? (
              (() => { const dirty = body.trim().length > 0 && body.trim() !== editing.original && !edit.isPending; return (
                <Pressable disabled={!dirty} onPress={saveEdit} className={`h-10 w-10 items-center justify-center rounded-full ${dirty ? 'bg-primary active:opacity-80' : 'bg-segment'}`}><Ionicons name="checkmark" size={20} color={dirty ? '#FFFFFF' : '#AEB4BE'} /></Pressable>
              ); })()
            ) : (
              <Pressable disabled={(!body.trim() && !attachments.length) || send.isPending} onPress={() => { const text = body.trim(); if (text || attachments.length) send.mutate({ body: text || undefined, attachments }); }} className={`h-10 w-10 items-center justify-center rounded-full ${(body.trim() || attachments.length) && !send.isPending ? 'bg-primary active:opacity-80' : 'bg-segment'}`}><Ionicons name="send" size={17} color={(body.trim() || attachments.length) && !send.isPending ? '#FFFFFF' : '#AEB4BE'} /></Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function dayKey(value: string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatThreadTime(value: string | null, locale: string) { if (!value) return ''; const date = new Date(value); return dayKey(value) === dayKey(new Date().toISOString()) ? formatTime(value, locale) : new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'Asia/Tashkent' }).format(date); }
function sizeLabel(bytes: number | null) { if (bytes === null) return ''; return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
// Mirrors the server's 48h edit window so the Edit action doesn't appear on
// messages the API would reject.
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;
function withinEditWindow(createdAt: string) { return Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS; }
function mimeTypeFromName(name: string) { const lower = name.toLowerCase(); return lower.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : lower.endsWith('.doc') ? 'application/msword' : 'application/pdf'; }

const UTI_BY_MIME: Record<string, string> = {
  'application/pdf': 'com.adobe.pdf',
  'application/msword': 'com.microsoft.word.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'org.openxmlformats.wordprocessingml.document',
  'image/jpeg': 'public.jpeg',
  'image/png': 'public.png',
  'video/mp4': 'public.mpeg-4',
  'video/quicktime': 'com.apple.quicktime-movie',
};

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

/** A cache-safe local filename: the media asset id keeps it unique and stable,
 *  the original extension keeps the OS opener happy. */
function localFileName(mediaAssetId: string, fileName: string | null, mimeType: string | null) {
  const fromName = fileName?.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  const ext = fromName ?? (mimeType ? EXT_BY_MIME[mimeType] ?? '' : '');
  return `${mediaAssetId}${ext}`;
}

/** Download an attachment to the cache and hand it to the OS open/share sheet
 *  (open in Files/Preview, save, or share). Falls back to opening the signed URL
 *  in the browser when native sharing isn't available. Both thread participants
 *  are authorized server-side, so this works for sender and recipient alike. */
async function openAttachment(params: { url: string; mediaAssetId: string; fileName: string | null; mimeType: string | null }) {
  const target = `${FileSystem.cacheDirectory ?? ''}${localFileName(params.mediaAssetId, params.fileName, params.mimeType)}`;
  const { uri } = await FileSystem.downloadAsync(params.url, target);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: params.mimeType ?? undefined,
      dialogTitle: params.fileName ?? undefined,
      UTI: params.mimeType ? UTI_BY_MIME[params.mimeType] : undefined,
    });
  } else {
    await Linking.openURL(params.url);
  }
}

function messageIdentityParts(person: IdentityPerson, t: TFunction<'messages'>): IdentityParts {
  const context = person.parentContext;
  if (!context) {
    const role = person.role ? t(`roles.${person.role}`) : null;
    const secondary = [role, person.classLabel].filter(Boolean).join(' · ') || null;
    return {
      primary: person.displayName,
      secondary,
      searchText: [person.displayName, secondary].filter(Boolean).join(' '),
    };
  }
  const relationship = context.relationship.trim().toLocaleLowerCase();
  const relationshipKey = relationship === 'father' ? 'dad' : relationship === 'mother' ? 'mom' : relationship;
  const fallback = relationship ? relationship.replace(/^./, (letter) => letter.toLocaleUpperCase()) : t('relationships.guardian', { defaultValue: 'Guardian' });
  const relationshipLabel = t(`relationships.${relationshipKey}` as 'relationships.guardian', { defaultValue: fallback });
  const primary = `${context.childName} · ${relationshipLabel}`;
  const secondary = `${context.className} · ${person.displayName}`;
  return { primary, secondary, searchText: `${primary} ${secondary}` };
}
