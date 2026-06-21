import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoticeListItem } from '@/components/notice/notice-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import { useNotices } from '@/data/notices';
import { queryKeys } from '@/lib/query-keys';

export default function NoticesScreen() {
  const { t } = useTranslation(['nav', 'notices']);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: notices, isPending } = useNotices();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notices.parentList });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-extrabold text-foreground">{t('items.notices', { ns: 'nav' })}</Text>
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
      ) : notices.length === 0 ? (
        <ScrollView
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          <EmptyState
            icon="megaphone-outline"
            title={t('empty.parentTitle', { ns: 'notices' })}
            body={t('empty.parentBody', { ns: 'notices' })}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          {notices.map((notice) => (
            <NoticeListItem key={notice.id} notice={notice} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
