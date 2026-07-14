# Direct Message Realtime and Web Parity Design

## Goal

Make direct-message conversations update reliably in realtime and give the web
conversation the editing and read-receipt features already available on mobile.
Parent, teacher, and director clients must follow the same server rules and show
the same message state.

This is a focused follow-up to
`docs/spec/direct-messages-attachments-receipts-edit-spec.md`. It corrects the
read-receipt event design described there: a `thread.read` event must not
invalidate and refetch a thread whose fetch marks the thread read.

## Current Problem

Fetching the first page of a thread calls `MessagesService.markRead`. That
publishes `thread.read` to both participants. Each mobile realtime hook currently
handles `thread.read` by invalidating the same thread query, causing another
fetch, another `markRead`, and another event. If both participants have the
thread open, the clients can also trigger one another repeatedly.

The message list and notification badge still update because `message.created`
and `message.received` invalidate their caches independently. The active
conversation is unreliable because its read-receipt path forms a feedback loop.
Comment threads do not have this loop.

The web conversation also lacks the mobile edit composer, edited marker,
sent/read indicators, and exact read-time reveal. Its realtime handler does not
currently refresh `message.updated` events or update the open thread for read
receipts.

## Chosen Approach

Use realtime payloads to update read state directly in the conversation cache.
Do not refetch the open thread in response to `thread.read`.

Continue invalidating thread detail, thread list, and unread count for
`message.created`, `message.updated`, and `message.deleted`. This keeps message
payload handling consistent with the existing clients while limiting this work
to the broken read-receipt path.

Alternatives rejected:

- Making thread reads fully explicit would make the GET operation pure, but it
  requires a broader API and lifecycle change across every client.
- Polling would avoid event cycles but would be slower and add unnecessary
  network traffic.

## Realtime Data Flow

### New, updated, or deleted message

1. The API persists the message and publishes the corresponding message event.
2. Web and all three mobile clients invalidate the affected thread detail,
   thread list, and unread-count queries.
3. An active conversation refetches once. Its first-page fetch marks the thread
   read and publishes `thread.read`.
4. The receiving client handles `thread.read` without refetching the thread, so
   the cycle stops.

### Thread read

1. The realtime handler receives `{ threadId, userId, lastReadAt }`.
2. If `userId` is the other participant, it patches `otherLastReadAt` in every
   cached page of the matching infinite thread query.
3. If `userId` is the current user, no conversation-detail patch is needed.
4. Thread-list and unread-count queries may still be invalidated so badges stay
   correct. These queries do not call `markRead` and cannot form the loop.

The patch must preserve the existing `InfiniteData<ThreadDetail>` page and page
parameter structure. It must never create a partial thread cache when no cached
data exists.

## Mobile Behavior

The shared mobile conversation remains the reference interaction:

- Own persisted messages show a muted single check.
- Own messages at or before `otherLastReadAt` show a blue double check.
- Tapping a read own-message reveals `Read {time}`.
- Long-pressing an eligible own-message offers Edit and Delete.
- Editing reuses the composer with an editing banner, prefilled text, cancel,
  and save controls.
- Only non-deleted, text-only messages within 48 hours are editable.
- Edited messages show an `edited` label beside their timestamp.

Only the realtime read-event handling changes on mobile. Parent, teacher, and
director hooks must receive the same fix.

## Web Behavior

The existing web conversation gains equivalent behavior adapted to pointer and
keyboard interaction:

- Hovering or focusing an eligible own-message shows a Pencil action beside the
  existing Delete action.
- The Pencil action is available only for non-deleted, text-only messages with
  no attachments and a creation time within the server's 48-hour edit window.
- Selecting Pencil reuses the existing bottom composer. It shows an editing
  banner, preloads the message body, provides Cancel, and replaces Send with a
  Save action.
- Saving calls `orpc.messages.editMessage`. The composer stays in edit mode if
  the request fails and shows the existing toast style for errors.
- Own persisted messages show single or double check indicators using the same
  `otherLastReadAt` comparison as mobile.
- Clicking a read own-message toggles the exact read-time label.
- Edited messages show the translated `edited` label near the timestamp.
- Deleted and attachment-only messages cannot enter edit mode.

The web realtime hook must handle `message.updated` exactly like message create
and delete events. It must patch read state directly for `thread.read`, using
the signed-in user id to distinguish the current user from the other participant.

## Contracts and Server Rules

No database, shared-schema, or oRPC contract changes are required. Existing
fields and procedures are sufficient:

- `DirectMessage.editedAt`
- `ThreadSummary.otherLastReadAt`
- `messages.editMessage`
- realtime `message.updated`
- realtime `thread.read`

The server remains authoritative for authorization, message ownership, text-only
editing, deletion state, body limits, and the 48-hour edit window. Client checks
only control whether an action is offered; API failures must still be handled.

## Error Handling

- A failed web edit keeps the original draft and edit target available for
  retry and shows an error toast.
- Realtime cache patching silently does nothing when the target thread is not
  cached.
- Existing reconnect behavior remains unchanged. A later message invalidation
  or normal query refresh reconciles any event missed while disconnected.

## Testing and Verification

- Add focused tests for any extracted realtime cache helper, including no-cache,
  other-user, current-user, and multi-page infinite-query cases.
- Extend API message tests where needed to retain coverage of the 48-hour,
  sender-only, text-only edit rules.
- Verify web edit start, cancel, success, and failure states.
- Verify single-check to double-check transition and exact read-time reveal on
  web and mobile.
- Verify opening a conversation causes at most one thread fetch per incoming
  message rather than repeated `thread.read` refetches.
- Run relevant message tests and typechecks for shared, API, web, parent mobile,
  teacher mobile, and director mobile packages.

## Out of Scope

- Changing the 48-hour edit rule.
- Editing attachments or deleted messages.
- Typing indicators, presence, delivery acknowledgements beyond persisted/read,
  or optimistic insertion of incoming WebSocket message payloads.
- Refactoring thread reads into a separate explicit client mutation.
