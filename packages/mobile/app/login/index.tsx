import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/common/language-switch';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

export default function LoginScreen() {
  const { t } = useTranslation('app');
  const router = useRouter();
  const { signIn, signInWithToken } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [telegram, setTelegram] = useState<{ nonce: string; deepLink: string; expired: boolean } | null>(null);
  const polling = useRef(false);

  async function pollTelegram() {
    if (!telegram || polling.current || telegram.expired) return;
    polling.current = true;
    try {
      const result = await orpc.auth.telegramLoginPoll({ nonce: telegram.nonce });
      if (result.status === 'approved') await signInWithToken(result.token);
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
  }, [telegram?.nonce, telegram?.expired]);

  const startTelegram = useMutation({
    mutationFn: () => orpc.auth.telegramLoginStart({}),
    onSuccess: async (result) => {
      setTelegram({ nonce: result.nonce, deepLink: result.deepLink, expired: false });
      await Linking.openURL(result.deepLink);
    },
    onError: () => setError(t('telegram.startError')),
  });

  const login = useMutation({
    mutationFn: () => orpc.auth.login({ username: username.trim(), password }),
    onSuccess: (response) => signIn(response),
    onError: (err) => setError((err as { message?: string })?.message ?? t('login.submit')),
  });

  const canSubmit = username.trim().length > 0 && password.length > 0 && !login.isPending;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <LanguageSwitch />
      </View>
      <View className="flex-1 justify-center px-6">
        {/* Brand */}
        <View className="mb-10 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-2xl font-extrabold text-white">K</Text>
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-foreground">{t('login.title')}</Text>
          <Text className="mt-1 text-center text-sm text-muted">{t('login.description')}</Text>
        </View>

        {telegram ? (
          <View className="items-center gap-4 rounded-2xl border border-border bg-card p-6">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#229ED9]/10">
              <Ionicons name="paper-plane" size={27} color="#229ED9" />
            </View>
            {telegram.expired ? (
              <>
                <Text className="text-center text-base font-bold text-foreground">{t('telegram.expired')}</Text>
                <Pressable onPress={() => { setTelegram(null); startTelegram.mutate(); }} className="w-full items-center rounded-md bg-primary py-3.5">
                  <Text className="font-bold text-white">{t('telegram.tryAgain')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator color="#229ED9" />
                <Text className="text-center text-sm text-muted">{t('telegram.waiting')}</Text>
                <Pressable onPress={() => Linking.openURL(telegram.deepLink)}><Text className="font-bold text-[#168AC0]">{t('telegram.openTelegram')}</Text></Pressable>
              </>
            )}
            <Pressable onPress={() => setTelegram(null)}><Text className="font-semibold text-muted">{t('actions.cancel')}</Text></Pressable>
          </View>
        ) : <>
        {/* Form */}
        <View className="gap-3">
          <TextInput
            className="rounded-md border border-border bg-card px-4 py-3 text-[15px] text-foreground"
            placeholder={t('login.username')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              setError(null);
            }}
          />
          <TextInput
            className="rounded-md border border-border bg-card px-4 py-3 text-[15px] text-foreground"
            placeholder={t('login.passwordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
          />

          {error ? <Text className="text-sm text-coral-ink">{error}</Text> : null}

          <Pressable
            disabled={!canSubmit}
            onPress={() => login.mutate()}
            className={cn('mt-2 items-center rounded-md py-3.5', canSubmit ? 'bg-primary' : 'bg-segment')}>
            {login.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className={cn('text-base font-bold', canSubmit ? 'text-white' : 'text-muted')}>
                {t('login.submit')}
              </Text>
            )}
          </Pressable>
        </View>

        <View className="my-5 flex-row items-center gap-3"><View className="h-px flex-1 bg-border" /><Text className="text-xs font-semibold text-muted">{t('telegram.or')}</Text><View className="h-px flex-1 bg-border" /></View>
        <Pressable disabled={startTelegram.isPending} onPress={() => startTelegram.mutate()} className="flex-row items-center justify-center gap-2 rounded-md border border-[#229ED9] py-3.5">
          {startTelegram.isPending ? <ActivityIndicator color="#229ED9" /> : <Ionicons name="paper-plane" size={18} color="#229ED9" />}
          <Text className="text-base font-bold text-[#168AC0]">{t('telegram.continue')}</Text>
        </Pressable>

        {/* Footer */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-muted">{t('login.footerText')}</Text>
          <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
            <Text className="text-sm font-bold text-primary">{t('login.createAccount')}</Text>
          </Pressable>
        </View>
        </>}
      </View>
    </SafeAreaView>
  );
}
