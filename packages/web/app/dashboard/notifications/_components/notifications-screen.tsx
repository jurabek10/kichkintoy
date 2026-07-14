"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { renderCronNotificationBody } from "@kichkintoy/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { routeForNotification } from "@/lib/notification-routes";
import { notificationVisual } from "@/lib/notification-visuals";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

export function NotificationsScreen() {
  const { t: tm } = useLayoutTranslation("messages");
  const { t } = useLayoutTranslation("notifications");
  const queryClient = useQueryClient();
  const listKey = queryKeys.notifications.list();

  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => orpc.notifications.list({ limit: 40 }),
  });

  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      orpc.notifications.markRead({ notificationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => orpc.notifications.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
    },
  });

  const notifications = data?.items ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Notification center
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || notifications.length === 0}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <Card className="divide-y overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="grid gap-3 p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              New reports, notices, albums, meals, medication, and pickup
              updates will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const href = routeForNotification(notification);
            const unread = !notification.readAt;
            const visual = notificationVisual(notification.notificationType);
            const NotificationIcon = visual.icon;
            const title = t(`types.${notification.notificationType}`, {
              defaultValue: notification.title,
            });
            const body = renderCronNotificationBody(
              notification.notificationType,
              notification.metadata,
              (key, options) => t(key, options),
              notification.body,
            );

            return (
              <div
                key={notification.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div
                  className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${visual.tileClass}`}
                >
                  <NotificationIcon className={`h-5 w-5 ${visual.iconClass}`} />
                </div>
                <Link
                  href={href}
                  className="min-w-0 flex-1 space-y-1"
                  onClick={() => {
                    if (unread) markRead.mutate(notification.id);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{title}</p>
                    {unread ? <Badge variant="info">New</Badge> : null}
                    {notification.priority !== "normal" ? (
                      <Badge variant="warning">{notification.priority}</Badge>
                    ) : null}
                  </div>
                  {body ||
                  (notification.notificationType === "message.received" &&
                    notification.metadata?.messageKind &&
                    notification.metadata.messageKind !== "text") ? (
                    <p className="text-sm text-muted-foreground">
                      {body ??
                        `${String(notification.metadata?.senderName ?? "")}: ${tm(`previewKind.${String(notification.metadata?.messageKind)}`)}`}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </Link>
                {unread ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate(notification.id)}
                    disabled={markRead.isPending}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </section>
  );
}
