# Real-time Notification Center Spec

> **API note:** the app remains oRPC-first for normal create/read/update flows. WebSocket is only for real-time event delivery and live UI invalidation. Add reusable event schemas to `packages/shared/src/api/realtime.ts`, expose normal notification history/read actions through oRPC, and keep TanStack Query as the source of truth for fetched data.

> Status: **planned next feature**. This feature adds a Kidsnote-style live notification center for reports, notices, medication, pickup, meals, albums, attendance, and future chat.

## 1. Documentation Basis

MDN describes WebSocket as a browser API for opening a two-way interactive communication session between browser and server. This lets the app send and receive messages without repeatedly polling the server. MDN also notes that the stable `WebSocket` interface has broad support, while `WebSocketStream` is not standard and has limited engine support. Kichkintoy should therefore use the standard `WebSocket` interface for MVP.

Important MDN implementation points:

- WebSocket supports two-way browser/server messaging.
- WebSocket avoids polling for server replies.
- The stable `WebSocket` interface is the right MVP target.
- The plain `WebSocket` interface does not handle backpressure automatically, so event payloads must stay small and the client should reconnect/refetch instead of buffering large queues.
- Pages with open WebSocket connections may not enter the browser back/forward cache, so the client should close the socket when the user signs out or leaves the authenticated app shell.

Source:

- MDN WebSocket API: `https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API`

## 2. Goal

Build a real-time notification system that makes the app feel alive without replacing oRPC.

Primary behavior:

- Server writes a normal notification row.
- Server broadcasts a small WebSocket event to the affected user.
- Web app receives the event.
- Web app shows a toast.
- Web app updates notification count.
- Web app invalidates related TanStack Query keys.
- User can open the Notification Center to see history.

This should improve every existing feature without forcing each feature to implement its own real-time connection.

## 3. Scope

In scope:

- Authenticated WebSocket connection.
- Per-user real-time events.
- Notification bell with unread count.
- Notification drawer/page.
- Mark one notification as read.
- Mark all notifications as read.
- Toasts for important events.
- Query invalidation for affected features.
- Reconnect with backoff.
- Heartbeat/ping to detect dead connections.
- Audit-friendly event and notification records.

Out of scope for MVP:

- Push notifications through APNs/FCM.
- SMS delivery.
- Email delivery.
- Offline WebSocket event replay beyond notification history fetch.
- Chat typing indicators.
- Presence/online status.
- Multi-device synchronization beyond per-user broadcast.
- Redis pub/sub for multiple API instances.
- WebTransport.

Future scaling note:

- MVP can use in-memory connection tracking while the API runs as one process.
- Before multi-instance deployment, add Redis pub/sub or another broker so events created on one API instance reach sockets connected to another instance.

## 4. Product Events

The Notification Center should support these event types first:

| Feature | Event | Recipient | UI effect |
|---|---|---|---|
| Reports | `report.published` | Parent | Toast + invalidate parent reports |
| Reports | `report.comment.created` | Parent/teacher | Toast + invalidate report detail |
| Notices | `notice.published` | Target parents/staff | Toast + invalidate notice list |
| Albums | `album.published` | Target parents | Toast + invalidate album list |
| Meals | `meal.published` | Target parents | Toast + invalidate meal feed |
| Medication | `medication_request.created` | Director/teacher | Toast + invalidate medication list |
| Medication | `medication_request.administered` | Parent | Toast + invalidate medication detail/list |
| Medication | `medication_request.skipped` | Parent | Toast + invalidate medication detail/list |
| Pickup | `pickup_notice.created` | Director/teacher | Toast + invalidate pickup list |
| Pickup | `pickup_notice.changed` | Director/teacher | Toast + invalidate pickup list/detail |
| Pickup | `pickup_notice.cancelled` | Director/teacher | Toast + invalidate pickup list/detail |
| Pickup | `pickup_notice.acknowledged` | Parent | Toast + invalidate pickup detail/list |
| Attendance | `attendance.checked_in` | Parent | Toast + invalidate attendance/reports |
| Attendance | `attendance.checked_out` | Parent | Toast + invalidate attendance/pickup |
| Emergency | `emergency.notice.created` | Target users | High-priority toast + notification drawer |

The event system should be generic. Feature modules should not know about sockets directly; they should call the notification service, and the notification service should publish events.

## 5. Architecture

### 5.1 Server Flow

