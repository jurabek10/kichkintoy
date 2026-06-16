import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChildRow } from '@/components/child-row';
import { StackHeader } from '@/components/stack-header';
import { Loader } from '@/components/ui/loader';
import { account } from '@/constants/data';
import { colors } from '@/constants/theme';
import { useChildren } from '@/data/parent';
import { useAuth } from '@/lib/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ChildrenScreen() {
  const router = useRouter();
  const { t } = useTranslation(['account', 'nav', 'common', 'app']);
  const { data: children, isPending } = useChildren();
  const { signOut } = useAuth();

  const goToFindCenter = () => router.push('/find-center');

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const menu: { key: string; label: string; icon: IoniconName; onPress?: () => void }[] = [
    { key: 'invitations', label: t('menu.invitations'), icon: 'person-add-outline' },
    { key: 'notifications', label: t('menu.notifications'), icon: 'notifications-outline' },
    { key: 'language', label: t('menu.language'), icon: 'language-outline', onPress: () => router.push('/language') },
    { key: 'support', label: t('menu.support'), icon: 'chatbubble-ellipses-outline' },
    { key: 'help', label: t('menu.help'), icon: 'headset-outline' },
    { key: 'signOut', label: t('menu.signOut'), icon: 'log-out-outline', onPress: handleSignOut },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={account.username} left="close" />

      <View className="flex-row justify-center gap-12 pb-4">
        <Link href="/profile-settings" asChild>
          <Pressable className="flex-row items-center gap-2">
            <Ionicons name="settings-sharp" size={18} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">{t('myInfo')}</Text>
          </Pressable>
        </Link>
        <Pressable onPress={goToFindCenter} className="flex-row items-center gap-2">
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text className="text-[15px] font-semibold text-white">{t('addChild')}</Text>
        </Pressable>
      </View>

      {isPending ? (
        <View className="flex-1 bg-background">
          <Loader />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="pt-4">
          {children.map((child, index) => (
            <View key={child.id}>
              <ChildRow
                child={child}
                avatarAction={index === 0 ? 'gear' : 'none'}
                memoriesLabel={t('viewMemories')}
                addLabel={t('addAffiliation')}
                onAddAffiliation={goToFindCenter}
              />
              {child.className ? (
                <Link href="/(tabs)" asChild>
                  <Pressable className="mx-4 mb-2 mt-1 flex-row items-center justify-between rounded-md bg-[#79B6F7] px-4 py-3">
                    <View>
                      <Text className="text-base font-bold text-white">
                        {child.centerName ?? ''}
                      </Text>
                      <Text className="mt-0.5 text-[13px] text-white/95">
                        {t('childClass', { ns: 'app', name: child.className })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                  </Pressable>
                </Link>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bottom menu grid */}
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
