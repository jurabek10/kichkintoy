import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/stack-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { account } from '@/constants/data';
import { colors } from '@/constants/theme';
import { useChildProfile, useCurrentChild } from '@/data/parent';

function ListRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-border bg-card px-4 py-4">
      <Text className="text-[15px] text-foreground">{label}</Text>
      <View className="flex-row items-center gap-1">
        {value ? <Text className="text-[15px] text-muted">{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['app', 'nav', 'account']);
  const child = useCurrentChild();
  const { data: profile, isPending } = useChildProfile();

  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState(profile.gender);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader
        title={t('myInfo', { ns: 'account' })}
        leftLabel={account.username}
        right={{ label: t('actions.save'), onPress: () => router.back() }}
      />

      {isPending || child.isPending ? (
        <View className="flex-1 bg-background">
          <Loader />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-background">
          {/* Profile form */}
          <View className="flex-row gap-4 bg-card p-4">
            <View className="items-center gap-2">
              <Avatar uri={child.data.photo} size={72} />
              <Button label={t('signup.uploadPhoto')} />
            </View>

            <View className="flex-1 gap-3">
              <View className="flex-row items-center gap-3">
                <Text className="w-[70px] text-sm text-muted">{t('signup.childName')}</Text>
                <TextInput
                  className="flex-1 rounded-sm border border-border px-3 py-2 text-[15px] text-foreground"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View className="flex-row items-center gap-3">
                <Text className="w-[70px] text-sm text-muted">{t('signup.birthDate')}</Text>
                <Pressable className="flex-1 flex-row items-center justify-between rounded-sm border border-border px-3 py-2">
                  <Text className="text-[15px] text-foreground">{profile.birthDateLabel}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-3">
                <Text className="w-[70px] text-sm text-muted">{t('signup.gender')}</Text>
                <View className="flex-1 flex-row rounded-sm bg-segment p-[3px]">
                  {(['boy', 'girl'] as const).map((option) => {
                    const active = gender === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setGender(option)}
                        className={`flex-1 items-center rounded-[6px] py-2 ${active ? 'bg-card' : ''}`}>
                        <Text className={active ? 'text-sm font-bold text-foreground' : 'text-sm text-muted'}>
                          {t(`signup.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* List rows */}
          <ListRow
            label={t('signup.relationshipOptions.dad')}
            value={t(`signup.relationshipOptions.${profile.relationship}`)}
          />
          <Link href="/admission-documents" asChild>
            <Pressable>
              <ListRow label={t('items.documents', { ns: 'nav' })} />
            </Pressable>
          </Link>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
