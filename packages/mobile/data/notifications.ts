import type { NotificationSummary } from '@kichkintoy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatDayMonth } from '@/lib/date';
import i18n from '@/i18n';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

export type NotificationItem = {
  id: string;
  notificationType: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  priority: NotificationSummary['priority'];
  readAt: string | null;
  createdAt: string;
  dateLabel: string;
};

function toNotificationItem(notification: NotificationSummary): NotificationItem {
  return {
    id: notification.id,
    notificationType: notification.notificationType,
    title: i18n.t(`types.${notification.notificationType}`, {
      ns: 'notifications',
      defaultValue: notification.title,
    }),
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    priority: notification.priority,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    dateLabel: formatDayMonth(notification.createdAt, i18n.language),
  };
}

export function useNotifications() {
  const query = useQuery({
    queryKey: queryKeys.notifications.list({ limit: 40 }),
    queryFn: () => orpc.notifications.list({ limit: 40 }),
  });

  return {
    data: (query.data?.items ?? []).map(toNotificationItem),
    isPending: query.isPending,
  };
}

export function useUnreadNotificationsCount() {
  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => orpc.notifications.unreadCount(),
  });

  return { data: query.data?.count ?? 0, isPending: query.isPending };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => orpc.notifications.markRead({ notificationId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
