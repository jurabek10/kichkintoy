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
import { useApplyProfile } from '@/data/profile';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

export default function ChangePhoneScreen() {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const applyProfile = useApplyProfile();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendCode = useMutation({
    mutationFn: () => orpc.auth.sendCode({ phoneNumber: phone.trim() }),
    onSuccess: (result) => {
      setError(null);
      setStep('code');
      setHint(result.debugCode ? t('phoneDialog.debugCode', { code: result.debugCode }) : t('phoneDialog.codeSent'));
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  const verifyAndSave = useMutation({
    mutationFn: async () => {
      const verified = await orpc.auth.verifyCode({ phoneNumber: phone.trim(), code: code.trim() });
      return orpc.profile.updatePhone({
        phoneNumber: verified.phoneNumber,
        phoneVerificationToken: verified.verificationToken,
      });
    },
    onSuccess: (next) => {
      applyProfile(next);
      router.back();
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('phoneDialog.title')} />
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4 pb-10">
          <Text className="text-[13px] leading-5 text-muted">{t('phoneDialog.description')}</Text>

          <View className="gap-1.5">
            <Text className="text-[13px] font-semibold text-muted">{t('phoneDialog.newPhone')}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              editable={step === 'phone'}
              keyboardType="phone-pad"
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.textMuted}
              className={cn(
                'rounded-xl border border-border px-3.5 py-3 text-[15px] text-foreground',
                step === 'code' ? 'bg-pill' : 'bg-card',
              )}
            />
          </View>

          {step === 'code' ? (
            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-muted">{t('phoneDialog.code')}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoFocus
                placeholderTextColor={colors.textMuted}
                className="rounded-xl border border-border bg-card px-3.5 py-3 text-[17px] tracking-[4px] text-foreground"
              />
              <Pressable onPress={() => sendCode.mutate()} disabled={sendCode.isPending} hitSlop={6} className="self-start">
                <Text className="text-[13px] font-semibold text-primary">{t('phoneDialog.resend')}</Text>
              </Pressable>
            </View>
          ) : null}

          {hint ? <Text className="text-[12px] text-muted">{hint}</Text> : null}
          {error ? <Text className="text-[13px] font-semibold text-coral-ink">{error}</Text> : null}

          {step === 'phone' ? (
            <Pressable
              onPress={() => sendCode.mutate()}
              disabled={!phone.trim() || sendCode.isPending}
              className={cn(
                'mt-2 h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary',
                (!phone.trim() || sendCode.isPending) && 'opacity-50',
              )}>
              {sendCode.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="text-[15px] font-bold text-white">{t('phoneDialog.sendCode')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => verifyAndSave.mutate()}
              disabled={!code.trim() || verifyAndSave.isPending}
              className={cn(
                'mt-2 h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary',
                (!code.trim() || verifyAndSave.isPending) && 'opacity-50',
              )}>
              {verifyAndSave.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="text-[15px] font-bold text-white">{t('phoneDialog.verify')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
