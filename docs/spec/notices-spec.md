# Notices (공지사항) Spec

> **API note (updated 2026-06-04): the app API is oRPC-only.** When this feature is built, add reusable schemas to `shared/src/api/notices.ts`, add oRPC procedures to a new `shared/src/api/orpc/notices.contract.ts`, compose them into [`orpc-contract.ts`](../../packages/shared/src/api/orpc-contract.ts) under a `notices` group, and consume them on web via the typed `orpc` client + TanStack Query. The REST-style `METHOD /path` endpoints below are conceptual and map to `orpc.notices.<procedure>`. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned (next deliverable)**. Builds on [`class-and-teacher-management-spec.md`](./class-and-teacher-management-spec.md) and [`daily-reports-spec.md`](./daily-reports-spec.md) (both implemented). Reuses the read-receipt, scheduled-publish, media, and notification plumbing from daily reports almost directly.

## 1. Scope

This spec defines the **Notice** feature — Kichkintoy's equivalent of the Kidsnote 공지사항. A daily report ([`daily-reports-spec.md`](./daily-reports-spec.md)) is **per child**; a notice is **one message sent to many** (a whole center, one or more classes, or a hand-picked set of children/parents) with read tracking, optional required confirmation, optional survey, and optional comments.

In scope:

- Director: create/edit/draft/schedule/publish notices to the **whole center, selected classes, or selected children**; pin important notices; see read receipts; nudge unread guardians; run surveys; close/delete.
- Teacher: the same, but **scoped to their assigned classes** (no center-wide send).
- Parent: view notices for their linked children; auto read-receipt; tap **Confirm** when required; respond to surveys; comment when enabled.
- Attachments (photos + files), draft / publish-now / scheduled-send, push + in-app notifications.

Out of scope (separate specs): albums, attendance, meal plans, medication, return-home, schedule; the media-upload pipeline internals (assumed available, same as daily reports §5.3); mobile UI (web-first; data model + API reused by mobile later); KinoLink in-app calling.

Builds on [`kichkintoy-uzbekistan-system-design.md`](../design/kichkintoy-uzbekistan-system-design.md) §7.7 (`notices`, `notice_recipients`), §7.8 (media), §10 (notification events), §21 (notification layers).

## 2. Why This Feature

The daily report tells one parent about one child. The notice is how a center runs **operationally**: "Closed Monday for the holiday", "Field trip Friday — sign the consent", "Bring a spare set of clothes", "Vote on the end-of-year event date". In Kidsnote it is, after 알림장 and 앨범, the third pillar of the daily loop. It completes the parent ↔ center communication channel: reports = care, notices = operations.

It deliberately **reuses** what daily reports already built:

- read receipts (`notice_recipients.read_at` ↔ `daily_report_reads.read_at`),
- scheduled publish (the BullMQ worker pattern from daily reports §5.4),
- media attachments (`media_links` with a new `entity_type`),
- comments (a `notice_comments` table mirroring `daily_report_comments`),
- the two-layer notification model.

So most of this spec is **targeting + confirmation + survey**, the parts a per-child report doesn't have.

## 3. Vocabulary

