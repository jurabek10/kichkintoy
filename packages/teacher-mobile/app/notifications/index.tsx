import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
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
import { formatDayMonth, formatTime, localIsoDate, todayIsoDate } from '@/lib/date';
import { notificationVisual } from '@/lib/notification-visuals';
import { routeForNotification } from '@/lib/notification-routes';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const MUTED = '#AEB4BE';

type Bucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';
const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Shift a "YYYY-MM-DD" by whole days in local (Tashkent) calendar terms. */
function addDaysIso(iso: string, delta: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year!, month! - 1, day! + delta);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A short priority flag — urgent reads coral, high sunshine. */
function PriorityBadge({ priority }: { priority: NotificationItem['priority'] }) {
  const { t } = useTranslation('notifications');
  if (priority === 'normal') return null;
  const urgent = priority === 'urgent';
  return (
    <View className={cn('rounded-full px-2 py-0.5', urgent ? 'bg-coral' : 'bg-sunshine')}>
      <Text className={cn('text-[10px] font-extrabold', urgent ? 'text-coral-ink' : 'text-sunshine-ink')}>
        {t(`priority.${priority}`)}
      </Text>
    </View>
  );
}

function NotificationRow({
  notification,
  timeLabel,
  onPress,
}: {
  notification: NotificationItem;
  timeLabel: string;
  onPress: () => void;
}) {
  const unread = !notification.readAt;
  const visual = notificationVisual(notification);
  const routable = routeForNotification(notification) !== null;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-start gap-3 border-b border-border bg-card px-4 py-3.5 active:opacity-90',
        unread && 'border-l-[3px] border-l-sky-ink',
      )}>
      <View className={cn('h-10 w-10 items-center justify-center rounded-2xl', visual.tileClass)}>
        <Ionicons name={visual.icon} size={19} color={visual.ink} />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start gap-2">
          <Text
            numberOfLines={2}
            className={cn(
              'flex-1 text-[15px] leading-5 text-foreground',
              unread ? 'font-extrabold' : 'font-semibold',
            )}>
            {notification.title}
          </Text>
          {unread ? <View className="mt-1.5 h-2 w-2 rounded-full bg-sky-ink" /> : null}
        </View>

        {notification.body ? (
          <Text numberOfLines={2} className="mt-1 text-[13px] leading-5 text-muted">
            {notification.body}
          </Text>
        ) : null}

        <View className="mt-1.5 flex-row items-center gap-2">
          <Text className="text-[11px] font-semibold text-muted">{timeLabel}</Text>
          <PriorityBadge priority={notification.priority} />
        </View>
      </View>

      {routable ? (
        <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginTop: 10 }} />
      ) : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation('notifications');
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

  const items = notifications.data;
  const unreadCount = items.filter((n) => !n.readAt).length;

  // Bucket into Today / Yesterday / This week / Earlier. The list arrives
  // newest-first, so within each bucket order is preserved.
  const today = todayIsoDate();
  const yesterday = addDaysIso(today, -1);
  const weekAgo = addDaysIso(today, -7);

  function bucketOf(createdAt: string): Bucket {
    const date = localIsoDate(createdAt);
    if (date === today) return 'today';
    if (date === yesterday) return 'yesterday';
    if (date >= weekAgo) return 'thisWeek';
    return 'earlier';
  }

  function timeLabelFor(createdAt: string): string {
    return localIsoDate(createdAt) === today
      ? formatTime(createdAt)
      : formatDayMonth(createdAt, i18n.language);
  }

  const groups = BUCKET_ORDER.map((key) => ({
    key,
    items: items.filter((n) => bucketOf(n.createdAt) === key),
  })).filter((group) => group.items.length > 0);

  const markAllButton =
    unreadCount > 0 ? (
      <Pressable
        onPress={() => markAllRead.mutate()}
        disabled={markAllRead.isPending}
        hitSlop={8}
        className="flex-row items-center gap-1 rounded-full bg-sky px-3 py-1.5">
        <Ionicons name="checkmark-done" size={15} color="#3E8FE0" />
        <Text className="text-[12px] font-extrabold text-sky-ink">{t('actions.markAllRead')}</Text>
      </Pressable>
    ) : null;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title={t('title')} back right={markAllButton} />

      {notifications.isPending ? (
        <Loader />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }>
          {items.length === 0 ? (
            <View className="p-4">
              <EmptyState icon="notifications-outline" title={t('empty.title')} body={t('empty.body')} />
            </View>
          ) : (
            <>
              {unreadCount > 0 ? (
                <Text className="px-4 pb-1 pt-3 text-[13px] font-bold text-sky-ink">
                  {t('unread', { count: unreadCount })}
                </Text>
              ) : null}
              {groups.map((group) => (
                <View key={group.key}>
                  <Text className="px-4 pb-1.5 pt-4 text-[12px] font-bold uppercase tracking-wide text-muted">
                    {t(`groups.${group.key}`)}
                  </Text>
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      timeLabel={timeLabelFor(notification.createdAt)}
                      onPress={() => void openNotification(notification)}
                    />
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
