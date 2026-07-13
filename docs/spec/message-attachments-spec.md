# Direct Message Attachments (Photos & Files In Chat) Spec

> **API note:** the app API is oRPC-only. Extend `packages/shared/src/api/messages.ts`
> and `packages/shared/src/api/orpc/messages.contract.ts`; media upload reuses the
> presigned flow in the existing `media` contract. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned**. Follow-up to [`direct-messages-spec.md`](./direct-messages-spec.md),
> which shipped text-only 1:1 threads (parent ↔ teacher, parent ↔ director,
> teacher ↔ director) and explicitly deferred "photos/files later". This spec adds
> photo, video, and file messages to those threads on web and all three mobile apps.
> Not related to the AI chatrooms (`chat` module) — this is the human `messages` module.

## 1. Current State

- Contract (`messages.contract.ts`): `send` / `startThread` take
  `{ body: string (1–2000) }` only.
- Prisma `Message` already has `messageType String @default("text")` — unused so far.
  `ConversationThread` stores `lastMessagePreview` + `lastMessageAt`.
- Mobile UI is shared: `packages/mobile-shared/src/messages.tsx` exports
  `MessagesListScreen`, `NewMessageScreen`, `ConversationScreen`; all three apps mount
  them from thin `app/messages/*` routes. The composer is a `TextInput` + send button —
  no attachment affordance yet.
- Web UI: `packages/web/app/dashboard/messages/_components/conversation.tsx`
  (Textarea + send).
- Media infra: `MediaAsset` + `MediaLink`, presigned MinIO upload, purpose-gated
  validation in `packages/api/src/media/media.service.ts`; mobile upload helper
  `packages/mobile/lib/upload.ts` (`uploadMedia`).

## 2. Scope

In scope:

- Sending **photos, videos, and documents** in existing and new direct threads, in both
  directions, for all pairs the DM feature already allows (parent ↔ teacher,
  parent ↔ director, teacher ↔ director). No permission changes.
- A message may carry text, attachments, or both.
- Thread list previews and push/in-app notifications for attachment messages.
- Sender soft-delete keeps working: deleting a message hides its attachments too.
- Web + all three mobile apps (shared `ConversationScreen` covers mobile once).

Out of scope:

- Voice messages, contact/location sharing.
- Image editing / captions per image (the message `body` is the caption).
- Forwarding between threads.
- Attachments in the AI chatrooms.

## 3. Limits And Allowed Types

Same sets as `media.service.ts` — do not redefine:

| Kind | Mime types | Max size |
|---|---|---|
| Image | jpeg, png, webp, heic, heif | 25 MB |
| Video | mp4, webm, quicktime | 100 MB |
| Document | pdf, `.doc`, `.docx` | 25 MB |

- Max **4 attachments per message** (mixed kinds allowed).
- `body` becomes optional (max 2000); a message needs text **or** ≥1 attachment.

## 4. Shared Schemas (`packages/shared/src/api/messages.ts`)

```ts
export const messageAttachmentSchema = z.object({
  mediaAssetId: uuidSchema,
  mediaType: z.enum(["image", "video", "file"]),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});
```

- `messageSchema` gains `attachments: z.array(messageAttachmentSchema)`.
- `sendMessageInputSchema` becomes
  `{ body: z.string().trim().max(2000).optional(), attachmentMediaAssetIds: z.array(uuidSchema).max(4).default([]) }`
  with a refine requiring text or attachments. `startThreadInputSchema` inherits it.
- `threadSummarySchema` gains `lastMessageKind: z.enum(["text", "image", "video", "file"]).nullable()`
  so clients can localize previews (see §7) — **never** persist translated preview text
  (same rule as report-item i18n tokens).

Reuse `messageAttachmentSchema`'s shape with the comment-attachments spec if that ships
first — keep one shared attachment schema if practical.

## 5. Data Model

No new tables:

- `MediaLink` with `entityType: "message"`, `entityId: messageId`.
- `Message.messageType`: `"text"` when body-only; otherwise the kind of the first
  attachment (`"image" | "video" | "file"`). Mixed messages use the first attachment's
  kind — it only drives previews/notifications.
- `ConversationThread` gains `lastMessageKind String?` (migration), maintained alongside
  `lastMessagePreview`.
- New media purpose `"message"` in `mediaPurposeValues`; the 100 MB video override in
  the upload-URL schema and service extends to it.

Validation on send (inside the send transaction):

- Every asset id: exists, upload complete, purpose `message`,
  `uploaderUserId === sender`, `centerId === thread.centerId`, not linked elsewhere.

Download gating: `media.getDownloadUrl` for a `message`-purpose asset resolves the
`MediaLink` → message → thread and requires the caller to be a **thread participant**
whose message is not deleted. Nobody else — including other staff at the center — can
fetch DM attachments.

## 6. Backend Service Rules (`messages.service.ts`)