```text
Feature service writes domain data
  -> NotificationsService.enqueue(...)
  -> notification row is created
  -> RealtimeGateway publishes notification.created to userId
  -> connected browser receives event
```

Rules:

- The database notification row is the durable source of truth.
- WebSocket event is a delivery acceleration path.
- If WebSocket delivery fails, user still sees notification after refetch.
- WebSocket payload should include IDs and routing metadata, not full private feature payloads.

### 5.2 Client Flow

```text
DashboardShell mounts
  -> useRealtimeNotifications opens WebSocket
  -> server authenticates token
  -> server sends connected/ready event
  -> client receives notification.created
  -> toast appears
  -> notification count query invalidates
  -> feature query keys invalidate based on event.kind/entityType
```

Rules:

- Only authenticated dashboard pages open WebSocket.
- Login/signup pages should not open WebSocket.
- Close socket on sign out.
- Close socket when the dashboard shell unmounts.
- Reconnect only while authenticated.

## 6. Transport

Endpoint:

```text
ws://localhost:4000/ws
wss://api.kichkintoy.uz/ws
```

Authentication:

- Browser cannot set arbitrary `Authorization` headers on native `WebSocket`.
- Use one of:
  - query token for MVP: `/ws?token=<sessionToken>`;
  - or short-lived WebSocket ticket from oRPC: `realtime.createTicket`.
- Preferred safe MVP: create a short-lived ticket through oRPC, then connect with `/ws?ticket=<ticket>`.

Recommended MVP:

```text
1. Client calls oRPC realtime.createTicket.
2. Server returns one-time ticket valid for 60 seconds.
3. Client opens WebSocket with ws URL containing the ticket.
4. Server validates ticket and binds socket to userId.
5. Server deletes or marks ticket as used.
```

Why not raw session token in URL:

- URLs can appear in logs.
- A short-lived one-time ticket reduces exposure.

Subprotocol:

```text
kichkintoy.realtime.v1
```

Client should pass this as the optional WebSocket protocol when connecting. Server should reject unknown protocols later if needed.

## 7. Message Envelope

All WebSocket messages are JSON.

Base envelope:

```ts
type RealtimeEnvelope<TType extends string, TPayload> = {
  id: string;
  type: TType;
  sentAt: string;
  payload: TPayload;
};
```

Server-to-client message types:

```text
connection.ready
notification.created
notification.read
notification.count_updated
query.invalidate
heartbeat.ping
error
```

Client-to-server message types:

```text
heartbeat.pong
notification.mark_read
notification.mark_all_read
connection.close
```

MVP can keep client-to-server messages minimal and use oRPC for mark-read actions. If mark-read stays oRPC-only, the WebSocket only needs `heartbeat.pong`.

## 8. Notification Event Payload

```ts
type NotificationCreatedPayload = {
  notificationId: string;
  notificationType: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  priority: "normal" | "high" | "urgent";
  createdAt: string;
  queryKeys: Array<{
    group: string;
    id?: string;
  }>;
};
```

Payload rules:

- Include notification ID.
- Include enough display text for a toast.
- Include entity routing data.
- Include query invalidation hints.
- Do not include sensitive full records like medication instructions, pickup person details, private report content, or media URLs.

Examples:

```json
{
  "id": "evt_01",
  "type": "notification.created",
  "sentAt": "2026-06-07T13:00:00.000Z",
  "payload": {
    "notificationId": "uuid",
    "notificationType": "report.published",
    "title": "Daily report ready",
    "body": "Ali's daily report is ready.",
    "entityType": "daily_report",
    "entityId": "uuid",
    "priority": "normal",
    "createdAt": "2026-06-07T13:00:00.000Z",
    "queryKeys": [{ "group": "reports" }, { "group": "parent" }]
  }
}
```

## 9. Shared Schemas

Create:

```text
packages/shared/src/api/realtime.ts
packages/shared/src/api/notifications.ts
packages/shared/src/api/orpc/notifications.contract.ts
packages/shared/src/api/orpc/realtime.contract.ts
```

Schemas:

- `realtimeEventTypeSchema`
- `realtimeEnvelopeSchema`
- `notificationCreatedPayloadSchema`
- `notificationPrioritySchema`
- `notificationSummarySchema`
- `notificationListResponseSchema`
- `createRealtimeTicketResponseSchema`

No `z.unknown()` in final outputs.

Allowed notification priority:

```text
normal
high
urgent
```

