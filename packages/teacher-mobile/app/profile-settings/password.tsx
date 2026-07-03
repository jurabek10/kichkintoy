import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { colors } from '@/constants/theme';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

function SecureField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
        className="rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-foreground"
      />
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: () => orpc.profile.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.back(), 700);
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  function submit() {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('security.mismatch'));
      return;
    }
    change.mutate();
  }

  const canSubmit = !!currentPassword && newPassword.length >= 8 && !change.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('security.title')} />
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4 pb-10">
          <Text className="text-[13px] leading-5 text-muted">{t('security.subtitle')}</Text>

          <SecureField label={t('security.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} />
          <SecureField label={t('security.newPassword')} value={newPassword} onChangeText={setNewPassword} />
          <SecureField label={t('security.confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} />

          <Text className="text-[12px] text-muted">{t('security.requirement')}</Text>

          {error ? <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            className={cn(
              'mt-2 h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary',
              !canSubmit && 'opacity-50',
            )}>
            {change.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <Text className="text-[15px] font-bold text-white">
              {done ? t('toasts.passwordChanged') : t('actions.changePassword')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
