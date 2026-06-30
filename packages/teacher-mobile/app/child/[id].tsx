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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3 py-2.5">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('teacher');
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

  const genderLabel =
    child.gender === 'boy' ? t('child.boy') : child.gender === 'girl' ? t('child.girl') : t('child.none');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={child.name} back />
      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
        <Card className="items-center">
          <Avatar uri={child.photo} size={88} />
          <Text className="mt-3 text-xl font-extrabold text-foreground">{child.name}</Text>
          {child.ageLabel ? <Text className="mt-0.5 text-sm text-muted">{child.ageLabel}</Text> : null}
        </Card>

        <Card className="mt-3">
          {child.birthLabel ? <InfoRow label={t('child.birthday')} value={child.birthLabel} /> : null}
          <InfoRow label={t('child.gender')} value={genderLabel} />
          {child.className ? <InfoRow label={t('child.class')} value={child.className} /> : null}
        </Card>

        <Card className="mt-3">
          <Text className="mb-1 text-[13px] font-bold text-muted">{t('child.allergies')}</Text>
          <Text className="text-sm text-foreground">{child.allergies || t('child.none')}</Text>
          <View className="my-3 h-px bg-border" />
          <Text className="mb-1 text-[13px] font-bold text-muted">{t('child.medicalNotes')}</Text>
          <Text className="text-sm text-foreground">{child.medicalNotes || t('child.none')}</Text>
        </Card>

        <Text className="mb-2 mt-5 px-1 text-base font-extrabold text-foreground">
          {t('child.guardians')}
        </Text>
        {child.guardians.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted">{t('child.noGuardians')}</Text>
          </Card>
        ) : (
          <View className="gap-2">
            {child.guardians.map((guardian) => (
              <Card key={guardian.id} className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-sky">
                  <Ionicons name="person" size={20} color="#3E8FE0" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-foreground">{guardian.name}</Text>
                  <Text className="text-[13px] text-muted">
                    {guardian.relationship ?? ''}
                    {guardian.phone ? `${guardian.relationship ? ' · ' : ''}${guardian.phone}` : ''}
                  </Text>
                </View>
                {guardian.phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${guardian.phone}`)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-mint">
                    <Ionicons name="call" size={18} color={colors.primary} />
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