## 10. oRPC Procedures

Use oRPC for durable state and ticket creation:

```text
notifications.list
notifications.unreadCount
notifications.markRead
notifications.markAllRead
realtime.createTicket
```

Inputs:

- `notifications.list`
  - cursor optional
  - limit default 20, max 50
  - unreadOnly optional boolean

- `notifications.markRead`
  - notificationId UUID

- `notifications.markAllRead`
  - no input or optional before timestamp

- `realtime.createTicket`
  - no input
  - output: `{ ticket: string, expiresAt: string, wsUrl: string }`

Rules:

- User can only read/mark their own notifications.
- Ticket is one-time and short-lived.
- Ticket must be bound to user ID.

## 11. Database Changes

Current `notifications` table already stores notification records. Add fields if needed:

```prisma
model Notification {
  // existing fields...
  priority String @default("normal")
  metadata Json?
}
```

Add table for tickets:

```prisma
model RealtimeTicket {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  usedAt    DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@map("realtime_tickets")
}
```

Ticket cleanup:

- Delete expired tickets older than 1 day in a scheduled job.
- Mark ticket `usedAt` when accepted.

## 12. Backend Implementation

Create:

```text
packages/api/src/realtime/realtime.module.ts
packages/api/src/realtime/realtime.gateway.ts
packages/api/src/realtime/realtime.service.ts
packages/api/src/notifications/notifications-query.service.ts
packages/api/src/orpc/routers/notifications.router.ts
packages/api/src/orpc/routers/realtime.router.ts
```

Recommended library:

- Use the `ws` package for a simple native WebSocket server integrated with the existing Nest/Express HTTP server.
- Avoid Socket.IO for MVP unless you specifically need its fallback transport and rooms API.

Connection state:

```ts
Map<string, Set<WebSocket>>
```

Where key is `userId`.

Server behavior:

- On connection:
  - validate ticket;
  - bind socket to user ID;
  - add socket to user connection set;
  - send `connection.ready`.

- On close:
  - remove socket from connection set.

- On notification enqueue:
  - send `notification.created` to all active sockets for user ID.

- Heartbeat:
  - send ping every 30 seconds;
  - close socket if no pong after timeout.

Security:

- Reject missing/invalid/expired/used ticket.
- Reject unauthenticated sockets before adding to connection map.
- Do not broadcast by center/class directly in MVP; resolve recipients first and send per user.
- Limit max payload size.
- Rate-limit ticket creation through existing RPC rate limit.

## 13. Client Implementation

Create:

```text
packages/web/lib/realtime.ts
packages/web/lib/use-realtime-notifications.ts
packages/web/app/dashboard/_components/notification-bell.tsx
packages/web/app/dashboard/notifications/page.tsx
```

Client hook behavior:

- Runs inside `DashboardShell`.
- Calls `orpc.realtime.createTicket()`.
- Opens `new WebSocket(wsUrl, "kichkintoy.realtime.v1")`.
- On `open`, mark connected.
- On `message`, parse with shared schema.
- On `notification.created`:
  - show toast;
  - invalidate `notifications.unreadCount`;
  - invalidate feature queries based on `entityType` and `notificationType`.
- On `close`, reconnect with exponential backoff while session exists.
- On sign out/unmount, close the socket.

Reconnect strategy:

```text
1s, 2s, 5s, 10s, 30s max
```

Reset backoff after successful connection.

Do not buffer unhandled messages in memory. If reconnect happens, refetch notification list/count.

## 14. TanStack Query Invalidation

Add query keys:

```ts
notifications: {
  all: () => ["notifications"] as const,
  list: (input?: Record<string, unknown>) => ["notifications", "list", input ?? {}] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
}
```

Event-to-query invalidation:

| Event type | Query invalidation |
|---|---|
| `report.published` | `reports`, `parent.children`, `teacher.reports` |
| `report.comment.created` | `reports.detail(reportId)` |
| `notice.published` | `notices.parentList`, `notices.authorList` |
| `album.published` | `albums.parentList`, `albums.staffList` |
| `meal.published` | `meals.parentList`, `meals.staffList` |
| `medication_request.created` | `medications.staffList` |
| `medication_request.administered` | `medications.parentList`, `medications.detail` |
| `pickup_notice.changed` | `pickups.staffList`, `pickups.detail` |
| `pickup_notice.acknowledged` | `pickups.parentList`, `pickups.detail` |
| `attendance.checked_in` | future attendance keys |

