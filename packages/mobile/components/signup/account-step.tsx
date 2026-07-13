import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Linking, Pressable, Text, View } from 'react-native';

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
  const [telegram, setTelegram] = useState<{ nonce: string; expired: boolean } | null>(null);
  const polling = useRef(false);

  async function pollTelegram() {
    if (!telegram || polling.current || telegram.expired) return;
    polling.current = true;
    try {
      const result = await orpc.auth.telegramVerifyPoll({ nonce: telegram.nonce });
      if (result.status === 'verified') {
        setTelegram(null);
        update({
          fullName: fullName.trim(),
          phoneNumber: result.phoneNumber,
          phoneVerificationToken: result.verificationToken,
        });
        next();
      }
      if (result.status === 'expired') setTelegram((current) => current ? { ...current, expired: true } : current);
    } catch { /* transient network errors retry on the next interval */ }
    finally { polling.current = false; }
  }

  useEffect(() => {
    if (!telegram || telegram.expired) return;
    void pollTelegram();
    const interval = setInterval(() => void pollTelegram(), 2000);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void pollTelegram(); });
    return () => { clearInterval(interval); appState.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegram?.nonce, telegram?.expired]);

  const startTelegram = useMutation({
    mutationFn: () => orpc.auth.telegramVerifyStart({}),
    onSuccess: async (result) => {
      setTelegram({ nonce: result.nonce, expired: false });
      await Linking.openURL(result.deepLink);
    },
    onError: () => setError(t('telegram.startError')),
  });

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
        <>
          <PrimaryButton
            label={sendCode.isPending ? t('signup.sending') : t('signup.sendCode')}
            loading={sendCode.isPending}
            disabled={fullName.trim().length === 0 || phoneNumber.trim().length < 6}
            onPress={() => sendCode.mutate()}
          />

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs font-semibold uppercase text-muted">{t('telegram.or')}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {telegram ? (
            <View className="items-center gap-3 rounded-2xl border border-border bg-card p-4">
              {telegram.expired ? (
                <>
                  <Text className="text-center text-sm text-muted">{t('telegram.expired')}</Text>
                  <PrimaryButton label={t('telegram.tryAgain')} onPress={() => startTelegram.mutate()} />
                </>
              ) : (
                <>
                  <ActivityIndicator color="#229ED9" />
                  <Text className="text-center text-sm text-muted">{t('telegram.verifyWaiting')}</Text>
                </>
              )}
              <Pressable onPress={() => setTelegram(null)} hitSlop={8}>
                <Text className="font-semibold text-muted">{t('actions.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              disabled={fullName.trim().length === 0 || startTelegram.isPending}
              onPress={() => startTelegram.mutate()}
              className={`items-center rounded-xl border py-3.5 ${fullName.trim().length === 0 ? 'border-border' : 'border-[#229ED9]'}`}>
              <Text className={`font-bold ${fullName.trim().length === 0 ? 'text-muted' : 'text-[#229ED9]'}`}>
                {t('telegram.verifyPhone')}
              </Text>
            </Pressable>
          )}
        </>
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
