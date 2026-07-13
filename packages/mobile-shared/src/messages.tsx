/// <reference path="./nativewind-types.d.ts" />
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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

function Header({ title, back, right }: { title: string; back?: () => void; right?: ReactNode }) {
  return (
    <View className="min-h-14 flex-row items-center gap-3 border-b border-border bg-card px-4 py-2">
      {back ? (
        <Pressable onPress={back} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full active:bg-segment">
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </Pressable>
      ) : null}
      <Text numberOfLines={2} className="flex-1 text-lg font-extrabold text-foreground">{title}</Text>
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

function MessageAttachmentItem({ attachment, resolvePhoto }: { attachment: MessageAttachment; resolvePhoto: ResolvePhoto }) {
  const { t } = useTranslation('messages');
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['media', 'download', attachment.mediaAssetId],
    queryFn: () => resolvePhoto(attachment.mediaAssetId),
    staleTime: 240_000,
  });
  const url = query.data;
  if (attachment.mediaType === 'file') {
    return (
      <Pressable disabled={!url} onPress={() => url && Linking.openURL(url)} className="mt-2 max-w-full flex-row items-center gap-2 self-start rounded-lg border border-border bg-segment px-3 py-2">
        <Ionicons name="document-text-outline" size={20} color="#606773" />
        <View className="max-w-[210px]">
          <Text numberOfLines={1} ellipsizeMode="middle" className="text-xs font-semibold text-foreground">{attachment.fileName ?? t('previewKind.file')}</Text>
          <Text className="text-[10px] text-muted">{sizeLabel(attachment.sizeBytes)}</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <>
      <Pressable disabled={!url} onPress={() => attachment.mediaType === 'image' ? setOpen(true) : url && Linking.openURL(url)} className="relative aspect-square w-[48%] overflow-hidden rounded-lg bg-segment">
        {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {attachment.mediaType === 'video' ? <View className="absolute inset-0 items-center justify-center bg-black/20"><Ionicons name="play-circle" size={36} color="#FFFFFF" /></View> : null}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/95 p-4">
          {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
          <Ionicons name="close-circle" size={34} color="#FFFFFF" style={{ position: 'absolute', right: 16, top: 48 }} />
        </Pressable>
      </Modal>
    </>
  );
}

function MessageAttachments({ attachments, resolvePhoto }: { attachments: MessageAttachment[]; resolvePhoto: ResolvePhoto }) {
  if (!attachments.length) return null;
  const media = attachments.filter((item) => item.mediaType !== 'file');
  const files = attachments.filter((item) => item.mediaType === 'file');
  return <View>{media.length ? <View className="flex-row flex-wrap gap-1.5">{media.map((item) => <MessageAttachmentItem key={item.mediaAssetId} attachment={item} resolvePhoto={resolvePhoto} />)}</View> : null}{files.map((item) => <MessageAttachmentItem key={item.mediaAssetId} attachment={item} resolvePhoto={resolvePhoto} />)}</View>;
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
      <Header title={t('title')} back={navigation.back} right={<Pressable onPress={navigation.newMessage} className="h-9 w-9 items-center justify-center rounded-full bg-primary"><Ionicons name="create" size={18} color="#FFFFFF" /></Pressable>} />
      <View className="m-4 h-11 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Ionicons name="search" size={18} color="#89919E" />
        <TextInput value={search} onChangeText={setSearch} placeholder={t('search')} placeholderTextColor="#89919E" className="h-11 flex-1 text-[15px] text-foreground" />
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 p-4">
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <Avatar person={selected} resolvePhoto={resolvePhoto} displayName={selectedIdentity.primary} />
            <View className="min-w-0 flex-1">
              <Text className="font-extrabold text-foreground">{selectedIdentity.primary}</Text>
              <Text className="text-[12px] text-muted">{selectedIdentity.secondary ?? t(`roles.${selected.role}`)}</Text>
            </View>
          </View>
          <TextInput autoFocus multiline value={body} onChangeText={setBody} maxLength={2000} placeholder={t('firstMessage')} placeholderTextColor="#89919E" textAlignVertical="top" className="mt-4 min-h-32 rounded-2xl border border-border bg-card p-4 text-[15px] text-foreground" />
          <PendingAttachments value={attachments} onChange={setAttachments} />
          <View className="mt-3 flex-row items-center gap-3"><Pressable onPress={() => openAttachmentActions(attachments, setAttachments, t)} className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card"><Ionicons name="add" size={22} color="#606773" /></Pressable><Pressable disabled={(!body.trim() && !attachments.length) || start.isPending} onPress={() => start.mutate()} className="flex-1 items-center rounded-xl bg-primary py-3.5 disabled:opacity-40"><Text className="text-base font-extrabold text-white">{start.isPending ? t('sending') : t('send')}</Text></Pressable></View>
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
                  <Pressable key={`${person.centerId}:${person.userId}`} onPress={() => setSelected(person)} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
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
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const query = useInfiniteQuery({
    queryKey: ['messages', 'thread', threadId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.thread({ threadId, cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const thread = query.data?.pages[0]?.thread;
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
  const confirmDelete = (messageId: string) => Alert.alert(t('deleteTitle'), t('deleteBody'), [{ text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => remove.mutate(messageId) }]);
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
            <View className="mt-2 items-end">
              <View className="max-w-[82%] rounded-2xl rounded-br-md bg-primary/70 px-3.5 py-2.5">
                {pendingDraft.body ? <Text className="text-[14px] leading-5 text-white">{pendingDraft.body}</Text> : null}
                {pendingDraft.attachments.length ? <Text className="text-[12px] text-white/80">{t(`previewKind.${pendingDraft.attachments[0]!.kind}`)}</Text> : null}
                <Text className="mt-1 text-right text-[9px] text-white/60">{t('sending')}</Text>
              </View>
            </View>
          ) : null}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="my-3" color="#4D9FEC" /> : null}
          renderItem={({ item, index }) => {
            const mine = item.senderUserId === currentUserId;
            const older = messages[index + 1];
            const showDate = older ? dayKey(older.createdAt) !== dayKey(item.createdAt) : !query.hasNextPage;
            return (
              <View className="mt-2">
                {showDate ? <Text className="my-3 text-center text-[11px] font-bold text-muted">{formatDate(item.createdAt, i18n.language)}</Text> : null}
                <Pressable onLongPress={mine && !item.deletedAt ? () => confirmDelete(item.id) : undefined} className={mine ? 'items-end' : 'items-start'}>
                  <View className={mine ? 'max-w-[82%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5' : 'max-w-[82%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5'}>
                    {item.deletedAt ? <Text className={mine ? 'italic text-white/70' : 'italic text-muted'}>{t('deleted')}</Text> : <><MessageAttachments attachments={item.attachments} resolvePhoto={resolvePhoto} />{item.body ? <Text className={mine ? `${item.attachments.length ? 'mt-2 ' : ''}text-[14px] leading-5 text-white` : `${item.attachments.length ? 'mt-2 ' : ''}text-[14px] leading-5 text-foreground`}>{item.body}</Text> : null}</>}
                    <Text className={mine ? 'mt-1 text-right text-[9px] text-white/60' : 'mt-1 text-right text-[9px] text-muted'}>{formatTime(item.createdAt, i18n.language)}</Text>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
        <View className="border-t border-border bg-card"><PendingAttachments value={attachments} onChange={setAttachments} /><View className="flex-row items-end gap-2 p-3"><Pressable onPress={() => openAttachmentActions(attachments, setAttachments, t)} className="h-11 w-11 items-center justify-center rounded-full border border-border"><Ionicons name="add" size={22} color="#606773" /></Pressable><TextInput multiline value={body} onChangeText={setBody} maxLength={2000} placeholder={t('messagePlaceholder')} placeholderTextColor="#89919E" className="max-h-28 min-h-11 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground" /><Pressable disabled={(!body.trim() && !attachments.length) || send.isPending} onPress={() => { const text = body.trim(); if (text || attachments.length) send.mutate({ body: text || undefined, attachments }); }} className="h-11 w-11 items-center justify-center rounded-full bg-primary disabled:opacity-40"><Ionicons name="send" size={18} color="#FFFFFF" /></Pressable></View></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function dayKey(value: string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' }).format(new Date(value)); }
function formatThreadTime(value: string | null, locale: string) { if (!value) return ''; const date = new Date(value); return dayKey(value) === dayKey(new Date().toISOString()) ? formatTime(value, locale) : new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'Asia/Tashkent' }).format(date); }
function sizeLabel(bytes: number | null) { if (bytes === null) return ''; return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function mimeTypeFromName(name: string) { const lower = name.toLowerCase(); return lower.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : lower.endsWith('.doc') ? 'application/msword' : 'application/pdf'; }

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
