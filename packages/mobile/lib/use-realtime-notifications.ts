import {
  safeJsonParse,
  serverRealtimeMessageSchema,
  type RealtimeQueryInvalidationHint,
} from '@kichkintoy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { StoredSession } from '@/lib/auth';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

const reconnectBaseDelayMs = 1_000;
const reconnectMaxDelayMs = 15_000;

/** Keep mobile screens fresh when the API publishes realtime notification events. */
export function useRealtimeNotifications(session: StoredSession | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) return;

    let closed = false;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;

    function scheduleReconnect() {
      if (closed) return;
      const delay = Math.min(reconnectBaseDelayMs * 2 ** reconnectAttempts, reconnectMaxDelayMs);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => void connect(), delay);
    }

    function invalidateFromHint(hint: RealtimeQueryInvalidationHint) {
      for (const queryKey of mobileQueryGroupsFromHint(hint)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }

    async function connect() {
      try {
        const ticket = await orpc.realtime.createTicket();
        if (closed) return;

        socket = new WebSocket(ticket.wsUrl);

        socket.onopen = () => {
          reconnectAttempts = 0;
        };

        socket.onmessage = (event) => {
          const raw = typeof event.data === 'string' ? event.data : '';
          const parsedJson = safeJsonParse(raw);
          const parsed = serverRealtimeMessageSchema.safeParse(parsedJson);
          if (!parsed.success) return;

          if (parsed.data.type === 'notification.created') {
            void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
            if (parsed.data.payload.notificationType === 'message.received') void queryClient.invalidateQueries({ queryKey: ['messages'] });
            for (const hint of parsed.data.payload.queryKeys) {
              invalidateFromHint(hint);
            }
          }

          if (parsed.data.type === 'notification.count_updated') {
            queryClient.setQueryData(queryKeys.notifications.unreadCount, {
              count: parsed.data.payload.unreadCount,
            });
          }

          if (parsed.data.type === 'message.created' || parsed.data.type === 'message.deleted' || parsed.data.type === 'message.updated') {
            void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', parsed.data.payload.threadId] });
            void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
            void queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
          }

          if (parsed.data.type === 'thread.read') {
            // Refresh the open conversation too so sent → read ticks flip live.
            void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', parsed.data.payload.threadId] });
            void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
            void queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
          }
        };

        socket.onclose = () => {
          socket = null;
          scheduleReconnect();
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient, session]);
}

function mobileQueryGroupsFromHint(hint: RealtimeQueryInvalidationHint): Array<readonly unknown[]> {
  if (hint.group === 'reports') {
    const groups: Array<readonly unknown[]> = [['parent', 'reports'] as const];
    return hint.id ? [...groups, queryKeys.reports.detail(hint.id)] : groups;
  }
  if (hint.group === 'albums') return [['albums'] as const];
  if (hint.group === 'notices') return [['notices'] as const];
  if (hint.group === 'calendar') return [['calendar'] as const];
  if (hint.group === 'attendance') return [['attendance'] as const];
  if (hint.group === 'meals') return [['meals'] as const];
  if (hint.group === 'studentDocuments') return [['studentDocuments'] as const];
  if (hint.group === 'director') return [queryKeys.parent.children];
  if (hint.group === 'notifications') return [queryKeys.notifications.all];
  return [];
}
