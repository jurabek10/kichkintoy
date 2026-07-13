# Comment Attachments (Reports / Notices / Albums) Spec

> **API note:** the app API is oRPC-only. Extend the existing comment schemas in
> `packages/shared/src/api/daily-reports.ts`, `notices.ts`, and `albums.ts`, and the
> procedures in the matching `packages/shared/src/api/orpc/*.contract.ts` files. Media
> upload reuses the existing presigned flow (`media.createUploadUrl` →
> `media.completeUpload` → `media.getDownloadUrl`). See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned**. The mobile comment composer (`CommentBar`) already shows
> image / video / attach icons on report, notice, and album detail screens in all three
> mobile apps — but they are decorative. The comment APIs accept text only. This spec
> makes those buttons real and brings the same capability to web.

## 1. Current State

- `packages/mobile/components/common/comment-bar.tsx` (duplicated in
  `teacher-mobile` and `director-mobile`) renders four icons under the input:
  `time-outline`, `image-outline`, `videocam-outline`, `attach` — none has an
  `onPress`. Used by `app/report/[id].tsx`, `app/notice/[id].tsx`, `app/album/[id].tsx`
  in all three apps.
- Comment endpoints exist and are text-only:
  `reports.addComment` / `reports.deleteComment`, and the equivalents on
  `notices` and `albums`. Request schemas are `{ body: string }`.
- Prisma models `DailyReportComment`, `NoticeComment`, `AlbumComment` store `body` only.
- Media infra already exists: `MediaAsset` + generic `MediaLink (entityType, entityId)`,
  presigned MinIO upload, `mediaPurposeValues` enum, per-purpose mime/size validation in
  `packages/api/src/media/media.service.ts`.
- Web comment composers: `reports/_components/report-detail-screen.tsx`,
  `notices/_components/notice-comments.tsx`, `albums/_components/album-detail-screen.tsx`.

## 2. Scope

In scope:

- Attaching **photos, videos, and documents** to comments on daily reports, notices,
  and album posts.
- All roles that can currently comment keep the same permission — attachments add no
  new comment permissions.
- Web + all three mobile apps (parent mobile is the design reference).
- Rendering attachments in the comment list: image thumbnails (tap → full-screen
  viewer), video with play affordance, file chip with name + size (tap → download/open).
- Deleting a comment removes its attachment links (existing soft-delete behaviour keeps
  the "deleted" placeholder; attachments are hidden with it).

Out of scope:

