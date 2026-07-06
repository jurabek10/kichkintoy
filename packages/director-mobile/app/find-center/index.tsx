import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/common/stack-header';
import { account } from '@/constants/data';
import { colors } from '@/constants/theme';

function Select({ label }: { label: string }) {
  return (
    <Pressable className="flex-1 flex-row items-center justify-between rounded-full bg-card px-4 py-3">
      <Text className="text-[15px] text-foreground">{label}</Text>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function FindCenterScreen() {
  const { t } = useTranslation('app');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-header-blue">
      <StackHeader title={t('signup.centerTitle')} leftLabel={account.username} />

      {/* Filters */}
      <View className="gap-3 bg-[#EDEFF2] p-4">
        <Text className="text-sm font-semibold text-primary">{t('signup.centerDescription')}</Text>
        <View className="flex-row gap-3">
          <Select label={t('signup.selectRegion')} />
          <Select label={t('signup.selectDistrict')} />
        </View>
        <View className="flex-row items-center gap-2 rounded-sm bg-[#E2E5E9] px-3 py-3">
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 p-0 text-[15px] text-foreground"
            placeholder={t('signup.kindergartenNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View className="flex-1 bg-card" />
    </SafeAreaView>
  );
}
