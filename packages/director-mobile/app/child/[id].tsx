import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useChildProfile } from '@/data/teacher';

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row justify-between gap-3 py-2.5 ${last ? '' : 'border-b border-border'}`}>
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['teacher', 'app']);
  const { data: child, isPending } = useChildProfile(id ?? '');

  if (isPending) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <ScreenHeader title={t('child.title')} back />
        <Loader />
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <ScreenHeader title={t('child.title')} back />
      </SafeAreaView>
    );
  }

  const notProvided = t('child.notProvided');
  const genderLabel =
    child.gender === 'boy' ? t('child.boy') : child.gender === 'girl' ? t('child.girl') : notProvided;
  const active = child.status === 'active';

  // The header meta line: class · age · gender, skipping blanks.
  const meta = [child.className, child.ageLabel, genderLabel].filter(Boolean).join(' · ');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={child.name} back />
      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <Card className="items-center">
          <Avatar uri={child.photo} size={88} />
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="text-xl font-extrabold text-foreground">{child.name}</Text>
            <View className={`rounded-full px-2.5 py-0.5 ${active ? 'bg-mint' : 'bg-pill'}`}>
              <Text className={`text-[11px] font-bold ${active ? 'text-mint-ink' : 'text-muted'}`}>
                {active ? t('child.statusActive') : t('child.statusInactive')}
              </Text>
            </View>
          </View>
          {meta ? <Text className="mt-1 text-sm text-muted">{meta}</Text> : null}
        </Card>

        {/* Child information — mirrors the web detail fields. */}
        <Card className="mt-3">
          <InfoRow label={t('child.firstName')} value={child.firstName || notProvided} />
          <InfoRow label={t('child.lastName')} value={child.lastName || notProvided} />
          <InfoRow label={t('child.birthday')} value={child.birthLabel || notProvided} />
          <InfoRow label={t('child.gender')} value={genderLabel} />
          <InfoRow label={t('child.class')} value={child.className || notProvided} />
          <InfoRow label={t('child.joined')} value={child.joinedLabel || notProvided} last />
        </Card>

        {/* Health */}
        <Card className="mt-3">
          <Text className="mb-1 text-[13px] font-bold text-muted">{t('child.allergies')}</Text>
          <Text className="text-sm text-foreground">{child.allergies || t('child.none')}</Text>
          <View className="my-3 h-px bg-border" />
          <Text className="mb-1 text-[13px] font-bold text-muted">{t('child.medicalNotes')}</Text>
          <Text className="text-sm text-foreground">{child.medicalNotes || t('child.none')}</Text>
        </Card>

        {/* Guardians */}
        <Text className="mb-2 mt-5 px-1 text-base font-extrabold text-foreground">
          {t('child.guardians')}
        </Text>
        {child.guardians.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted">{t('child.noGuardians')}</Text>
          </Card>
        ) : (
          <View className="gap-2">
            {child.guardians.map((guardian) => {
              const relation = guardian.relationship
                ? t(`signup.relationshipOptions.${guardian.relationship}`, {
                    ns: 'app',
                    defaultValue: guardian.relationship,
                  })
                : '';
              const sub = [relation, guardian.phone].filter(Boolean).join(' · ');
              return (
                <Card key={guardian.id} className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-sky">
                    <Ionicons name="person" size={20} color="#3E8FE0" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[15px] font-bold text-foreground">{guardian.name}</Text>
                      {guardian.isPrimary ? (
                        <View className="rounded-full bg-sky px-2 py-0.5">
                          <Text className="text-[10px] font-bold uppercase text-sky-ink">
                            {t('child.primary')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {sub ? <Text className="mt-0.5 text-[13px] text-muted">{sub}</Text> : null}
                  </View>
                  {guardian.phone ? (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${guardian.phone}`)}
                      className="h-10 w-10 items-center justify-center rounded-full bg-mint">
                      <Ionicons name="call" size={18} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
