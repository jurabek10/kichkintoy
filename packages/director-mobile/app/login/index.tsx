import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/common/language-switch';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';
import { cn } from '@/lib/utils';

export default function LoginScreen() {
  const { t } = useTranslation('app');
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

        {/* Footer */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-muted">{t('login.footerText')}</Text>
          <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
            <Text className="text-sm font-bold text-primary">{t('login.createAccount')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
