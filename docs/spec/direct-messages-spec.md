# Direct Messages (1:1 Messaging) Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/messages.ts`, add procedures to `packages/shared/src/api/orpc/messages.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `messages` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned**. This is Kichkintoy's Kidsnote-style `쪽지` feature: private 1:1 text conversations between a parent and their child's teacher or the center director. Related spec: [`complaints-spec.md`](./complaints-spec.md) — complaints are a separate, tamper-proof channel and must **not** be merged into direct messages.

## 1. Product Research Summary

Kidsnote's `쪽지` (message) feature:

- Parents send private notes to the class teacher or the director.
- Staff reply privately; other parents never see the exchange.
- Messages are simple text; the value is privacy and speed compared to comments on public posts.
- Kidsnote shows sent/read state so parents know the teacher saw the note.

Kichkintoy adaptation:

- Thread-based (like Telegram, which the Uzbek market knows well) instead of Kidsnote's one-off notes: one continuous thread per pair of people.
- Text-only in MVP; photos/files later.
- Reuses the existing (currently unused) `conversation_threads`, `conversation_participants`, and `messages` Prisma models.

## 2. Scope

In scope:

- Parent ↔ assigned class teacher threads.
- Parent ↔ director threads.
- Teacher ↔ director threads.
- One `direct` thread per user pair per center (auto-deduplicated).
- Text messages, 1–2000 characters.
- Read state (`lastReadAt` per participant) and unread badges.
- Sender soft-delete of own message with a visible "Message deleted" placeholder.
- Notifications on new message (respecting existing notification settings).
- Web dashboard page + screens in all three mobile apps.

Out of scope for MVP:

- Group threads (class-wide chat).
- Teacher ↔ teacher and parent ↔ parent threads.
- Photo/file/voice attachments.
- Message editing.
- Typing indicators and live message streaming (list refetch + notifications is enough for MVP; realtime channel reuse is a follow-up).
- Auto-translation of message content.

## 3. Vocabulary

- **Thread:** a private conversation between exactly two users in one center.
- **Direct thread:** `thread_type = 'direct'`; the only type this spec creates.
- **Contact:** a user the current user is allowed to start a thread with.
- **Unread count:** messages in a thread newer than the participant's `lastReadAt`.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Start thread with parent | Any center parent | Parents of assigned classes | No | — |
| Start thread with teacher | Any center teacher | — | — | Assigned teachers of own child's class |
| Start thread with director | — | Yes | Yes | Yes |
| Send message in own thread | Yes | Yes | Yes (existing thread) | Yes |
| Read thread | Participant only | Participant only | Participant only | Participant only |
| Delete own message (soft) | Yes | Yes | Yes | Yes |
| Delete another user's message | No | No | No | No |
| Delete a thread | No | No | No | No |

Authorization rules:

- Every procedure is object-authorized: the caller must be a `conversation_participants` row holder for the thread.
- The director never reads parent↔teacher threads. Direct messages are private between the two participants — the tamper-proof escalation channel is the complaints feature, not message surveillance.
- Parent contact list is derived from `child_guardians` + active `child_enrollments` + active `teacher_class_assignments` + center director membership.
- If a teacher's class assignment ends or a child leaves, the existing thread stays readable but **new threads** can no longer be started; sending into an existing thread remains allowed (people finish conversations).
- All access is scoped to one center (`center_id` on the thread).

## 5. User Flows

### 5.1 Parent Starts A Conversation

1. Parent opens **Messages**.
2. Parent taps **New message**.
3. Contact picker shows, grouped: each child's class teacher(s), then the director. Every contact shows photo + name + role/class label (per the mobile name-photos convention).
4. Parent picks a contact.
5. If a `direct` thread with that person already exists, the app opens it; otherwise a new thread is created on first send.
6. Parent types a message and sends.
7. Teacher/director gets a notification.

### 5.2 Reading And Replying

1. User opens **Messages**; list shows threads sorted by last message time, with the other person's photo + name, last message preview, time (24h, Asia/Tashkent), and unread badge.
2. User opens a thread; messages render oldest→newest, own messages right-aligned.
3. Opening the thread sets `lastReadAt = now` for the caller.
4. User replies; the other participant is notified.

### 5.3 Deleting Own Message

1. Long-press (mobile) / hover menu (web) on an own message → **Delete**.
2. Confirmation dialog.
3. Message body is cleared, `deletedAt` set; both sides see a "Message deleted" placeholder.
4. Deletion is audited. There is no hard delete.

## 6. Data Model

Reuse the existing models; extend `conversation_threads` with denormalized list fields:

```text
conversation_threads (existing, extend)
+ last_message_at timestamptz nullable
+ last_message_preview text nullable      // first 120 chars, empty when deleted
+ updated_at timestamptz

conversation_participants (existing, unchanged)
messages (existing, unchanged: body nullable, message_type default 'text', deleted_at)
```

Rules:

- `thread_type` is always `'direct'` for this feature.
- `class_id` / `child_id` on the thread stay `null` in MVP (they exist for future context linking).
- Uniqueness of one direct thread per pair is enforced in the service (find thread where `thread_type='direct'` and participants = exactly these two users in this center), inside a transaction on create.

Recommended indexes:

```text
@@index([centerId, lastMessageAt]) on conversation_threads
@@index([threadId, createdAt]) on messages
```

## 7. oRPC Contract

Add a `messages` contract group:

