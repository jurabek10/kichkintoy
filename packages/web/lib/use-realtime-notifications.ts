"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  isAttendanceNotification,
  queryGroupFromHint,
  safeJsonParse,
  serverRealtimeMessageSchema,
} from "@kichkintoy/shared";
import { toast } from "sonner";
import { orpc } from "./orpc";
import { queryKeys } from "./query-keys";
import { routeForNotification } from "./notification-routes";
import type { StoredSession } from "./session";

const reconnectBaseDelayMs = 1_000;
const reconnectMaxDelayMs = 15_000;

export function useRealtimeNotifications(session: StoredSession | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) return;

    let closed = false;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;

    function invalidateNotifications() {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    }

    function scheduleReconnect() {
      if (closed) return;
      const delay = Math.min(
        reconnectBaseDelayMs * 2 ** reconnectAttempts,
        reconnectMaxDelayMs,
      );
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => void connect(), delay);
    }

    async function connect() {
      try {
        const ticket = await orpc.realtime.createTicket();
        if (closed) return;

        socket = new WebSocket(ticket.wsUrl);

        socket.addEventListener("open", () => {
          reconnectAttempts = 0;
          invalidateNotifications();
        });

        socket.addEventListener("message", (event) => {
          const raw = typeof event.data === "string" ? event.data : "";
          const parsedJson = safeJsonParse(raw);
          const parsed = serverRealtimeMessageSchema.safeParse(parsedJson);
          if (!parsed.success) return;

          if (parsed.data.type === "notification.created") {
            const payload = parsed.data.payload;
            invalidateNotifications();
            for (const hint of payload.queryKeys) {
              void queryClient.invalidateQueries({
                queryKey: queryGroupFromHint(hint),
              });
            }
            if (isAttendanceNotification(payload)) {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.all(),
              });
            }

            toast(payload.title, {
              description: payload.body ?? undefined,
              action: {
                label: "Open",
                onClick: () => {
                  window.location.href = routeForNotification({
                    notificationType: payload.notificationType,
                    entityType: payload.entityType,
                    entityId: payload.entityId,
                  });
                },
              },
            });
          }

          if (parsed.data.type === "notification.count_updated") {
            queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
              count: parsed.data.payload.unreadCount,
            });
          }
        });

        socket.addEventListener("close", () => {
          socket = null;
          scheduleReconnect();
        });

        socket.addEventListener("error", () => {
          socket?.close();
        });
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close(1000, "Dashboard unmounted.");
    };
  }, [queryClient, session]);
}