- `send` / `startThread`: create message + `MediaLink` rows in one transaction; set
  `messageType`; update thread `lastMessagePreview` (text preview when body exists,
  empty string otherwise) and `lastMessageKind`.
- Message hydration (thread page, latest message): batch-load links + assets for the
  page (no N+1), map to `messageAttachmentSchema`.
- `deleteMessage`: unchanged soft delete; hydration returns `attachments: []` and
  clients keep showing the "Message deleted" placeholder. If the deleted message was
  the latest, the recomputed preview logic also recomputes `lastMessageKind`.
- Notifications: reuse the existing new-message notification; when the message has no
  body, the stored payload carries the kind token, and clients render the localized
  label ("Photo" / "Video" / "File").

## 7. Thread List Previews

- Text message → existing text preview.
- Attachment message with body → text preview (the caption).
- Attachment-only → clients render from `lastMessageKind`: a small kind icon
  (image/videocam/document) + localized label, e.g. `📷 Foto` — composed at render
  time from translation keys, never stored.

## 8. Mobile UI (`packages/mobile-shared/src/messages.tsx`)

Composer (in `ConversationScreen`):

- Add an `add`(+) button left of the input opening a small action sheet:
  Photo / Video / File (translated). Photo & video use `expo-image-picker`
  (multi-select for photos), file uses `expo-document-picker`.
- Pending attachments render as a horizontal strip of 56 px thumbnails above the input
  with ✕ badges; documents show a file tile with the name. Cap 4, over-cap → alert.
- Send: upload pending items sequentially with `uploadMedia` (purpose `message`;
  injected — see below), then `api.send({ threadId, body?, attachmentMediaAssetIds })`.
  Send button enables on text or pending attachment; shows the existing optimistic
  "sending" state. Failed uploads keep the draft for retry.
- `MessagesApi` type: extend `send` input; add an injected
  `upload(params) => Promise<mediaAssetId>` prop (each app passes its own `uploadMedia`
  wrapper, like `resolvePhoto` today) so `mobile-shared` stays dependency-light.

Bubbles:

- Images: rounded thumbnails inside the bubble (single image large, 2–4 in a grid),
  tap → full-screen viewer with swipe (reuse the album viewer pattern).
- Video: thumbnail + play glyph → full-screen player.
- File: chip with document icon, name (middle-truncated), size; tap resolves
  `getDownloadUrl` and opens with the system handler (same as mobile documents).
- Caption (`body`) renders under the media inside the same bubble.
- Own/other bubble colors and timestamps unchanged.

Thread rows in `MessagesListScreen`: render §7 preview.

All three apps pick this up automatically via `mobile-shared`; the only per-app change
is passing the `upload` prop from their routes.

## 9. Web UI (`conversation.tsx`)

- Paperclip + image buttons beside the Textarea; same pending strip, caps, and flow
  using the web presigned-upload helper.
- Bubbles mirror mobile: image grid → lightbox, video → player, file chip → download.
- Thread list preview per §7.

## 10. Localization

New keys in the `messages` namespace (uz / ru / en, identical across web + mobile):
`attachPhoto`, `attachVideo`, `attachFile`, `previewKind.image`, `previewKind.video`,
`previewKind.file`, `attachmentLimit` (`{{count}}`), `attachmentTooLarge`,
`uploadFailed`, `retry`, `download`. Verify uz lengths in the composer and thread rows.

## 11. Security And Safety

- Purpose `message` assets are downloadable **only** by thread participants (§5).
- Upload URL creation still requires center membership (`requireCenterUploader`).
- Size/mime validated server-side at `createUploadUrl`; client checks are UX only.
- Audit log entries for uploads already exist via the media service; message send
  audit behaviour unchanged.

## 12. Acceptance Criteria

1. A parent sends 3 photos with a caption to the teacher from parent mobile; the
   teacher sees the grid + caption on teacher mobile and on web.
2. A director sends a pdf to a parent; the parent downloads it with the original
   file name on mobile and web.
3. A video ≤100 MB sends and plays; a 26 MB image is rejected at `createUploadUrl`.
4. An attachment-only message shows a localized "Photo"/"File" preview in the thread
   list and notification — in uz, ru, and en, with no stored translated text.
5. A 5th attachment is blocked client-side and rejected server-side.
6. Deleting an attachment message shows "Message deleted" and its assets stop being
   downloadable.
7. A non-participant (including another teacher at the center) cannot resolve a
   download URL for a DM attachment.
8. Read state, unread counts, and pagination (10/page) behave exactly as before for
   attachment messages.
9. `pnpm typecheck` passes for `shared`, `api`, `web`, `mobile-shared`, and all three
   mobile apps.

## 13. Implementation Order

1. Shared schemas, `message` media purpose, thread `lastMessageKind` migration.
2. API: send/startThread attachments, hydration, preview/kind maintenance,
   participant-only download gate.
3. `mobile-shared` composer + bubbles + previews; wire `upload` prop in the three apps.
4. Web composer + bubbles + previews.
5. Translations, then typecheck all packages.
