import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useProfile, type Profile } from '@/data/profile';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  last,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View className={cn('flex-row items-center gap-3 bg-card px-4 py-3.5', !last && 'border-b border-border')}>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-foreground">{label}</Text>
        <Text className="mt-0.5 text-[12px] text-muted">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E7E9ED', true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function NotificationsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useTranslation('profile');
  const queryClient = useQueryClient();
  const initial = profile.notificationSettings;

  const [push, setPush] = useState(initial.pushEnabled);
  const [sms, setSms] = useState(initial.smsEnabled);
  const [start, setStart] = useState(initial.quietHoursStart ?? '');
  const [end, setEnd] = useState(initial.quietHoursEnd ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      orpc.profile.updateNotificationSettings({
        pushEnabled: push,
        smsEnabled: sms,
        quietHoursStart: start || null,
        quietHoursEnd: end || null,
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.profile.me, (current: Profile | undefined) =>
        current ? { ...current, notificationSettings: settings } : current,
      );
      router.back();
    },
    onError: () => setError(t('errors.saveFailed')),
  });

  function submit() {
    setError(null);
    if ((start && !TIME_RE.test(start)) || (end && !TIME_RE.test(end))) {
      setError(t('notifications.quietHoursError'));
      return;
    }
    save.mutate();
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('notifications.title')} />
      <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 pb-10">
        <Text className="mb-4 text-[13px] leading-5 text-muted">{t('notifications.subtitle')}</Text>

        <View className="overflow-hidden rounded-2xl border border-border">
          <ToggleRow label={t('notifications.push')} hint={t('notifications.pushHint')} value={push} onValueChange={setPush} />
          <ToggleRow label={t('notifications.sms')} hint={t('notifications.smsHint')} value={sms} onValueChange={setSms} last />
        </View>

        <Text className="mb-2 ml-1 mt-6 text-[12px] font-bold uppercase tracking-wide text-muted">
          {t('notifications.quietHours')}
        </Text>
        <View className="rounded-2xl border border-border bg-card p-4">
          <Text className="text-[12px] text-muted">{t('notifications.quietHoursHint')}</Text>
          <View className="mt-3 flex-row items-center gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-[12px] text-muted">{t('notifications.from')}</Text>
              <TextInput
                value={start}
                onChangeText={setStart}
                placeholder="22:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                placeholderTextColor={colors.textMuted}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[16px] text-foreground"
              />
            </View>
            <Text className="mt-5 text-muted">–</Text>
            <View className="flex-1 gap-1">
              <Text className="text-[12px] text-muted">{t('notifications.to')}</Text>
              <TextInput
                value={end}
                onChangeText={setEnd}
                placeholder="07:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                placeholderTextColor={colors.textMuted}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[16px] text-foreground"
              />
            </View>
          </View>
        </View>

        {error ? <Text className="mt-3 text-[13px] font-semibold text-coral-ink">{error}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={save.isPending}
          className={cn(
            'mt-6 h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary',
            save.isPending && 'opacity-60',
          )}>
          {save.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text className="text-[15px] font-bold text-white">{t('actions.save')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation('profile');
  const { data: profile, isPending } = useProfile();

  if (isPending || !profile) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
        <StackHeader title={t('notifications.title')} />
        <View className="flex-1 bg-background">
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  return <NotificationsForm profile={profile} />;
}
