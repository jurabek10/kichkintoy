# Direct messages — attachment downloads, read receipts, and edit

Follow-up to `direct-messages-spec.md`. Three additions to the parent/teacher/
director direct-message experience, driven by real usage gaps:

1. **Attachments must open/download reliably on both sides.** Families and staff
   attach PDFs, Word docs, photos, and videos. The recipient (e.g. a teacher)
   could not open a file. The server already authorises any thread participant
   to download message media (`MediaService.canAccessMedia`, `entityType:
   "message"`) — so this is a client bug: files/videos were handed to
   `Linking.openURL` on a presigned URL, which is unreliable for documents on
   device. Fix on the client only.

2. **Read receipts, Telegram-style.** A single check (✓) on your own message
   once it is stored; a double check (✓✓) once the other person has read it.
   Tapping a read message reveals the read time ("Read 15:04").

3. **Edit a sent message.** The sender may edit the text of their own message
   for **48 hours** after sending; edited messages show an "edited" label to
   both people. Attachments cannot be edited.

## 1. Attachments

- Client only; no contract or server change.
- Replace `Linking.openURL` for **file** and **video** attachments with a
  download-then-open flow:
  - `FileSystem.downloadAsync(url, localUri)` (legacy API, as `lib/upload.ts`
    already uses) into the cache dir, keyed by media asset id + original name.
  - `Sharing.shareAsync(localUri, { mimeType, UTI })` to hand the file to the
    OS open/share sheet (open in Files/Preview, save, share). Falls back to
    `Linking.openURL(url)` when sharing is unavailable.
- The file chip shows a spinner while downloading and an alert on failure.
- Images keep the existing in-app fullscreen viewer; add a share/save action in
  that viewer using the same download-then-share flow.
- New dependency: `expo-sharing` (ships inside Expo Go; no SDK change). Added to
  `mobile`, `teacher-mobile`, `director-mobile`, and `mobile-shared`.

## 2. Read receipts

- **Data already exists**: `ConversationParticipant.lastReadAt` is set by
  `markRead`, and a `thread.read` realtime event is already published to both
  participants.
- **Contract**: add `otherLastReadAt: isoDateTime | null` to `threadSummary`
  (the other participant's `lastReadAt`). A message of mine is *read* when
  `message.createdAt <= otherLastReadAt`.
- **Client** (own messages only, at the end of a sender run):
  - not yet read → single ✓ (muted).
  - read → double ✓✓ (accent/blue).
  - Tap a read message → reveal "Read {time}" using `otherLastReadAt`.
  - Optimistic/pending messages show a clock; once persisted they show ✓.
- Live update rides the existing `thread.read` event; the client also
  invalidates the open thread detail so ticks flip in place.

## 3. Edit message

- **DB**: `Message.editedAt DateTime?` (nullable). Migration only, no backfill.
- **Contract**: `editMessage(messageId, body)` → `messageSchema` (now carrying
  `editedAt`). Body required, trimmed, 1–2000 chars.
- **Server rules** (`MessagesService.editMessage`):
  - Caller must be the message sender and a thread participant.
  - Message must not be deleted and must have text (attachment-only messages and
    the deleted tombstone are not editable).
  - Within 48h of `createdAt`, else `BadRequestException` ("edit window
    expired").
  - Update `body` + `editedAt = now`; if it is the thread's last message, refresh
    `lastMessagePreview`. Audit `message.edited`. Publish a new `message.updated`
    realtime event to both participants.
- **Realtime**: `message.updated` server event `{ threadId, message }`; client
  handler invalidates thread detail + thread list.
- **Client**: long-press your own (non-deleted, text) message → action sheet
  with **Edit** and **Delete**. Edit opens an inline composer prefilled with the
  current text and an "Editing message" banner; sending calls `editMessage`.
  Edited messages render an "edited" tag next to the timestamp.

## i18n

New `messages` keys in uz/ru/en: `edit`, `edited`, `editing`, `saveEdit`,
`editWindowExpired`, `read`, `readAt`, `openFailed`, `opening`, `save`,
`saveToFiles`.