Always invalidate:

```text
notifications.all()
notifications.unreadCount()
```

## 15. UI Requirements

### 15.1 Notification Bell

Location:

- Dashboard header near user identity/sign out.

Behavior:

- Shows unread badge.
- Opens notification drawer or links to notification page.
- Badge updates live from WebSocket events.

### 15.2 Notification Drawer/Page

Shows:

- title
- body
- created time
- unread/read state
- feature icon
- link to related entity

Actions:

- mark one read
- mark all read
- open related page

Priority UI:

- `normal`: standard toast.
- `high`: persistent toast until user dismisses or opens.
- `urgent`: stronger visual style and sound later, but no sound in MVP unless user enables it.

Do not expose private full content in toast. For example:

- Good: `Ali's medication report is ready.`
- Avoid: `Ali took 5ml of medicine at 12:15.`

## 16. Routing Map

Entity routing:

```text
daily_report -> /dashboard/reports/[reportId]
notice -> /dashboard/notices/[noticeId]
album_post -> /dashboard/albums/[postId]
meal_post -> /dashboard/meals/[mealId]
medication_request -> /dashboard/medications/[requestId]
pickup_time_notice -> /dashboard/pickups/[noticeId]
attendance_record -> /dashboard/attendance
emergency_notice -> /dashboard/notices/[noticeId]
```

If entity route is unavailable, open `/dashboard/notifications`.

## 17. Reliability Rules

- WebSocket delivery is best-effort.
- Notification DB row is durable.
- On reconnect, client refetches unread count and latest notifications.
- Client must handle duplicate events by notification ID.
- Client should ignore malformed events and optionally log in development.
- Server should remove closed sockets promptly.
- Server should never trust client-provided user IDs.

## 18. Security Rules

- Use `wss://` in production.
- Do not put long-lived auth session tokens in WebSocket URL.
- Use one-time short-lived ticket.
- Validate all incoming client messages.
- Limit message size.
- Do not send private object bodies through WebSocket.
- Broadcast only to explicit recipient user IDs.
- Close socket on session revocation if possible.
- Revalidate user/session when creating ticket.

## 19. Acceptance Criteria

- Authenticated dashboard opens a WebSocket connection.
- Unauthenticated users cannot connect.
- Ticket expires and cannot be reused.
- When a daily report is published, parent receives a live notification.
- When a report comment is added, the other participant receives a live notification.
- When medication is completed, parent receives a live notification.
- When pickup notice changes, assigned staff/director receive live notification.
- Notification bell unread count updates without page refresh.
- Notification list shows durable history after refresh.
- Mark read updates unread count.
- On WebSocket disconnect/reconnect, notification count refetches.
- API/web typechecks pass.
- E2E test verifies at least one live event from server to browser.

## 20. E2E Test Plan

Browser E2E should cover:

1. Login as parent in browser A.
2. Open dashboard and verify WebSocket connected.
3. Login as teacher/director or use API to publish a daily report for that parent's child.
4. Parent browser receives toast without refresh.
5. Notification bell count increments.
6. Parent opens notification list.
7. Notification exists and links to report detail.
8. Parent marks notification read.
9. Count decreases.
10. Reload page.
11. Notification history remains visible.

Second E2E:

1. Parent opens dashboard.
2. Stop WebSocket server or close socket.
3. Client shows disconnected/reconnecting state only in dev logs, not intrusive UI.
4. Restart server.
5. Client reconnects.
6. Client refetches unread count.

## 21. Implementation Order

1. Add shared schemas for notification summaries and realtime envelopes.
2. Add notification oRPC procedures: list, unread count, mark read, mark all read.
3. Add realtime ticket table and service.
4. Add WebSocket gateway with ticket auth.
5. Connect `NotificationsService.enqueue` to realtime publish.
6. Add web realtime hook in `DashboardShell`.
7. Add notification bell and notification page.
8. Add query invalidation per event type.
9. Add E2E test with report published event.
10. Add production hardening: `wss://`, proxy config, heartbeat tuning.

## 22. Future Enhancements

- Push notifications through FCM/APNs.
- Chat messages over WebSocket.
- Typing indicators for chat.
- Online presence for staff.
- Redis pub/sub for multi-instance API.
- Per-center emergency broadcast dashboard.
- User notification preferences per event type.
- Quiet hours.
- Parent lock-screen-safe notification previews.