- **Notice** (공지사항): one `notices` row sent to a computed audience.
- **Target**: who receives it — `center` (all enrolled children's guardians), `class` (one or more classes), `child` / `selected_users` (hand-picked).
- **Recipient**: a `notice_recipients` row, one per (guardian, child) the notice reaches. Carries `read_at` and `confirmed_at`.
- **Read receipt**: `read_at` set when a guardian opens the notice (읽음 확인).
- **Required confirmation**: notice flag; the recipient must tap **Confirm** (`confirmed_at`) — used for consent-style notices (확인 요청).
- **Survey**: an optional single/multi-choice question attached to a notice with selectable options and aggregated results (설문/투표).
- **Nudge**: re-send a push to recipients who have not read (or not confirmed) yet.

## 4. Roles And Permissions

| Action | Director / Org owner | Teacher (assigned) | Teacher (not assigned) | Parent |
|---|---|---|---|---|
| Create center-wide notice | Yes | No | No | No |
| Create class notice | Yes (any class) | Yes (their classes) | No | No |
| Create child / selected notice | Yes (center) | Yes (within their classes) | No | No |
| Edit / unpublish | Author or director | Author only | No | No |
| Delete | Author or director | Author only | No | No |
| Pin / unpin | Director | No | No | No |
| See read receipts + nudge unread | Yes (their scope) | Yes (their classes) | No | No |
| View survey results | Author + director | Author | No | Own response only |
| View notice | Yes (center) | Yes (their classes) | No | Yes (own child) |
| Confirm / respond to survey | No | No | No | Yes (own child) |
| Comment (if enabled) | Yes | Yes (their classes) | No | Yes (own child) |

Authorization reuses `user_roles` (role/center), `teacher_class_assignments` (class scope), and `child_guardians` (parent→child), enforced in NestJS guards/services per design doc §24 — identical pattern to daily reports §4. A teacher targeting a class they are not assigned to is rejected.

## 5. Composing A Notice (Director / Teacher)

### 5.1 Top-Level Fields

- `title` (required, 1–120 chars).
- `body` (required, rich text/plain for MVP).
- `targetType` + targets (§5.2).
- `requiresConfirmation` (bool, default false) — turns on the **Confirm** button.
- `allowComments` (bool, default true) — per Kidsnote's per-post comment toggle.
- `isPinned` (bool, director only) — pins to the top of the parent list.
- `kind` (`announcement` | `survey`) — a survey adds §5.5.
- `status` (`draft` | `scheduled` | `published`).
- 0..N attachments (§5.4).

### 5.2 Targeting

The single most important difference from a daily report. `targetType` (design doc §7.7 enum):

```text
center           every active enrollment's guardians at the center   (director only)
class            one or more selected classes                        (director: any; teacher: assigned only)
child            one or more hand-picked children                    (within sender's scope)
selected_users   hand-picked guardians                               (within sender's scope)
```

For `class`, allow **multiple** classes in one notice (Kidsnote lets a director pick several). The audience is computed at **publish time** by expanding the target into the set of (child, guardian) pairs via `child_enrollments` (active) → `child_guardians`, then one `notice_recipients` row per pair. Children with no linked guardian yet produce no recipient row (and surface a "N children have no guardian" hint to the author).

### 5.3 Save Modes

Identical semantics to daily reports §5.4:

- **Save draft** — `status = draft`. No recipients, no notification.
- **Publish now** — `status = published`, `published_at = now()`; expand audience, create `notice_recipients`, enqueue notifications, audit log — in one transaction (§9.4).
- **Schedule** — `status = scheduled`, `scheduled_at` set; a BullMQ worker flips it to `published` with the same side effects. Matching Kidsnote's constraints: **`scheduled_at` ≥ now + 10 minutes** and **≤ now + 14 days**; offer presets (tomorrow morning, tomorrow afternoon, this afternoon) plus manual pick.

### 5.4 Attachments

Up to **50** media assets (Kidsnote's limit), photos **and** files (PDF/doc), via the existing media pipeline (signed MinIO/S3 upload, design doc §20). Linked through `media_links` with `entity_type = 'notice'`, `entity_id = notice.id` — same mechanism daily reports use for photos (§5.3), so no new media tables.

### 5.5 Survey / Poll (설문/투표)

When `kind = 'survey'`, the notice carries one question + 2..N options:

- `surveyQuestion` (text), `surveyMultiSelect` (bool), `surveyDeadline` (optional timestamptz), `surveyAnonymous` (bool — hide who voted from other parents; author/director always see counts).
- Options stored in `notice_survey_options` (§9.2). A parent picks one (or many if multi-select); stored in `notice_survey_responses` (§9.3), one row per (guardian, child, option).
- Results: author/director see per-option counts and (unless anonymous) who responded; a parent sees their own selection and, after responding or after the deadline, the aggregate counts.
- A survey response **also** sets the recipient's `confirmed_at` (responding implies acknowledgement).

### 5.6 Edit / Unpublish / Delete

- Published notices are editable by author or director (`updated_at` bumps; show an "edited" marker — silent, no re-notify, matching daily reports §5.6). Editing the audience target of an already-published notice is **not** allowed (would orphan receipts); to change audience, unpublish → edit → republish.
- **Unpublish** returns to `draft` and hides it from parents (receipts kept; re-publish reuses them).
- **Delete** cascades to recipients, comments, survey options/responses, and `media_links`.

## 6. Parent: Reading A Notice

- The parent dashboard gains a **Notices** surface (per child, plus a combined inbox across the parent's children). Pinned notices first, then newest published.
- Detail shows title, body, author + center/class, attachments, and — depending on flags — a **Confirm** button (§7), a **survey** (§5.5), and a **comment thread** (§8).
- Opening a notice the parent hasn't read sets `read_at` (§7), exactly like opening a daily report.
- A notice that `requiresConfirmation` and is unconfirmed is visually flagged ("Action needed") in the list.

## 7. Read Receipts & Confirmation

- On publish, one `notice_recipients` row per (guardian, child) in the audience, `read_at`/`confirmed_at` null.
- Opening detail → `read_at = now()` (idempotent).
- `requiresConfirmation` notice: parent taps **Confirm** → `confirmed_at = now()`.
- Author view (읽음 확인): "Read 18 / 25", and if confirmation required "Confirmed 12 / 25", each expandable to guardian names + timestamps, grouped by class for center/class notices.
- **Nudge unread**: author/director triggers a re-push to recipients with `read_at` null (or, for confirmation notices, `confirmed_at` null) — Kidsnote's "미확인 학부모에게 다시 알림". Rate-limited (e.g. once per 6h per notice) to avoid spam.

## 8. Comments And Notifications

- When `allowComments`, parents (own child), assigned teachers, and directors may comment on **published** notices. One-level threading for MVP (model supports `parent_comment_id`); authors soft-delete (`deleted_at`). Mirrors daily reports §8 and the `daily_report_comments` shape.
- Notifications (two-layer model, design doc §21):

| Event | Recipient | In-app | Push | SMS |
|---|---|---|---|---|
| Notice published | Each targeted guardian | yes | yes | optional* |
| Notice requires confirmation | Each targeted guardian | yes | yes | optional* |
| Nudge (unread/unconfirmed) | Unread/unconfirmed guardians | yes | yes | optional* |
| New comment on notice | Author + other guardians of that child | yes | yes | no |
| Survey closing soon (optional) | Guardians who haven't responded | yes | yes | no |

\* Notices can be operationally important (closures, consent deadlines). Default push-only; let the author mark a notice **Important** to add SMS fallback for unread recipients after a delay (design doc §21 "important event"). Center pays SMS (Eskiz.uz), so SMS is opt-in per notice, off by default.

## 9. Data Model

`notices`, `notice_recipients` already exist (design doc §7.7). Media reuses `media_assets` / `media_links`. Needed changes:

### 9.1 `notices` — added columns

```sql
ALTER TABLE notices ADD COLUMN kind TEXT NOT NULL DEFAULT 'announcement'; -- announcement | survey
ALTER TABLE notices ADD COLUMN requires_confirmation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notices ADD COLUMN allow_comments BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE notices ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notices ADD COLUMN is_important BOOLEAN NOT NULL DEFAULT false; -- enables SMS fallback
ALTER TABLE notices ADD COLUMN survey_question TEXT;
ALTER TABLE notices ADD COLUMN survey_multi_select BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notices ADD COLUMN survey_anonymous BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notices ADD COLUMN survey_deadline TIMESTAMPTZ;
ALTER TABLE notices ADD COLUMN last_nudged_at TIMESTAMPTZ;
```

`target_type` already accepts `center | class | child | selected_users`. For multi-class/multi-child targeting, persist the explicit selection (so the author UI can re-render it and edits are possible pre-publish):

### 9.2 New table: `notice_targets` (selection) + `notice_survey_options`

```sql
CREATE TABLE notice_targets (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,          -- class | child | user
  target_id UUID NOT NULL,            -- class_id | child_id | user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notice_id, target_kind, target_id)
);
CREATE INDEX idx_notice_targets_notice ON notice_targets(notice_id);

CREATE TABLE notice_survey_options (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notice_survey_options_notice ON notice_survey_options(notice_id, position);
```

(`target_type = center` needs no `notice_targets` rows; the whole center is implied.)

### 9.3 New table: `notice_survey_responses`

```sql
CREATE TABLE notice_survey_responses (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES notice_survey_options(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notice_id, option_id, guardian_user_id, child_id)
);
CREATE INDEX idx_notice_survey_responses_notice ON notice_survey_responses(notice_id);
```

Single-select is enforced in the service (delete prior response for the notice before inserting); multi-select allows several rows.

### 9.4 New table: `notice_comments`

Mirrors `daily_report_comments` (daily reports §9.2):

```sql
CREATE TABLE notice_comments (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),         -- which child context (parent comments)
  parent_comment_id UUID REFERENCES notice_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notice_comments_notice ON notice_comments(notice_id, created_at);
```

### 9.5 Transactions

Publishing runs in one Prisma transaction (same shape as daily reports §9.3): flip status, set `published_at`, expand the target into `notice_recipients` rows (dedupe on `(notice_id, user_id, child_id)`), enqueue notifications, write an `audit_logs` row (`notice.published`). On any failure the notice keeps its prior status.

## 10. API Endpoints

Follows the existing route groups. Director/teacher authoring under their respective guards (`@DirectorOnly()` for center-wide; assignment check for teachers, per class-mgmt spec).

### 10.1 Author (director + teacher)

```text
POST   /notices                                  { title, body, targetType, targets[], requiresConfirmation?, allowComments?, isPinned?, isImportant?, kind?, survey?, attachmentAssetIds[], publish?, scheduledAt? }
GET    /notices/:noticeId                         author view (+recipients summary, +survey results)
PATCH  /notices/:noticeId
POST   /notices/:noticeId/publish                 { scheduledAt? }
POST   /notices/:noticeId/unpublish
DELETE /notices/:noticeId
POST   /notices/:noticeId/pin                     (director)
POST   /notices/:noticeId/unpin                   (director)
GET    /notices/:noticeId/recipients              read/confirm status, grouped by class
POST   /notices/:noticeId/nudge                   re-push unread/unconfirmed (rate-limited)
GET    /notices/:noticeId/survey/results
GET    /notices                                   author's notices (filter by scope/status/date)
```

### 10.2 Parent

```text
GET    /parent/notices                            inbox across linked children (pinned first, newest)
GET    /parent/children/:childId/notices          per child
GET    /parent/notices/:noticeId                  detail; marks read
POST   /parent/notices/:noticeId/confirm          sets confirmed_at
POST   /parent/notices/:noticeId/survey           { optionIds[] }   (sets confirmed_at)
```

### 10.3 Shared

```text
POST   /notices/:noticeId/comments                { body, parentCommentId?, childId? }
DELETE /notices/:noticeId/comments/:commentId     soft delete (author only)
```

All payloads validated with Zod in `@kichkintoy/shared`, request/response schemas exported for the web client, following the daily-reports contract pattern (`NoticeSummary`, `NoticeDetail`, `NoticeRecipientStatus`, `SurveyResults`, `CreateNoticeRequest`, …).

## 11. Web UI

Continues the shadcn + Kidsnote-blue system. Mirrors the daily-reports routes.

```text
Director / Teacher
  /dashboard/notices                 List of sent/draft/scheduled notices: title, audience chip,
                                     read ratio (18/25), status, pinned star. "New notice" button.
  /dashboard/notices/new             Composer (one scrollable card):
                                       - title, body
                                       - audience picker (center [director] / classes / children)
                                       - toggles: requires confirmation, allow comments,
                                         important (SMS), pin [director]
                                       - optional survey builder (question + options + multi/deadline)
                                       - attachments (up to 50)
                                       - sticky action bar: Save draft / Schedule / Publish
  /dashboard/notices/:noticeId       Author view: content + recipients tab (read/confirm,
                                     grouped by class, "Nudge unread") + survey results + comments.

Parent
  /dashboard/notices                 Inbox (pinned first); "Action needed" badge for unconfirmed.
  /dashboard/notices/:noticeId       Read view + Confirm button + survey + comment box.
```

Sidebar (`DashboardShell`) gains **Notices** for directors, teachers, and parents. Reuses `Dialog`, `Select`/multi-select for audience, `Switch` (added in class-mgmt spec) for toggles, `Badge` for audience/status chips, `sonner` toasts, and the existing media-attachment component from the report composer.

## 12. Validation And Errors

- `title` required (1–120), `body` required.
- Center-wide target rejected for teachers (403).
- Class/child targets must belong to the sender's scope (teacher: assigned classes; otherwise 403).
- `scheduledAt` must be ≥ now+10min and ≤ now+14days.
- Survey requires `surveyQuestion` + ≥2 options; a survey notice cannot be published with 0 options.
- Cannot publish a notice with no audience (target expands to 0 recipients) — clear error.
- Parent may only read/confirm/respond/comment for their own linked children.
- Cannot confirm/respond/comment on a non-published notice; cannot respond to a survey past its deadline.
- Nudge rate-limited (≥6h since `last_nudged_at`).
- Comments rejected when `allowComments = false`.

## 13. Acceptance Criteria

- A director can send a center-wide notice; every enrolled child's guardians receive it and are notified by push.
- A teacher can send a notice to their assigned class only; targeting another class is blocked.
- A notice can target multiple classes or a hand-picked set of children in one send.
- Draft is hidden from parents; scheduled auto-publishes at `scheduled_at` (≥10min, ≤14d) via the worker, with full publish side effects.
- Opening a notice marks it read; the author sees "read X / N" grouped by class.
- A `requiresConfirmation` notice shows parents a Confirm button; the author sees confirmed counts and can nudge the unconfirmed.
- A survey notice lets parents pick option(s); author sees aggregated results; responding also confirms.
- Pinned notices appear first in the parent list; only directors can pin.
- An Important notice adds SMS fallback to unread recipients after the configured delay.
- Comments work only when enabled; notifications fire on publish, confirm-required, nudge, and new comment.
- Publishing creates recipient rows + audit log in one transaction; delete cascades to recipients, comments, survey data, and media links.

## 14. Suggested Build Order

1. **Core announcement**: create/draft/publish + targeting (center/class/child) + parent read view + read receipts. (Vertical slice — ship this first.)
2. **Required confirmation + nudge unread.**
3. **Comments** (reuse daily-report comment code) **+ notifications** (publish, confirm, comment).
4. **Survey/poll** (options, responses, results).
5. **Scheduled send** (BullMQ worker — reuse the daily-report scheduler) **+ Important/SMS fallback + pinning.**

Ship 1 for a working end-to-end notice; 2–5 are independent fast follows.

## 15. Open Questions

- Notice **categories** (Kidsnote groups notices, e.g. general / event / emergency) in v1, or flat list first? Spec assumes flat + `isPinned` + `isImportant`.
- Should center-wide notices also reach **teachers** (staff announcements), or guardians only? Spec assumes guardians; a staff-notice variant can target `user` roles later.
- Survey result visibility to parents: live counts, or only after responding / after deadline? Spec assumes after responding or deadline (and `surveyAnonymous` hides voter identities).
- Retention period for notices + attachments (sensitive data, design doc §14)? Same open question as daily reports — resolve once, globally.
- Read-receipt expansion at publish vs. lazy on first open for very large centers? Spec assumes eager rows at publish (consistent with daily reports); revisit if a center exceeds a few thousand recipients.

---

Sources for Kidsnote 공지사항 behavior: [Kidsnote scheduled-send guide](https://www.with-kidsnote.com/guide/tip_diretor_11), [Kidsnote notice guide (parents)](https://www.with-kidsnote.com/guide/parentsnotice/app), [Kidsnote 알림장/공지사항/앨범 FAQ](https://www.with-kidsnote.com/faq/teacher_08), [Kidsnote notice usage guide](https://www.with-kidsnote.com/21756af8-089a-433a-898c-dc251f668933).