```text
messages.contacts(input: { centerId? }) -> MessageContactGroup[]
messages.threads(input: { cursor?, limit? }) -> ThreadListResponse           // paginated, 10 per page
messages.thread(input: { threadId, cursor?, limit? }) -> ThreadDetailResponse // paginated messages
messages.startThread(input: { recipientUserId, body }) -> ThreadDetail        // dedupes to existing thread
messages.send(input: { threadId, body }) -> MessageOut
messages.markRead(input: { threadId }) -> { lastReadAt }
messages.deleteMessage(input: { messageId }) -> MessageOut
messages.unreadCount() -> { total: number }                                   // for nav badge
```

## 8. Shared Schemas

Create `packages/shared/src/api/messages.ts`:

- `messageContactSchema` (userId, displayName, photo media ref, role, classLabel?)
- `threadSummarySchema` (threadId, otherParticipant, lastMessagePreview, lastMessageAt, unreadCount)
- `messageSchema` (id, senderUserId, body nullable, deletedAt nullable, createdAt)
- `sendMessageInputSchema` — body trimmed, 1–2000 chars
- `startThreadInputSchema`
- No `z.unknown()` in request/response data.

## 9. Backend Service Rules

Create:

```text
packages/api/src/messages/messages.module.ts
packages/api/src/messages/messages.service.ts
packages/api/src/orpc/routers/messages.router.ts
```

Service responsibilities:

- Resolve allowed contacts per role (see §4) — one query path shared by `contacts` and `startThread` validation, so the picker and the permission check can never disagree.
- Dedupe thread creation transactionally.
- Update `last_message_at` / `last_message_preview` on send and on delete (recompute preview from the latest non-deleted message).
- Notify the other participant on send (`message.received`), respecting `UserNotificationSettings`; suppress when the recipient's `lastReadAt` shows they are actively in the thread within the last ~30s (best-effort, optional).
- Audit: `message.sent`, `message.deleted`, `thread.created`.

## 10. Frontend Routes

Web:

```text
packages/web/app/dashboard/messages/page.tsx                 // thread list
packages/web/app/dashboard/messages/[threadId]/page.tsx      // conversation
packages/web/app/dashboard/messages/_components/*            // thread-list, conversation, composer, contact-picker
```

Mobile (identical screens in `mobile`, `teacher-mobile`, `director-mobile`; shared pieces go to `mobile-shared` where they are pure):

```text
app/messages/index.tsx        // thread list: search field + standard list pattern
app/messages/[threadId].tsx   // conversation
app/messages/new.tsx          // contact picker
```

Navigation: add **Messages** with unread badge to the dashboard sidebar (all roles) and to the mobile home feature grid.

## 11. UI Requirements

- Thread list follows the shared mobile list pattern (search field filters by contact name; no funnel/period filter — recency ordering replaces it). 10 per page.
- Conversation screen: date separators (`15-iyun` style), 24-hour times, sender photo on incoming messages, standard chat bubbles consistent with the existing AI chat screens' visual language but clearly a person-to-person surface (other person's name + photo in the header, tap header → nothing in MVP).
- Composer: single-line growing input + send button; disabled while sending; error toast on failure with retry.
- Empty states: "No messages yet" with a **New message** button; contact picker empty state explains who you can write to.
- All strings via `packages/translations` in uz/ru/en; verify uz lengths on buttons.

## 12. Security And Safety

- Object-level authorization on every read/write (participant check), generic not-found for non-participants to prevent thread-ID probing.
- Contact validation on `startThread` — a parent cannot start a thread with an arbitrary `recipientUserId`.
- Message bodies are never logged.
- Rate limit `send` (e.g. 30 messages/min/user) to prevent spam.
- No delete/edit of another user's content anywhere in the API surface.

## 13. Notifications

Type `message.received`:

```text
New message
{senderName}: {preview}
```

Tapping the notification deep-links to the thread. Grouped in the existing notifications inbox under its own domain color/icon.

## 14. Acceptance Criteria

- Parent sees only allowed contacts and can start a thread with each.
- Starting a second thread with the same person reopens the existing thread.
- Unassigned teacher cannot start a thread with a parent; non-participant cannot fetch a thread (generic not-found).
- Read state updates when a thread is opened; unread badges are correct on list and nav.
- Sender can delete own message; both sides see the placeholder; the other participant cannot delete it.
- Director cannot fetch a parent↔teacher thread they are not part of.
- New-message notification arrives and deep-links correctly on web and all three mobile apps.
- Lists paginate at 10; `pnpm typecheck` passes for shared, api, web, and all mobile packages.

## 15. E2E Test Plan

Happy path: parent → new message → picks teacher → sends; teacher sees unread badge, opens, replies; parent sees reply and read state.
Permission path: parent B cannot fetch parent A's thread; unassigned teacher gets empty contact list for that class; forged `recipientUserId` on `startThread` is rejected.
Dedupe path: parent starts a "new" thread with the same teacher twice → one thread, both messages inside.
Delete path: teacher deletes own message → parent sees placeholder; parent cannot delete teacher's message.

## 16. Implementation Order

1. Shared schemas + oRPC contract.
2. Prisma migration (thread denormalized fields + indexes).
3. API module/service/router + notifications + audit.
4. Web routes/components + nav badge.
5. Mobile screens (parent → teacher → director apps), reusing shared pieces.
6. Typecheck all packages, then browser/device E2E.
