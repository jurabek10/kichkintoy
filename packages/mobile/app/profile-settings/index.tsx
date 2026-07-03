import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useApplyProfile, useProfile, type Profile } from '@/data/profile';
import { orpc } from '@/lib/orpc';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address';
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
        className="rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-foreground"
      />
    </View>
  );
}

function EditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const applyProfile = useApplyProfile();

  const [fullName, setFullName] = useState(profile.fullName);
  const [username, setUsername] = useState(profile.username ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      orpc.profile.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        preferredLanguage: profile.preferredLanguage,
      }),
    onSuccess: (next) => {
      applyProfile(next);
      router.back();
    },
    onError: () => setError(t('errors.saveFailed')),
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
