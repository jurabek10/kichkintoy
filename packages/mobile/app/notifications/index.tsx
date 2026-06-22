import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { colors } from '@/constants/theme';
import {
  type NotificationItem,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/data/notifications';
import { routeForNotification } from '@/lib/notification-routes';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

function Badge({ label, tone = 'info' }: { label: string; tone?: 'info' | 'warning' }) {
  return (
    <View className={cn('rounded-full px-2 py-0.5', tone === 'warning' ? 'bg-sunshine' : 'bg-sky')}>
      <Text className={cn('text-[11px] font-extrabold', tone === 'warning' ? 'text-sunshine-ink' : 'text-sky-ink')}>
        {label}
      </Text>
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
  onMarkRead,
}: {
  notification: NotificationItem;
  onPress: () => void;
  onMarkRead: () => void;
}) {
  const { t } = useTranslation('notifications');
  const unread = !notification.readAt;

  return (
    <Pressable
      onPress={onPress}
      className={cn('border-b border-border bg-card px-4 py-4', unread && 'bg-sky/30')}>
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-sky">
          <Ionicons name="notifications" size={18} color="#3E8FE0" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="flex-shrink text-[15px] font-bold text-foreground">{notification.title}</Text>
            {unread ? <Badge label={t('badges.new')} /> : null}
            {notification.priority !== 'normal' ? (
              <Badge label={t(`priority.${notification.priority}`)} tone="warning" />
            ) : null}
          </View>
          {notification.body ? (
            <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-muted">
              {notification.body}
            </Text>
          ) : null}
          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Text className="text-xs font-semibold text-muted">{notification.dateLabel}</Text>
            {unread ? (
              <Pressable
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  onMarkRead();
                }}>
                <Text className="text-xs font-extrabold text-primary">{t('actions.markRead')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    } finally {
      setRefreshing(false);
    }
  }

  async function openNotification(notification: NotificationItem) {
    if (!notification.readAt) await markRead.mutateAsync(notification.id);
    const route = routeForNotification(notification);
    if (route) router.push(route);
  }

  const hasNotifications = notifications.data.length > 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="border-b border-border bg-card">
        <ScreenHeader title={t('title')} back />
        <View className="items-end px-4 pb-3">
          <Pressable
            disabled={!hasNotifications || markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
            className={cn(
              'flex-row items-center gap-1.5 rounded-full px-3 py-2',
              hasNotifications ? 'bg-sky' : 'bg-segment',
            )}>
            <Ionicons name="checkmark-done" size={16} color={hasNotifications ? '#3E8FE0' : colors.textMuted} />
            <Text className={cn('text-xs font-extrabold', hasNotifications ? 'text-sky-ink' : 'text-muted')}>
              {t('actions.markAllRead')}
            </Text>
          </Pressable>
        </View>
      </View>

      {notifications.isPending ? (
        <Loader />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          {!hasNotifications ? (
            <View className="p-4">
              <EmptyState
                icon="notifications-outline"
                title={t('empty.title')}
                body={t('empty.body')}
              />
            </View>
          ) : (
            notifications.data.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onPress={() => void openNotification(notification)}
                onMarkRead={() => markRead.mutate(notification.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
