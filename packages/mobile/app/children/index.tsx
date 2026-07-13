import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { SettingRow, SettingsGroupLabel } from '@/components/profile/setting-row';
import { StackHeader } from '@/components/common/stack-header';
import { colors } from '@/constants/theme';
import { useParentChildren, useProfile } from '@/data/profile';
import { ageLabel } from '@/lib/date';
import { useAuth } from '@/lib/auth';

export default function MyPageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('profile');
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: children = [], isPending: childrenLoading } = useParentChildren();

  const fullName = profile?.fullName ?? session?.user.fullName ?? '';
  const role = profile?.role ?? 'parent';
  const languageLabel = t(`language.${i18n.language}`, { ns: 'common' });

  function confirmSignOut() {
    Alert.alert(t('hub.signOutConfirm'), t('hub.signOutConfirmBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('hub.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('title')} left="close" />

      {/* Hero — who you are */}
      <View className="items-center gap-2.5 px-6 pb-6 pt-1">
        <ProfileAvatar name={fullName} size={84} />
        <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
          {fullName}
        </Text>
        <View className="rounded-full bg-white/20 px-3 py-1">
          <Text className="text-[12px] font-bold text-white">{t(`roles.${role}`)}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-10">
        {/* Children — the heart of a parent's page */}
        <SettingsGroupLabel>{t('hub.myChildren')}</SettingsGroupLabel>
        <View className="overflow-hidden rounded-2xl border border-border">
          {childrenLoading ? (
            <View className="bg-card px-4 py-5">
              <Text className="text-[13px] text-muted">…</Text>
            </View>
          ) : (
            <>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() =>
                    router.push({ pathname: '/profile-settings/child', params: { childId: child.id } })
                  }
                  className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 active:bg-pill">
                  <ProfileAvatar
                    avatarMediaAssetId={child.photoMediaAssetId}
                    photoUrl={child.photoUrl}
                    name={child.name}
                    size={44}
                    fallbackClassName="bg-sky"
                    fallbackTextClassName="text-sky-ink"
                  />
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>
                      {child.name}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                      {[child.dateOfBirth ? ageLabel(child.dateOfBirth) : null, child.centerName, child.className]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
              <SettingRow
                icon="add-circle-outline"
                tone="mint"
                label={t('hub.addChild')}
                hint={t('hub.addChildHint')}
                onPress={() => router.push('/find-center')}
                last
              />
            </>
          )}
        </View>

        <SettingsGroupLabel>{t('hub.account')}</SettingsGroupLabel>
        <View className="overflow-hidden rounded-2xl border border-border">
          <SettingRow icon="people-outline" tone="mint" label={t('family.title')} hint={t('family.subtitle')} onPress={() => router.push('/profile-settings/family' as never)} />
          <SettingRow
            icon="person-outline"
            tone="sky"
            label={t('hub.editProfile')}
            hint={t('hub.editProfileHint')}
            onPress={() => router.push('/profile-settings')}
          />
          {profile?.hasPassword === false ? (
            // Telegram-born accounts: no password, no SMS-verifiable phone — show how they sign in.
            <SettingRow
              icon="paper-plane-outline"
              tone="sky"
              label={t('security.telegramOnlyTitle')}
              hint={profile.telegramUsername ? `@${profile.telegramUsername}` : t('security.telegramOnly')}
              last
            />
          ) : (
            <>
              <SettingRow
                icon="call-outline"
                tone="grape"
                label={t('fields.phone')}
                value={profile?.phone ?? '—'}
                onPress={() => router.push('/profile-settings/phone')}
              />
              <SettingRow
                icon="lock-closed-outline"
                tone="bubblegum"
                label={t('actions.changePassword')}
                hint={t('hub.passwordHint')}
                onPress={() => router.push('/profile-settings/password')}
                last
              />
            </>
          )}
        </View>

        <SettingsGroupLabel>{t('hub.preferences')}</SettingsGroupLabel>
        <View className="overflow-hidden rounded-2xl border border-border">
          <SettingRow
            icon="globe-outline"
            tone="sunshine"
            label={t('fields.language')}
            value={languageLabel}
            onPress={() => router.push('/language')}
          />
          <SettingRow
            icon="notifications-outline"
            tone="coral"
            label={t('notifications.title')}
            hint={t('hub.notificationsHint')}
            onPress={() => router.push('/profile-settings/notifications')}
            last
          />
        </View>

        <View className="mt-5 overflow-hidden rounded-2xl border border-border">
          <SettingRow icon="log-out-outline" tone="coral" label={t('hub.signOut')} onPress={confirmSignOut} danger last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
