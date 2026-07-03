import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { StackHeader } from '@/components/common/stack-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useApplyProfile, useProfile, type Profile } from '@/data/profile';
import { orpc } from '@/lib/orpc';
import { uploadMedia } from '@/lib/upload';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address';
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        className="rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-foreground"
        style={multiline ? { minHeight: 88, textAlignVertical: 'top' } : undefined}
      />
      {hint ? <Text className="text-[12px] text-muted">{hint}</Text> : null}
    </View>
  );
}

function EditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const applyProfile = useApplyProfile();
  const isTeacher = profile.teacher !== null;

  const [fullName, setFullName] = useState(profile.fullName);
  const [username, setUsername] = useState(profile.username ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [bio, setBio] = useState(profile.teacher?.bio ?? '');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let next = await orpc.profile.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        preferredLanguage: profile.preferredLanguage,
      });
      if (isTeacher) {
        next = await orpc.profile.updateTeacherProfile({ bio: bio.trim() ? bio.trim() : null });
      }
      return next;
    },
    onSuccess: (next) => {
      applyProfile(next);
      router.back();
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  async function pickAvatar() {
    if (!profile.centerId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    setAvatarBusy(true);
    try {
      const mediaAssetId = await uploadMedia({
        uri: asset.uri,
        centerId: profile.centerId,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'avatar.jpg',
        purpose: 'user_avatar',
      });
      applyProfile(await orpc.profile.updateAvatar({ mediaAssetId }));
    } catch {
      setError(t('errors.uploadFailed'));
    } finally {
      setAvatarBusy(false);
    }
  }

  const removeAvatar = useMutation({
    mutationFn: () => orpc.profile.removeAvatar({}),
    onSuccess: applyProfile,
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader
        title={t('profile.title')}
        right={{ label: t('actions.save'), onPress: () => (save.isPending ? undefined : save.mutate()) }}
      />
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 p-4 pb-10">
          {/* Avatar */}
          <View className="items-center gap-3 rounded-2xl border border-border bg-card py-6">
            <ProfileAvatar
              avatarMediaAssetId={profile.avatarMediaAssetId}
              name={fullName}
              size={92}
              showCamera
              busy={avatarBusy}
              onPress={pickAvatar}
              fallbackClassName="bg-sky"
              fallbackTextClassName="text-sky-ink"
            />
            <View className="flex-row items-center gap-4">
              <Pressable onPress={pickAvatar} disabled={avatarBusy} hitSlop={6}>
                <Text className="text-[14px] font-bold text-primary">{t('actions.changePhoto')}</Text>
              </Pressable>
              {profile.avatarMediaAssetId ? (
                <Pressable onPress={() => removeAvatar.mutate()} disabled={removeAvatar.isPending} hitSlop={6}>
                  <Text className="text-[14px] font-semibold text-coral-ink">{t('actions.removePhoto')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Field label={t('fields.fullName')} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <Field label={t('fields.username')} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Field
            label={t('fields.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('fields.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {isTeacher ? (
            <Field
              label={t('fields.bio')}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 280))}
              placeholder={t('fields.bioPlaceholder')}
              multiline
              hint={t('fields.bioHint', { count: 280 - bio.length })}
            />
          ) : null}

          {error ? <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const { data: profile, isPending } = useProfile();

  if (isPending || !profile) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
        <StackHeader title={t('profile.title')} />
        <View className="flex-1 bg-background">
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  return <EditForm profile={profile} />;
}
