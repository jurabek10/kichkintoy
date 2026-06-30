import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useTeacherClasses } from '@/data/teacher';
import { useAuth } from '@/lib/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTranslation(['teacher', 'account', 'nav']);
  const { session, signOut } = useAuth();
  const { data: classes, isPending } = useTeacherClasses();

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const fullName = session?.user.fullName ?? '';
  const initial = fullName.trim().charAt(0).toUpperCase() || '·';
  const centerName = session?.membership.centerName ?? '';

  const menu: { key: string; label: string; icon: IoniconName; onPress?: () => void }[] = [
    { key: 'notifications', label: t('menu.notifications', { ns: 'account' }), icon: 'notifications-outline', onPress: () => router.push('/notifications') },
    { key: 'language', label: t('menu.language', { ns: 'account' }), icon: 'language-outline', onPress: () => router.push('/language') },
    { key: 'signOut', label: t('menu.signOut', { ns: 'account' }), icon: 'log-out-outline', onPress: handleSignOut },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={fullName} left="close" />

      <View className="items-center gap-2 pb-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white/25">
          <Text className="text-2xl font-extrabold text-white">{initial}</Text>
        </View>
        <View className="rounded-full bg-white/20 px-3 py-1">
          <Text className="text-[13px] font-semibold text-white">{t('account.role')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-3">
        {centerName ? (
          <View className="flex-row items-center gap-3 rounded-lg bg-card p-4">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky">
              <Ionicons name="business" size={20} color="#3E8FE0" />
            </View>
            <View className="flex-1">
              <Text className="text-[12px] text-muted">{t('account.center')}</Text>
              <Text className="text-[15px] font-bold text-foreground">{centerName}</Text>
            </View>
          </View>
        ) : null}

        <Text className="mt-1 px-1 text-base font-extrabold text-foreground">
          {t('items.myClasses', { ns: 'nav' })}
        </Text>
        {isPending ? (
          <Loader />
        ) : (
          classes.map((klass) => (
            <Pressable
              key={klass.id}
              onPress={() => router.push({ pathname: '/class/[id]', params: { id: klass.id } })}
              className="flex-row items-center gap-3 rounded-lg bg-card p-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-grape">
                <Text className="font-extrabold text-grape-ink">
                  {klass.name.trim().charAt(0).toUpperCase() || '·'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-foreground">{klass.name}</Text>
                <Text className="text-[13px] text-muted">
                  {t('roster.childrenCount', { count: klass.childCount })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <View className="flex-row flex-wrap border-t border-border bg-card">
        {menu.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            className="w-1/3 flex-row items-center justify-center gap-2 py-4">
            <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            <Text className="text-sm text-foreground">{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
