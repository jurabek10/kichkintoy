"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { orpc } from "@/lib/orpc";
import { routeForNotification } from "@/lib/notification-routes";
import { queryKeys } from "@/lib/query-keys";

export default function NotificationsPage() {
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

            return (
              <div
                key={notification.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <Link
                  href={href}
                  className="min-w-0 flex-1 space-y-1"
                  onClick={() => {
                    if (unread) markRead.mutate(notification.id);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{notification.title}</p>
                    {unread ? <Badge variant="info">New</Badge> : null}
                    {notification.priority !== "normal" ? (
                      <Badge variant="warning">{notification.priority}</Badge>
                    ) : null}
                  </div>
                  {notification.body ? (
                    <p className="text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
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
