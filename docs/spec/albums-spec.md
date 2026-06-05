# Albums / Photo Sharing Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/albums.ts`, add procedures to `packages/shared/src/api/orpc/albums.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under an `albums` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This follows the Kidsnote-style product order after reports and notices: reports tell one family about one child's day, notices send operational messages to many families, and albums share class memories with privacy controls.

## 1. Scope

This spec defines the **Album** feature: teacher/director photo sharing for classes and children. The goal is to let staff publish safe photo posts while parents only see photos they are allowed to see.

In scope:

- Director: view all center albums, create posts for any class, moderate/delete posts and comments.
- Teacher: create/edit/delete album posts for assigned classes.
- Parent: view album posts for their linked children, view class-wide posts when allowed, react/comment if enabled.
- Photo attachments, child tagging, class targeting, draft/publish flow, read access control, comments, reactions, in-app/push notifications.

Out of scope for MVP:

- AI face recognition / automatic child tagging.
- Printed photo books.
- Public share links.
- Video transcoding beyond simple uploaded video attachment support.
- Payment or store features.

## 2. Why This Feature

Albums are one of the core Kidsnote-style communication surfaces. For parents, photos create daily trust and emotional engagement. For centers, albums reduce manual messaging because one class post can reach many families while still protecting each child's privacy.

This feature should be built before more operational modules like attendance, medication, documents, or payments because it makes the product feel alive for parents immediately.

## 3. Core Product Rules

- A parent must never see a private child-tagged photo unless their own child is tagged.
- A class-wide photo can be visible to all guardians in the class only when the author marks it as class-visible.
- Staff can only publish inside their scope:
  - Director: any class in their center.
  - Teacher: only assigned classes.
- Every photo post belongs to one center and at least one class.
- Every uploaded media asset must be authorized through the API before display.
- Deleting an album post should hide it from parents immediately and keep an audit log.

## 4. Vocabulary

- **Album post:** a published or draft post containing caption text and media.
- **Media item:** one uploaded photo/video/file attached to an album post.
- **Tagged child:** a child connected to a specific media item or the whole post.
- **Class-wide visibility:** guardians of all active children in the target class can see the post.
- **Private child visibility:** guardians see only posts/media where their child is tagged.
- **Reaction:** a lightweight parent response, for example `heart`.

## 5. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create album post | Yes, any class in center | Yes, assigned classes | No | No |
| Save draft | Yes | Yes | No | No |
| Publish post | Yes | Yes, assigned classes | No | No |
| Edit own post | Yes | Yes | No | No |
| Delete own post | Yes | Yes | No | No |
| Moderate any center post | Yes | No | No | No |
| View all center posts | Yes | No | No | No |
| View assigned class posts | Yes | Yes | No | No |
| View parent feed | No | No | No | Own children only |
| Comment/react | Yes | Yes | No | Own visible posts only |

Authorization must be enforced in the oRPC router/service layer using:

- `user_roles` for center role.
- `teacher_class_assignments` for teacher scope.
- `child_guardians` plus active enrollments for parent scope.

## 6. MVP User Flows

### 6.1 Staff Creates Album Post

1. Staff opens **Albums**.
2. Clicks **New album post**.
3. Selects one or more classes.
4. Uploads 1..50 photos.
5. Adds caption.
6. Chooses visibility:
   - `class` - visible to all guardians in selected classes.
   - `tagged_children` - visible only to guardians of tagged children.
7. Tags children per post or per photo.
8. Chooses comment setting.
9. Saves draft or publishes.

### 6.2 Parent Views Album Feed

1. Parent opens **Albums**.
2. Feed shows posts visible to at least one of their children.
3. Parent can filter by child.
4. Opening a post shows only media the parent is allowed to see.
5. Parent can react/comment if enabled.

### 6.3 Director Moderates

1. Director opens center album list.
2. Can filter by class, author, date, and visibility.
3. Can delete inappropriate posts/comments.
4. Audit log records moderation actions.

## 7. Data Model

Use Prisma models with snake_case mapped table names to match the project style.

### 7.1 `album_posts`

```sql
CREATE TABLE album_posts (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  caption TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL, -- class | tagged_children
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_album_posts_center_status ON album_posts(center_id, status, published_at DESC);
CREATE INDEX idx_album_posts_author ON album_posts(author_user_id);
```

### 7.2 `album_post_classes`

```sql
CREATE TABLE album_post_classes (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, class_id)
);

CREATE INDEX idx_album_post_classes_class ON album_post_classes(class_id);
```

### 7.3 `album_media`

