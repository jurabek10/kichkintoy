# Daily Reports (알림장) Spec

> Status: **planned (fast follow)**. Build [`class-and-teacher-management-spec.md`](./class-and-teacher-management-spec.md) first — it is the prerequisite and the immediate next deliverable.

## 1. Scope

This spec defines the **Daily Report** feature — Kichkintoy's equivalent of the Kidsnote 알림장. It is the single most important communication surface in the product: a teacher records a child's day, the parent reads it and replies, and the teacher sees who has read it.

This feature depends on [`class-and-teacher-management-spec.md`](./class-and-teacher-management-spec.md), which provides classes, teacher→class assignments, and the teacher class-roster views that report authoring relies on.

In scope:

- Teacher: see assigned classes and their children; create, edit, draft, schedule, and publish daily reports per child; bulk-create for a class; see read receipts; reply to parent comments.
- Parent: view published reports for their own children; mark-as-read (automatic); leave comments.
- Notifications on publish and on new comment.

Out of scope (separate specs): notices, albums, attendance, meal plans, medication, return-home, schedule; the media-upload pipeline internals (assumed available); mobile UI.

Builds on [`signup-center-selection-and-approval-spec.md`](./signup-center-selection-and-approval-spec.md) and [`kichkintoy-uzbekistan-system-design.md`](../design/kichkintoy-uzbekistan-system-design.md) §7.6.

## 2. Why This Feature

Onboarding only creates the relationships. The daily report is the first feature that delivers the actual product promise (design doc §1): *parents understand their child's day; teachers report care activities quickly.* In Kidsnote the 알림장 is what parents open every day — it drives retention. The design doc §7.6 calls daily reports "one of the most important modules."

## 3. Vocabulary

- **Daily report** (알림장): one `daily_reports` row, unique per `(child_id, report_date)`.
- **Report item**: a `daily_report_items` row — one structured entry (meal, nap, mood, temperature, …).
- **Read receipt**: a record that a specific guardian opened a published report.
- **Comment**: threaded text left by a parent or teacher on a published report.

## 4. Roles And Permissions

| Action | Director | Teacher (assigned) | Teacher (not assigned) | Parent |
|---|---|---|---|---|
| Create / edit daily report | Yes (any class in center) | Yes (their classes) | No | No |
| Publish / unpublish | Yes | Author only | No | No |
| Delete report | Author or director | Author only | No | No |
| View published report | Yes (center) | Yes (their classes) | No | Yes (own child) |
| Comment | Yes | Yes (their classes) | No | Yes (own child) |
| See read receipts | Yes | Yes (their classes) | No | No |

Authorization reuses `user_roles` (role/center), `teacher_class_assignments` (class scope, from the prerequisite spec), and `child_guardians` (parent→child), enforced in NestJS guards/services per design doc §24.

## 5. Daily Report Composition (Teacher)

### 5.1 Structure

A report = one `daily_reports` row + N `daily_report_items` rows. Top-level fields: `report_date` (required, not future), `mood`, `health_note`, `teacher_note` (the "선생님 메시지"), `status` (`draft` | `scheduled` | `published`).

### 5.2 Report Items

Each item is a `daily_report_items` row with `item_type`, optional `title`, `value`, `note`, `recorded_at`. Item types (design doc §7.6):

```text
meal        title=breakfast|lunch|snack|dinner, value=all|most|some|none
sleep       value=duration or start–end, note
toilet      value=count/status, note
mood        value=happy|calm|tired|fussy|sick
activity    title, note (free description)
temperature value=°C, recorded_at
medication  title=medicine, value=dose, note
health      note
custom      title + note (center-defined)
```

MVP renders a fixed section set (meals, nap, mood, temperature, activities, teacher note) plus an "add custom item" affordance. Center-configurable item templates (Kidsnote 항목 설정) are a future enhancement.

### 5.3 Photos

A report may attach 0..N images via the media pipeline (out of scope here), linked through `media_links` (`entity_type = 'daily_report'`, `entity_id = report.id`), reusing the existing `MediaAsset` / `MediaLink` schema.

### 5.4 Save Modes

Matching Kidsnote (임시저장 / 발송 / 예약발송):

- **Save draft** — `status = draft`. Hidden from parents, no notification.
- **Publish now** — `status = published`, `published_at = now()`. Creates read-receipt rows + notifications.
- **Schedule** — `status = scheduled`, `scheduled_at` set. A BullMQ worker (design doc §22) flips it to `published` at that time with the same side effects.

### 5.5 Bulk Create For A Class

Teacher picks a class + date → system creates a `draft` for every roster child without one for that date. Fill child-by-child, then "publish all drafts for this class/date" in one action. Each child still gets its own `daily_reports` row (the `(child_id, report_date)` uniqueness holds).

### 5.6 Edit / Unpublish / Delete

Published reports are editable by author or director (`updated_at` bumps; show an "edited" marker). Unpublish returns to `draft`. Delete cascades to items, reads, and comments.

## 6. Parent: Reading A Report

- The parent dashboard gains a **Reports** tab per child, listing published reports newest-first (`child_guardians` → `daily_reports` where `status = published`).
- Report detail shows date, teacher note, items grouped by type, photos, and the comment thread.
- Opening a report the parent hasn't read marks it read (§7).

## 7. Read Receipts

