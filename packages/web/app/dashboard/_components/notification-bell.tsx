"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function NotificationBell() {
  const { t } = useLayoutTranslation("common");
  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => orpc.notifications.unreadCount(),
    staleTime: 30_000,
  });

  const unread = data?.count ?? 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={
        unread > 0
          ? t("notifications.unread", { count: unread })
          : t("notifications.label")
      }
    >
      <Link href="/dashboard/notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
