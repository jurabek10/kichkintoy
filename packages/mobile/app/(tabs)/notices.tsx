import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoticeListItem } from '@/components/notice-list-item';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useNotices } from '@/data/parent';

export default function NoticesScreen() {
  const { t } = useTranslation('nav');
  const { data: notices, isPending } = useNotices();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-extrabold text-foreground">{t('items.notices')}</Text>
        <View className="flex-row items-center gap-5">
          <Pressable hitSlop={8}>
            <Ionicons name="search" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable hitSlop={8}>
            <Ionicons name="filter" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {isPending ? (
        <Loader />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
          {notices.map((notice) => (
            <NoticeListItem key={notice.id} notice={notice} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
