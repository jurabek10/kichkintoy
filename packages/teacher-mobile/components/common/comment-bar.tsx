import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { uploadMedia } from '@/lib/upload';

const MAX_ATTACHMENTS = 4;
const IMAGE_OR_FILE_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

type PendingAttachment = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'file';
};

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

type CommentBarProps = {
  placeholder: string;
  accentColor: string;
  centerId: string;
  onSubmit?: (text: string, attachmentMediaAssetIds: string[]) => void | Promise<void>;
};

export function CommentBar({ placeholder, accentColor, centerId, onSubmit }: CommentBarProps) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !sending;

  function addAttachments(items: PendingAttachment[]) {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (items.length > remaining) Alert.alert(t('comments.attachmentLimit', { count: MAX_ATTACHMENTS }));
    const accepted = items.slice(0, remaining).filter((item) => {
      const max = item.kind === 'video' ? VIDEO_LIMIT : IMAGE_OR_FILE_LIMIT;
      if (item.sizeBytes > max) {
        Alert.alert(t('comments.attachmentTooLarge'));
        return false;
      }
      return true;
    });
    setAttachments((current) => [...current, ...accepted]);
  }

  async function pickMedia(kind: 'image' | 'video') {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert(t('comments.attachmentLimit', { count: MAX_ATTACHMENTS }));
      return;
    }
    if (kind === 'video') await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? 'images' : 'videos',
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
      quality: 1,
    });
    if (result.canceled) return;
    addAttachments(result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `${kind}-${Date.now()}-${index}.${kind === 'image' ? 'jpg' : 'mp4'}`,
      mimeType: asset.mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      sizeBytes: asset.fileSize ?? 0,
      kind,
    })));
  }

  async function pickFile() {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert(t('comments.attachmentLimit', { count: MAX_ATTACHMENTS }));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    addAttachments(result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType || (asset.name.toLowerCase().endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : asset.name.toLowerCase().endsWith('.doc') ? 'application/msword' : 'application/pdf'),
      sizeBytes: asset.size ?? 0,
      kind: 'file' as const,
    })));
  }

  async function handleSend() {
    if (!canSend) return;
    try {
      setSending(true);
      const ids: string[] = [];
      for (const attachment of attachments) {
        ids.push(await uploadMedia({
          uri: attachment.uri,
          centerId,
          mimeType: attachment.mimeType,
          fileName: attachment.fileName,
          purpose: 'comment',
        }));
      }
      await onSubmit?.(text.trim(), ids);
      setText('');
      setAttachments([]);
    } catch {
      Alert.alert(t('comments.uploadFailed'), t('comments.retry'));
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="border-t border-border bg-card px-4 pt-2" style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}>
      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-2">
          {attachments.map((item) => (
            <View key={item.id} className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-segment">
              {item.kind === 'image' ? <Image source={{ uri: item.uri }} className="h-full w-full" /> : (
                <View className="h-full items-center justify-center px-1">
                  <Ionicons name={item.kind === 'video' ? 'videocam' : 'document-text'} size={20} color={colors.textSecondary} />
                  <Text numberOfLines={1} className="mt-0.5 w-full text-center text-[9px] text-muted">{item.fileName}</Text>
                </View>
              )}
              <Pressable onPress={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))} className="absolute right-0 top-0 h-5 w-5 items-center justify-center rounded-bl-md bg-black/70">
                <Ionicons name="close" size={13} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <TextInput className="py-2 text-[15px] text-foreground" placeholder={placeholder} placeholderTextColor={colors.textMuted} value={text} onChangeText={setText} multiline maxLength={2000} />
      <View className="flex-row items-center gap-4 pt-1">
        <Pressable accessibilityLabel={t('comments.addPhoto')} onPress={() => pickMedia('image')}><Ionicons name="image-outline" size={22} color={colors.textSecondary} /></Pressable>
        <Pressable accessibilityLabel={t('comments.addVideo')} onPress={() => pickMedia('video')}><Ionicons name="videocam-outline" size={22} color={colors.textSecondary} /></Pressable>
        <Pressable accessibilityLabel={t('comments.addFile')} onPress={pickFile}><Ionicons name="attach" size={22} color={colors.textSecondary} /></Pressable>
        <View className="flex-1" />
        <Pressable hitSlop={8} disabled={!canSend} accessibilityState={{ disabled: !canSend }} onPress={handleSend}>
          {sending ? <ActivityIndicator size="small" color={accentColor} /> : <Ionicons name="send" size={22} color={canSend ? accentColor : colors.textMuted} />}
        </Pressable>
      </View>
    </View>
  );
}