- Scheduled comments (the `time-outline` icon in `CommentBar` — **remove it**; it was
  never functional and Kidsnote's scheduled-comment feature is not planned).
- Editing a comment or its attachments after posting.
- Voice messages.
- Attachment-only comments on web MVP parity is required — attachment-only (no text)
  comments **are** allowed (see §5).

## 3. Vocabulary

- **Attachment:** a completed `MediaAsset` linked to a comment via `MediaLink`.
- **Comment kind:** which parent entity the comment belongs to — `report_comment`,
  `notice_comment`, or `album_comment` (the `MediaLink.entityType` values).

## 4. Limits And Allowed Types

| Kind | Mime types | Max size |
|---|---|---|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` | 25 MB |
| Video | `video/mp4`, `video/webm`, `video/quicktime` | 100 MB |
| Document | `application/pdf`, Word (`.doc`, `.docx`) | 25 MB |

- Max **4 attachments per comment** (mixed kinds allowed).
- Comment must have text (1–2000 chars) **or** at least one attachment; both is fine.
- Reuse the existing type sets in `media.service.ts` (`ALLOWED_IMAGE_TYPES`,
  `ALLOWED_VIDEO_TYPES`, `ALLOWED_DOCUMENT_TYPES`) — do not redefine them.

## 5. Shared Schemas

In `packages/shared/src/api/media.ts`:

- Add `"comment"` to `mediaPurposeValues`.
- The 100 MB video override in `createMediaUploadUrlInputSchema.superRefine` extends to
  `purpose === "comment" && mimeType.startsWith("video/")`.

In `comment-author.ts` (shared by all three comment features), add:

```ts
export const commentAttachmentSchema = z.object({
  mediaAssetId: uuidSchema,
  mediaType: z.enum(["image", "video", "file"]),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
});
```

Each comment request schema (`dailyReportCommentRequestSchema`, notice, album) becomes:

```ts
{
  body: z.string().trim().max(2000).optional(),   // was required
  attachmentMediaAssetIds: z.array(uuidSchema).max(4).default([]),
}
// refine: body non-empty OR attachments non-empty
```

Each comment output schema gains `attachments: z.array(commentAttachmentSchema)`.

## 6. Data Model

No new tables. Link attachments through the existing `MediaLink`:

- `entityType`: `"report_comment" | "notice_comment" | "album_comment"`.
- `entityId`: the comment id.

Rules:

- On comment create, validate every `mediaAssetId`: exists, `status` complete, same
  `centerId` as the parent entity, `uploaderUserId === current user`, purpose `comment`,
  and not already linked to another entity. Then create the `MediaLink` rows.
- On comment soft-delete, leave `MediaLink` rows in place (comment body is already kept);
  responses must return `attachments: []` for deleted comments, same as `body` is masked.
- Download access (`media.getDownloadUrl`) for a `comment`-purpose asset follows the
  parent entity's read permission: anyone who can read the report / notice / album post
  can fetch its comment attachments. Implement one gate in `media.service.ts` that
  resolves the `MediaLink` back to the parent entity and reuses the existing per-feature
  access checks.

## 7. oRPC Contract

No new procedures. The existing `addComment` inputs accept the extended request schema;
comment list outputs include `attachments`. `deleteComment` is unchanged.

## 8. Backend Service Rules

- Comment services (`reports`, `notices`, `albums`) share one helper (suggested:
  `packages/api/src/common/comment-attachments.ts`) that validates asset ids and creates
  links inside the same transaction as the comment insert.
- When hydrating comment lists, batch-load links + assets for the page of comments
  (one query, no N+1) and map to `commentAttachmentSchema`.
- Notifications: existing "new comment" notifications keep working; when a comment has
  no body, the notification preview uses a language-neutral kind token (`image` /
  `video` / `file`) translated at render time — **never** persist translated text
  (same rule as report items).

## 9. Mobile UI (all three apps, parent is the reference)

`CommentBar` changes (edit the file in each app — they are copies; keep them identical):

- Remove the `time-outline` icon.
- `image-outline` → `expo-image-picker` `launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true })`.
- `videocam-outline` → image picker with `mediaTypes: 'videos'`.
- `attach` → `expo-document-picker` (pdf + word types).
- Picked items render as a horizontal strip of 56 px thumbnails **above** the input,
  each with an ✕ badge to remove; documents show a file-type tile with the name.
- Enforce the 4-attachment cap client-side; over-cap picks show a toast/alert with a
  translated message.
- Send flow: upload each pending item via the existing `lib/upload.ts` `uploadMedia`
  (purpose `comment`) — sequentially, with the send button in a spinner state — then
  call `addComment` with `attachmentMediaAssetIds`. On failure, keep text + pending
  attachments so the user can retry.
- The send button enables when there is text **or** at least one pending attachment.

Comment list rendering (`comment-list.tsx` and feature comment components):

- Images: up to a 2×2 thumbnail grid under the body; tap opens the existing
  full-screen media viewer used by albums.
- Videos: thumbnail with a centered play glyph; tap opens the viewer.
- Files: rounded chip with document icon, file name (1 line, middle-truncated), size
  (`1.2 MB`); tap resolves `getDownloadUrl` and opens with the system handler
  (same pattern as mobile documents).

## 10. Web UI

- Comment composers on report / notice / album detail gain a paperclip and an image
  button (match the mobile order: image, video, attach); same pending-thumbnail strip
  above the input; same limits.
- Upload uses the web's existing presigned upload helper.
- Rendering matches mobile: thumbnail grid → lightbox, file chips → download.
- No horizontal scrolling; the grid wraps.

## 11. Localization

New keys (uz / ru / en, identical keys on web and all mobile apps), suggested namespace
`comments`: `addPhoto`, `addVideo`, `addFile`, `attachmentLimit` (with `{{count}}`),
`attachmentTooLarge`, `attachmentKind.image`, `attachmentKind.video`,
`attachmentKind.file`, `uploadFailed`, `retry`. Verify uz strings fit the composer row.

## 12. Acceptance Criteria

1. A parent can attach up to 4 photos to a daily-report comment from parent mobile; the
   teacher sees them on teacher mobile and web.
2. A teacher can attach a video (≤100 MB) to a notice comment; parents can play it.
3. A document (pdf/docx) attached to an album comment downloads with its original
   file name.
4. A comment with attachments and no text is valid; a comment with neither is rejected.
5. A 5th attachment is blocked client-side and rejected server-side.
6. Deleting a comment hides its attachments everywhere; the assets are no longer
   downloadable through that comment.
7. A user who cannot read the parent report/notice/album cannot resolve download URLs
   for its comment attachments.
8. All new strings exist in uz, ru, en; uz fits the UI.
9. `pnpm typecheck` passes for `shared`, `api`, `web`, and all three mobile apps.

## 13. Implementation Order

1. Shared schemas + `comment` media purpose.
2. API: upload gating, comment-attachment helper, extend the three comment services,
   download-permission gate.
3. Parent mobile `CommentBar` + comment list rendering; copy to teacher/director apps.
4. Web composers + rendering.
5. Translations, then typecheck all packages.
