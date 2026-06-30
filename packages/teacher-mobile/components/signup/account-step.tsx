import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { orpc } from '@/lib/orpc';

import { useSignup } from './context';
import { Field, PrimaryButton } from './parts';

export function AccountStep() {
  const { t } = useTranslation('app');
  const { draft, update, next } = useSignup();
  const [fullName, setFullName] = useState(draft.fullName);
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const sendCode = useMutation({
    mutationFn: () => orpc.auth.sendCode({ phoneNumber: phoneNumber.trim() }),
    onSuccess: (res) => {
      setError(null);
      setDebugCode(res.debugCode ?? null);
    },
    onError: (err) => setError((err as { message?: string })?.message ?? 'Error'),
  });

  const verifyCode = useMutation({
    mutationFn: () => orpc.auth.verifyCode({ phoneNumber: phoneNumber.trim(), code: code.trim() }),
    onSuccess: (res) => {
      update({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneVerificationToken: res.verificationToken,
      });
      next();
    },
    onError: (err) => setError((err as { message?: string })?.message ?? 'Error'),
  });

  const codeSent = sendCode.isSuccess;

  return (
    <View className="gap-4">
      <View>
        <Text className="text-xl font-extrabold text-foreground">{t('signup.phoneTitle')}</Text>
        <Text className="mt-1 text-sm text-muted">{t('signup.phoneDescription')}</Text>
      </View>

      <Field
        label={t('signup.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <Field
        label={t('signup.phoneNumber')}
        value={phoneNumber}
        onChangeText={(v) => {
          setPhoneNumber(v);
          setError(null);
        }}
        keyboardType="phone-pad"
        placeholder="+998 90 123 45 67"
        editable={!codeSent}
      />

      {!codeSent ? (
        <PrimaryButton
          label={sendCode.isPending ? t('signup.sending') : t('signup.sendCode')}
          loading={sendCode.isPending}
          disabled={fullName.trim().length === 0 || phoneNumber.trim().length < 6}
          onPress={() => sendCode.mutate()}
        />
      ) : (
        <>
          <Field
            label={t('signup.verificationCode')}
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder={t('signup.codePlaceholder')}
          />
          {debugCode ? (
            <Text className="text-xs text-muted">{t('signup.demoCode', { code: debugCode })}</Text>
          ) : (
            <Text className="text-xs text-muted">{t('signup.codeHelper')}</Text>
          )}
          <PrimaryButton
            label={verifyCode.isPending ? t('signup.verifying') : t('actions.continue')}
            loading={verifyCode.isPending}
            disabled={code.trim().length < 4}
            onPress={() => verifyCode.mutate()}
          />
        </>
      )}

      {error ? <Text className="text-sm text-coral-ink">{error}</Text> : null}
    </View>
  );
}
