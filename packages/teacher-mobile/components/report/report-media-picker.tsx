import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { uploadMedia } from '@/lib/upload';

/** A picked photo/video. `id` is set once the upload completes; `uploading`
 *  marks the optimistic tile shown meanwhile. */
export type ReportMedia = {
  key: string;
  uri: string;
  type: 'image' | 'video';
  id?: string;
  uploading?: boolean;
};

const TILE = 76;
let counter = 0;
const nextKey = () => `m${Date.now()}-${counter++}`;

/**
 * Photos & videos for a report: pick from camera or gallery, upload straight to
 * storage, and show a thumbnail grid. Uploads are optimistic — a spinner tile
 * appears immediately and resolves to the real asset id.
 */
export function ReportMediaPicker({
  centerId,
  value,
  onChange,
  onError,
}: {
  centerId: string | null;
  value: ReportMedia[];
  onChange: Dispatch<SetStateAction<ReportMedia[]>>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation('reports');
  const insets = useSafeAreaInsets();
  const [sourceOpen, setSourceOpen] = useState(false);

  async function add(fromCamera: boolean) {
    setSourceOpen(false);
    if (!centerId) return onError(t('composer.centerIdMissing'));

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return onError(t('composer.mediaPermission'));

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 20 - value.length,
        });
    if (result.canceled) return;

    const picked: ReportMedia[] = result.assets.map((asset) => ({
      key: nextKey(),
      uri: asset.uri,
      type: asset.type === 'video' ? 'video' : 'image',
      uploading: true,
    }));
    onChange((prev) => [...prev, ...picked]);
    onError('');

    for (const item of picked) {
      const asset = result.assets.find((a) => a.uri === item.uri);
      try {
        const id = await uploadMedia({
          uri: item.uri,
          centerId,
          mimeType: asset?.mimeType ?? (item.type === 'video' ? 'video/mp4' : 'image/jpeg'),
          fileName: asset?.fileName ?? `${item.type}-${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
          purpose: 'daily_report',
        });
        onChange((prev) => prev.map((m) => (m.key === item.key ? { ...m, id, uploading: false } : m)));
      } catch {
        onChange((prev) => prev.filter((m) => m.key !== item.key));
        onError(t('composer.uploadFailed'));
      }
    }
  }

  return (
    <Card className="gap-3">
      <View>
        <Text className="text-base font-extrabold text-foreground">{t('composer.photosVideos')}</Text>
        <Text className="mt-0.5 text-[13px] leading-5 text-muted">{t('composer.mediaDescription')}</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {value.map((m) => (
          <View key={m.key} style={{ width: TILE, height: TILE }} className="overflow-hidden rounded-xl bg-pill">
            {m.type === 'video' ? (
              <View className="flex-1 items-center justify-center bg-foreground/80">
                <Ionicons name="videocam" size={22} color="#FFFFFF" />
              </View>
            ) : (
              <Image source={{ uri: m.uri }} style={{ width: TILE, height: TILE }} />
            )}
            {m.uploading ? (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <Pressable
                onPress={() => onChange((prev) => prev.filter((x) => x.key !== m.key))}
                hitSlop={6}
                className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/55">
                <Ionicons name="close" size={13} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        ))}

        {value.length < 20 ? (
          <Pressable
            onPress={() => setSourceOpen(true)}
            style={{ width: TILE, height: TILE }}
            className="items-center justify-center rounded-xl border border-dashed border-border bg-background">
            <Ionicons name="add" size={26} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={sourceOpen} transparent animationType="slide" onRequestClose={() => setSourceOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setSourceOpen(false)}>
          <Pressable
            className="rounded-t-3xl bg-card px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
            onPress={() => {}}>
            <View className="mb-2 items-center">
              <View className="h-1 w-10 rounded-full bg-segment" />
            </View>
            <SourceRow icon="camera-outline" label={t('composer.camera')} onPress={() => add(true)} />
            <SourceRow icon="images-outline" label={t('composer.gallery')} onPress={() => add(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

function SourceRow({
  icon,
  label,
  onPress,
}: {
  icon: 'camera-outline' | 'images-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-pill">
        <Ionicons name={icon} size={20} color={colors.textPrimary} />
      </View>
      <Text className="text-[15px] font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}