Media metadata may reuse the existing media pipeline if available. This table stores album-specific ordering and safety metadata.

```sql
CREATE TABLE album_media (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  caption TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, media_asset_id)
);

CREATE INDEX idx_album_media_post_position ON album_media(post_id, position);
```

### 7.4 `album_media_children`

```sql
CREATE TABLE album_media_children (
  id UUID PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, child_id)
);

CREATE INDEX idx_album_media_children_child ON album_media_children(child_id);
```

### 7.5 `album_post_children`

Optional post-level child tags. Use this when every media item in the post has the same children.

```sql
CREATE TABLE album_post_children (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, child_id)
);

CREATE INDEX idx_album_post_children_child ON album_post_children(child_id);
```

### 7.6 `album_comments`

```sql
CREATE TABLE album_comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_album_comments_post ON album_comments(post_id, created_at);
```

### 7.7 `album_reactions`

```sql
CREATE TABLE album_reactions (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, kind)
);

CREATE INDEX idx_album_reactions_post ON album_reactions(post_id);
```

## 8. Shared Schemas

Create `packages/shared/src/api/albums.ts`.

Required enums:

```ts
albumVisibilitySchema = z.enum(["class", "tagged_children"]);
albumStatusSchema = z.enum(["draft", "published"]);
albumReactionKindSchema = z.enum(["heart"]);
```

Core response schemas:

- `albumMediaSchema`
- `albumPostSummarySchema`
- `albumPostDetailSchema`
- `albumAudienceClassSchema`
- `albumCommentSchema`
- `albumReactionSummarySchema`

Input schemas:

- `createAlbumPostInputSchema`
- `updateAlbumPostInputSchema`
- `publishAlbumPostInputSchema`
- `deleteAlbumPostInputSchema`
- `listStaffAlbumsInputSchema`
- `listParentAlbumsInputSchema`
- `albumDetailInputSchema`
- `addAlbumCommentInputSchema`
- `deleteAlbumCommentInputSchema`
- `toggleAlbumReactionInputSchema`

Every schema must have a real output type. Do not use `z.unknown()`.

## 9. oRPC Contract

Create `packages/shared/src/api/orpc/albums.contract.ts` and compose it into the root contract.

Suggested procedures:

```text
albums.audience
albums.staffList
albums.parentList
albums.detail
albums.create
albums.update
albums.publish
albums.delete
albums.addComment
albums.deleteComment
albums.toggleReaction
```

### 9.1 Procedure Rules

- `audience`: staff-only. Returns classes and children available to the current author.
- `staffList`: director/teacher only. Returns posts in staff scope.
- `parentList`: parent only. Returns posts visible to linked children.
- `detail`: returns staff detail or parent-safe detail depending on role.
- `create/update/publish/delete`: staff-only, scoped by center/classes.
- `addComment/deleteComment/toggleReaction`: allowed only if the user can view the post.

## 10. API Service Behavior

Create a dedicated service and router:

```text
packages/api/src/albums/albums.module.ts
packages/api/src/albums/albums.service.ts
packages/api/src/orpc/routers/albums.router.ts
```

Service responsibilities:

- Validate class scope before writing.
- Validate child tags belong to selected classes and center.
- Run create/publish in a transaction.
- On publish, send notifications to guardians who can see the post.
- For parent reads, filter media items before returning the response.
- Write audit logs for create, publish, update, delete, moderation, and comment delete.

Important: parent filtering must happen server-side, not only in the UI.

## 11. Web UI

Routes:

```text
packages/web/app/dashboard/albums/page.tsx
packages/web/app/dashboard/albums/new/page.tsx
packages/web/app/dashboard/albums/[postId]/page.tsx
```

Components:

```text
packages/web/app/dashboard/albums/_components/staff-albums.tsx
packages/web/app/dashboard/albums/_components/parent-albums.tsx
packages/web/app/dashboard/albums/_components/album-composer.tsx
packages/web/app/dashboard/albums/_components/album-detail-screen.tsx
packages/web/app/dashboard/albums/_components/album-grid.tsx
```

Navigation:

- Add **Albums** to `DashboardShell`.
- Show for director, teacher, and parent.

TanStack Query keys:

```ts
albums: {
  all: ["albums"] as const,
  audience: () => ["albums", "audience"] as const,
  staffList: (input) => ["albums", "staffList", input] as const,
  parentList: (input) => ["albums", "parentList", input] as const,
  detail: (postId: string) => ["albums", "detail", postId] as const,
}
```

Mutation invalidation:

