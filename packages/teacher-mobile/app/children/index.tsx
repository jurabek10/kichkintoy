import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { SettingRow, SettingsGroupLabel } from '@/components/profile/setting-row';
import { StackHeader } from '@/components/common/stack-header';
import { colors } from '@/constants/theme';
import { useTeacherClasses } from '@/data/teacher';
import { useProfile } from '@/data/profile';
import { useAuth } from '@/lib/auth';

export default function MyPageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('profile');
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: classes, isPending: classesLoading } = useTeacherClasses();

  const fullName = profile?.fullName ?? session?.user.fullName ?? '';
  const role = profile?.role ?? 'teacher';
  const centerName = profile?.centerName ?? session?.membership.centerName ?? '';
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
        <ProfileAvatar
          avatarMediaAssetId={profile?.avatarMediaAssetId ?? null}
          name={fullName}
          size={92}
          showCamera
          onPress={() => router.push('/profile-settings')}
        />
        <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
          {fullName}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-white/20 px-3 py-1">
            <Text className="text-[12px] font-bold text-white">{t(`roles.${role}`)}</Text>
          </View>
          {centerName ? (
            <Text className="text-[13px] text-white/85" numberOfLines={1}>
              {centerName}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-10">
        <SettingsGroupLabel>{t('hub.account')}</SettingsGroupLabel>
        <View className="overflow-hidden rounded-2xl border border-border">
          <SettingRow
            icon="person-outline"
            tone="sky"
            label={t('hub.editProfile')}
            hint={t('hub.editProfileHint')}
            onPress={() => router.push('/profile-settings')}
          />
          <SettingRow
            icon="call-outline"
            tone="mint"
            label={t('fields.phone')}
            value={profile?.phone ?? '—'}
            onPress={() => router.push('/profile-settings/phone')}
          />
          <SettingRow
            icon="lock-closed-outline"
            tone="grape"
            label={t('actions.changePassword')}
            hint={t('hub.passwordHint')}
            onPress={() => router.push('/profile-settings/password')}
            last
          />
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
            tone="bubblegum"
            label={t('notifications.title')}
            hint={t('hub.notificationsHint')}
            onPress={() => router.push('/profile-settings/notifications')}
            last
          />
        </View>

        <SettingsGroupLabel>{t('hub.myClasses')}</SettingsGroupLabel>
        <View className="overflow-hidden rounded-2xl border border-border">
          {classesLoading ? (
            <View className="bg-card px-4 py-5">
              <Text className="text-[13px] text-muted">…</Text>
            </View>
          ) : classes.length === 0 ? (
            <View className="bg-card px-4 py-5">
              <Text className="text-[13px] text-muted">{t('hub.noClasses')}</Text>
            </View>
          ) : (
            classes.map((klass, index) => (
              <Pressable
                key={klass.id}
                onPress={() => router.push({ pathname: '/class/[id]', params: { id: klass.id } })}
                className={`flex-row items-center gap-3 bg-card px-4 py-3.5 active:bg-pill ${
                  index < classes.length - 1 ? 'border-b border-border' : ''
                }`}>
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-grape">
                  <Text className="font-extrabold text-grape-ink">
                    {klass.name.trim().charAt(0).toUpperCase() || '·'}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
                    {klass.name}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {t('hub.childrenCount', { count: klass.childCount })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>

        <View className="mt-5 overflow-hidden rounded-2xl border border-border">
          <SettingRow icon="log-out-outline" tone="coral" label={t('hub.signOut')} onPress={confirmSignOut} danger last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
