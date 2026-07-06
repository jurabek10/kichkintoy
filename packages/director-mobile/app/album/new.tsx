import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AlbumVisibility } from '@kichkintoy/shared';
import { AlbumMediaPicker, type AlbumMediaItem } from '@/components/album/album-media-picker';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/ui/card';
import { colors } from '@/constants/theme';
import { useAlbumAudience, useCreateAlbum } from '@/data/albums';
import { useCenterId } from '@/data/teacher';
import { cn } from '@/lib/utils';

const GRAPE = '#7C5CD8';

/** A checkable row used for class and child selection. */
function CheckRow({
  label,
  sublabel,
  checked,
  onPress,
}: {
  label: string;
  sublabel?: string | null;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-md border px-3 py-2.5',
        checked ? 'border-grape-ink bg-grape/50' : 'border-border bg-background',
      )}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={20}
        color={checked ? GRAPE : colors.textMuted}
      />
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-foreground">{label}</Text>
        {sublabel ? <Text className="text-[11px] text-muted">{sublabel}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function AlbumComposerScreen() {
  const { t } = useTranslation('albums');
  const router = useRouter();
  const centerId = useCenterId();

  const [caption, setCaption] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<AlbumVisibility>('class');
  const [childIds, setChildIds] = useState<string[]>([]);
  const [media, setMedia] = useState<AlbumMediaItem[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audience = useAlbumAudience();
  const create = useCreateAlbum();

  const visibleChildren = useMemo(() => {
    if (classIds.length === 0) return audience.data.children;
    return audience.data.children.filter((child) =>
      child.classId ? classIds.includes(child.classId) : false,
    );
  }, [audience.data.children, classIds]);

  const mediaUploading = media.some((m) => m.uploading);

  function toggleClass(id: string) {
    const willSelect = !classIds.includes(id);
    setClassIds((current) =>
      willSelect ? [...current, id] : current.filter((x) => x !== id),
    );
    // Deselecting a class drops any tagged children who belonged to it.
    if (!willSelect) {
      setChildIds((current) =>
        current.filter((childId) => {
          const child = audience.data.children.find((c) => c.id === childId);
          return child?.classId !== id;
        }),
      );
    }
  }

  function toggleChild(id: string) {
    setChildIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError(t('validation.centerRequired'));
    if (classIds.length === 0) return setError(t('validation.classRequired'));
    if (visibility === 'tagged_children' && childIds.length === 0) {
      return setError(t('validation.childRequired'));
    }
    const mediaAssetIds = media.filter((m) => m.id).map((m) => m.id as string);
    if (publish && !caption.trim() && mediaAssetIds.length === 0) {
      return setError(t('validation.publishRequired'));
    }
    create.mutate(
      {
        centerId,
        caption: caption.trim(),
        visibility,
        classIds,
        childIds: visibility === 'tagged_children' ? childIds : [],
        mediaAssetIds,
        allowComments,
        publish,
      },
      {
        onSuccess: (post) => router.replace({ pathname: '/album/[id]', params: { id: post.id } }),
        onError: () => setError(t('upload.failed')),
      },
    );
  }

  const busy = create.isPending || mediaUploading;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('composer.newTitle')} back />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-3 p-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Caption */}
          <Card className="gap-2">
            <Text className="text-[13px] font-semibold text-muted">{t('composer.caption')}</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              maxLength={4000}
              multiline
              placeholder={t('composer.captionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              className="min-h-[110px] rounded-md border border-border bg-background p-3 text-[15px] leading-6 text-foreground"
            />
          </Card>

          {/* Media */}
          <AlbumMediaPicker centerId={centerId} value={media} onChange={setMedia} onError={setError} />

          {/* Classes */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.classes')}</Text>
            {audience.isPending ? (
              <ActivityIndicator size="small" color={GRAPE} />
            ) : audience.data.classes.length === 0 ? (
              <Text className="text-[13px] text-muted">{t('composer.noClasses')}</Text>
            ) : (
              <View className="gap-1.5">
                {audience.data.classes.map((klass) => (
                  <CheckRow
                    key={klass.id}
                    label={klass.name}
                    checked={classIds.includes(klass.id)}
                    onPress={() => toggleClass(klass.id)}
                  />
                ))}
              </View>
            )}
          </Card>

          {/* Visibility */}
          <Card className="gap-3">
            <Text className="text-base font-extrabold text-foreground">{t('composer.visibility')}</Text>
            {(['class', 'tagged_children'] as AlbumVisibility[]).map((value) => {
              const active = visibility === value;
              const isClass = value === 'class';
              return (
                <Pressable
                  key={value}
                  onPress={() => setVisibility(value)}
                  className={cn(
                    'flex-row items-start gap-3 rounded-md border p-3',
                    active ? 'border-grape-ink bg-grape/50' : 'border-border bg-background',
                  )}>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? GRAPE : colors.textMuted}
                  />
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-foreground">
                      {t(isClass ? 'visibility.class' : 'visibility.taggedChildren')}
                    </Text>
                    <Text className="text-[12px] leading-4 text-muted">
                      {t(isClass ? 'visibility.classDescription' : 'visibility.taggedChildrenDescription')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {visibility === 'tagged_children' ? (
              <View className="gap-1.5">
                {visibleChildren.length === 0 ? (
                  <Text className="text-[13px] text-muted">{t('composer.chooseClassForChildren')}</Text>
                ) : (
                  visibleChildren.map((child) => (
                    <CheckRow
                      key={child.id}
                      label={child.name}
                      sublabel={child.className}
                      checked={childIds.includes(child.id)}
                      onPress={() => toggleChild(child.id)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </Card>

          {/* Allow comments */}
          <Card>
            <View className="flex-row items-center gap-3">
              <Ionicons name="chatbubbles-outline" size={18} color={colors.textSecondary} />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">{t('composer.allowComments')}</Text>
                <Text className="text-[12px] text-muted">{t('composer.allowCommentsDescription')}</Text>
              </View>
              <Switch
                value={allowComments}
                onValueChange={setAllowComments}
                trackColor={{ true: GRAPE, false: colors.textMuted }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>

          {error ? (
            <View className="rounded-md bg-coral px-3 py-2.5">
              <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              disabled={busy}
              onPress={() => save(false)}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2">
              <Ionicons name="save-outline" size={18} color={colors.textPrimary} />
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-foreground">
                {t('composer.saveDraft')}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => save(true)}
              style={{ backgroundColor: GRAPE }}
              className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-2">
              {create.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFFFFF" />
              )}
              <Text numberOfLines={1} className="shrink text-[14px] font-bold text-white">
                {t('composer.publish')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