- Create/update/publish/delete: invalidate `albums.all`.
- Comment/reaction: invalidate `albums.detail(postId)` and the relevant list prefix.

## 12. UX Requirements

Staff list:

- Tabs: published, drafts.
- Filters: class, author, date.
- Cards show thumbnail, caption preview, classes, author, media count, published date.

Composer:

- Class selector.
- Visibility segmented control: class-wide / tagged children.
- Upload grid with stable thumbnail dimensions.
- Child tag selector.
- Caption textarea.
- Allow comments toggle.
- Save draft and publish buttons.

Parent feed:

- Combined feed by default.
- Child filter if parent has multiple children.
- Pinned or newest-first layout is acceptable for MVP; newest-first is simpler.
- Show media count and class/child context.

Detail:

- Responsive photo grid.
- Captions.
- Reactions.
- Comments if enabled.
- Staff-only metadata: author, classes, visibility, tagged children.

## 13. Storage Strategy

Use **Cloudflare R2** for album media in the MVP, matching the system design document's storage strategy. R2 is S3-compatible, so the backend should use an S3-compatible client and keep provider-specific code behind a small storage service boundary.

Required storage abstraction:

```text
MediaStorageService
- createUploadUrl()
- createDownloadUrl()
- deleteObject()
- getObjectMetadata()
```

MVP implementation:

```text
R2MediaStorageProvider
```

Future fallback if Uzbekistan data-residency rules or enterprise customers require local storage:

```text
MinIOMediaStorageProvider or another S3-compatible provider hosted in Uzbekistan
```

Important rules:

- Keep the R2 bucket private.
- Do not store public object URLs as the source of truth.
- Store object keys and metadata in `media_assets`.
- Upload directly from web/mobile to R2 using signed upload URLs created by the API.
- Serve images through short-lived signed download URLs, or through a protected media route that checks authorization before redirecting/signing.
- Validate MIME type, file extension, file size, and image dimensions before finalizing the upload.
- Use stable object keys, for example `centers/{centerId}/albums/{postId}/{mediaId}`.
- Keep the app code provider-neutral so R2 can be replaced without changing album business logic.

## 14. Privacy And Safety

This feature handles child photos, so it must be stricter than normal CRUD.

Required:

- Server-side media filtering for parent responses.
- No unsigned public media URLs in API responses.
- Short-lived signed R2 URLs or protected media route.
- Audit log for upload, publish, delete, moderation.
- Soft-delete comments; posts may be soft-deleted in app and hard-deleted later by retention job.
- File type and size validation.
- Limit upload count to 50 media items per post.
- Reject child tags outside selected classes.
- Reject parent access when `child_guardians` link is inactive or missing.

Recommended soon after MVP:

- Per-child photo consent field.
- Watermark/download restrictions for sensitive centers.
- Report abuse button for parents.
- Retention policy by center.

## 15. Notifications

On publish:

- Send in-app notification to every guardian who can see at least one media item.
- Send push notification when available.
- Deduplicate by guardian user ID; one guardian with two children should receive one notification.

On comment:

- Notify post author and relevant participants.
- Do not notify the comment author.

No SMS for albums in MVP.

## 16. Acceptance Tests

MVP is complete when:

- Director can create and publish a class-wide album post.
- Teacher can create and publish only for assigned classes.
- Teacher cannot publish to an unassigned class.
- Parent sees class-wide posts for their child's active class.
- Parent sees tagged-only posts only when their own child is tagged.
- Parent cannot fetch another child's private media by direct post ID.
- Parent can comment/react only on visible posts.
- Director can delete/moderate any center album post.
- Album media uploads use private Cloudflare R2 objects through signed upload URLs.
- Parent media reads return only short-lived signed URLs after server-side authorization.
- All oRPC outputs are strongly typed with Zod schemas.
- TanStack Query uses `queryKeys.albums`.
- Shared, API, and web typechecks pass.

## 17. Implementation Order

1. Add shared schemas and oRPC contract.
2. Add Prisma models and migration.
3. Add API service, module, router, and root router composition.
4. Add `MediaStorageService` and R2 provider for signed upload/download URLs.
5. Add query keys.
6. Add staff album list and composer.
7. Add parent album feed.
8. Add detail page with comments/reactions.
9. Run security checklist and E2E permission tests.

## 18. Later Enhancements

- AI-assisted child tagging.
- Video thumbnail generation.
- Bulk upload with drag sorting.
- Album export by child/date.
- Parent download permission per center.
- Photo consent workflow.
- Memory book / yearly album export.
- Optional MinIO/local Uzbekistan object storage provider if required by compliance.