- On publish, create one read-receipt row per guardian of the child (new table §9.1).
- When a guardian opens the detail, set `read_at`.
- The teacher's view shows "Read by 1 of 2 guardians" with names + timestamps (읽음 확인).

## 8. Comments And Notifications

- Parents, assigned teachers, and directors comment on **published** reports. One-level threading for MVP; model supports `parent_comment_id` for future nesting. Authors can soft-delete (`deleted_at`).
- Notifications (two-layer model, design doc §21):

| Event | Recipient | In-app | Push | SMS |
|---|---|---|---|---|
| Daily report published | Each guardian of the child | yes | yes | no |
| New comment on report | Other party (author or guardians) | yes | yes | no |

Daily reports are push-only (frequent, not critical), per design doc §21.

## 9. Data Model

`daily_reports`, `daily_report_items`, `media_assets`, `media_links` already exist (schema §7.6, §7.8). Add `scheduled` to the app-level status enum/validation (the column already accepts any string).

### 9.1 New Table: `daily_report_reads`

```sql
CREATE TABLE daily_report_reads (
  id UUID PRIMARY KEY,
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (daily_report_id, guardian_user_id)
);
CREATE INDEX idx_daily_report_reads_report ON daily_report_reads(daily_report_id);
```

### 9.2 New Table: `daily_report_comments`

```sql
CREATE TABLE daily_report_comments (
  id UUID PRIMARY KEY,
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  parent_comment_id UUID REFERENCES daily_report_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_daily_report_comments_report ON daily_report_comments(daily_report_id, created_at);
```

### 9.3 Transactions

Publishing runs in one Prisma transaction: flip status, set `published_at`, insert read-receipt rows for all current guardians, enqueue notifications, write an `audit_logs` row (`daily_report.published`). On any failure, the report keeps its prior status.

## 10. API Endpoints

### 10.1 Teacher

```text
POST   /teacher/reports                                 { childId, reportDate, mood?, healthNote?, teacherNote?, items[], photoAssetIds[], publish?, scheduledAt? }
GET    /teacher/reports/:reportId
PATCH  /teacher/reports/:reportId
POST   /teacher/reports/:reportId/publish               { scheduledAt? }
POST   /teacher/reports/:reportId/unpublish
DELETE /teacher/reports/:reportId
POST   /teacher/classes/:classId/reports/bulk           { reportDate }   -> drafts for roster
POST   /teacher/classes/:classId/reports/publish-drafts { reportDate }
GET    /teacher/reports/:reportId/reads
POST   /teacher/reports/:reportId/comments              { body, parentCommentId? }
```

(`GET /teacher/classes` and `GET /teacher/classes/:classId/children` come from the prerequisite spec.)

### 10.2 Parent

```text
GET    /parent/children/:childId/reports                published, newest first
GET    /parent/reports/:reportId                        detail; marks read
POST   /parent/reports/:reportId/comments               { body, parentCommentId? }
```

### 10.3 Shared

```text
DELETE /reports/:reportId/comments/:commentId           soft delete (author only)
```

All payloads validated with Zod in `@kichkintoy/shared`, request/response schemas exported for the web client, following the existing contract pattern.

## 11. Web UI

```text
Teacher
  /dashboard/reports                 "Today" board: my classes, per-child report status
  /dashboard/reports/:classId        class roster for a date with quick status
  /dashboard/reports/new?childId=    composer
  /dashboard/reports/:reportId       view + read receipts + comments

Parent
  /dashboard/children/:childId       Reports tab (list)
  /dashboard/reports/:reportId       read view + comment box
```

Continues the shadcn + Kidsnote-blue system. The composer is one scrollable card with sections (meals, nap, mood, temperature, activities, teacher note, photos) and a sticky action bar (Save draft / Schedule / Publish).

## 12. Validation And Errors

- `reportDate` cannot be in the future.
- One report per `(child_id, report_date)`; duplicate create returns a clear error linking the existing report.
- Only an assigned teacher (or director) may author/publish for a class.
- A parent may only read/comment on reports for their own linked children.
- Cannot comment on a non-published report.
- Cannot publish an empty report (needs a teacher note, ≥1 item, or ≥1 photo).

## 13. Acceptance Criteria

- A teacher can create a draft report for a child; it is hidden from the parent.
- A teacher can publish a report; the parent is notified by push and sees it.
- A teacher can schedule a report; it auto-publishes at the scheduled time.
- A teacher can bulk-create drafts for a class and publish them together.
- One report per child per date is enforced.
- A parent sees only published reports for their own children; opening one marks it read; the teacher sees the receipt.
- A parent can comment; the teacher is notified and can reply.
- Publishing creates read-receipt rows and an audit log in one transaction.
- Deleting a report removes its items, reads, and comments.

## 14. Suggested Build Order

1. Single report authoring: create/draft/publish + composer UI.
2. Parent read view + read receipts.
3. Comments + notifications.
4. Bulk create + scheduled publish (BullMQ worker).

Ship 1–2 first for a working vertical slice; 3–4 are fast follows.

## 15. Open Questions

- Center-configurable item templates (Kidsnote 항목 설정) in v1, or fixed sections first? Spec assumes fixed.
- Two-way home note (가정 알림장) or comments-only for v1? Spec assumes comments only.
- Edit-after-publish: re-notify, or silent update with an "edited" marker? Spec assumes silent + marker.
- Retention period for published reports and their photos (sensitive children's data, design doc §14)?
