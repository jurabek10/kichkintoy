# Complaints (Tamper-Proof Parent Feedback) Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/complaints.ts`, add procedures to `packages/shared/src/api/orpc/complaints.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `complaints` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned**. Related spec: [`direct-messages-spec.md`](./direct-messages-spec.md). Complaints are intentionally a **separate channel** from direct messages: messages are private and casual; complaints are formal, always visible to the director, and immutable.

## 1. Problem Statement

If a parent complains to a teacher through a private channel, the teacher is a single point of failure: they can ignore the complaint, quietly resolve it their own way, or (in a naive design) edit or delete it so the director never learns about it. Kidsnote has no dedicated feature for this — complaints travel through `쪽지` and suffer exactly this problem.

Kichkintoy solves it with three guarantees:

1. **The director always sees every complaint** in their center, automatically, regardless of who it is addressed to. There is no way to file a complaint the director cannot see.
2. **Nothing is ever editable or deletable — by anyone.** The API surface has no update/delete procedure for complaint content. A parent who changes their mind can *withdraw*, which only changes status; the full text and history stay visible to the director.
3. **Confidential mode:** a complaint *about* a teacher can be sent as `director_only`, so the teacher it concerns never sees it and cannot retaliate or interfere.

## 2. Scope

In scope:

- Parent files a complaint tied to one of their children: category, subject, body, visibility.
- Visibility: `teacher_and_director` (default) or `director_only` (confidential).
- Threaded replies under the complaint (parent ↔ staff), immutable.
- Status lifecycle: `open` → `in_progress` → `resolved`, plus parent-initiated `withdrawn`; parent reply to a resolved complaint reopens it.
- Director dashboard list of **all** center complaints with status/category filters.
- Teacher list limited to non-confidential complaints from their assigned classes.
- Notifications on create, reply, and status change.
- Full audit logging.
- Web dashboard pages + screens in all three mobile apps.

Out of scope for MVP:

- Anonymous complaints (director always sees the parent's identity; future consideration).
- Photo/file attachments.
- Complaints filed by teachers (staff grievances) — future.
- SLA timers / escalation reminders.
- Organization-level (multi-center) complaint roll-ups.

## 3. Vocabulary

- **Complaint:** a formal, immutable message from a parent to center staff about a problem.
- **Confidential complaint:** `visibility = 'director_only'`; invisible to all teachers.
- **Complaint reply:** an immutable threaded message under a complaint.
- **Resolution note:** required staff text when marking a complaint resolved.
- **Withdrawn:** parent closed their own complaint; content remains visible to the director.

## 4. Categories

Language-neutral tokens (follow the reports i18n convention — store tokens, translate at render):

```text
meals | safety | staff_behavior | fees | facility | health | curriculum | other
```

## 5. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| File complaint | No | No | No | For own child only |
| See all center complaints | **Yes, always — including confidential and withdrawn** | No | No | No |
| See class complaints (`teacher_and_director`) | Yes | Yes | No | No |
| See confidential complaints (`director_only`) | Yes | **No** | No | Own only |
| See own complaints | — | — | — | Yes |
| Reply | Yes | On visible ones | No | On own |
| Change status (`in_progress`, `resolved`) | Yes | On visible ones | No | No |
| Withdraw | No | No | No | Own, while not resolved |
| **Edit any complaint content** | **No** | **No** | **No** | **No** |
| **Delete any complaint or reply** | **No** | **No** | **No** | **No** |

Authorization rules:

- Parent access via `child_guardians` + active enrollment.
- Teacher access via active `teacher_class_assignments`, and only where `visibility = 'teacher_and_director'`.
- Director access is center-wide and unconditional — including complaints that name them in the body.
- When a teacher marks a complaint `in_progress`/`resolved`, the director can see who did it and when; a teacher resolving something never hides it (resolved complaints stay in the director's list with full history).

## 6. User Flows

### 6.1 Parent Files A Complaint

1. Parent opens **Complaints** and taps **New complaint**.
2. Selects child (if more than one).
3. Selects category.
4. Enters subject (max 120 chars) and body (max 4000 chars).
5. Chooses who can see it:
   - **Teacher and director** (default) — "Your class teacher and the director will both see this."
   - **Director only** — "Only the director will see this. Choose this if the complaint concerns a teacher."
6. Confirmation notice before submit: *"Complaints cannot be edited or deleted after sending."*
7. Submits. Complaint is `open`. Class is snapshotted from the child's active enrollment.
8. Director is notified always; assigned teacher(s) are notified only for `teacher_and_director`.

### 6.2 Staff Handles A Complaint

1. Staff opens **Complaints**; default filter: `open` + `in_progress`.
2. Opens a complaint; sees child, class, category, body, full reply history, status history.
3. Optionally marks `in_progress` (parent is notified: "Your complaint is being reviewed").
4. Replies as needed; parent is notified per reply.
5. Marks `resolved` with a required resolution note; parent is notified.

### 6.3 Parent Follows Up

1. Parent sees status changes and replies in their complaint detail.
2. Parent can reply anytime; replying to a `resolved` complaint sets it back to `open` (reopen) and notifies staff.
3. Parent can **withdraw** while the complaint is not `resolved`. Status becomes `withdrawn`; the teacher's list hides it; the director's list keeps it (badged "Withdrawn") with all content intact.

### 6.4 Director Oversight (the anti-tamper view)

1. Director's list shows **every** complaint: open, in progress, resolved, withdrawn, confidential.
2. Each row: child photo + name (one column), class, category, subject, status, filed date, last activity.
3. Detail shows the complete immutable timeline: original text, every reply, every status change with actor and timestamp.
4. Filters: status, category, class, period (All / Month / Day on mobile, matching the shared filter pattern).

## 7. Data Model

New tables (no reuse of `conversation_*` — different permission model and immutability guarantees):

```text
complaints
- id uuid pk
- center_id uuid
- class_id uuid nullable            // snapshot from active enrollment
- child_id uuid
- parent_user_id uuid
- category text
- subject text
- body text
- visibility text default 'teacher_and_director'   // teacher_and_director | director_only
- status text default 'open'                        // open | in_progress | resolved | withdrawn
- resolved_by_user_id uuid nullable
- resolved_at timestamptz nullable
- resolution_note text nullable
- last_activity_at timestamptz
- created_at timestamptz
// intentionally NO updated_at on content fields — content is write-once

complaint_replies
- id uuid pk
- complaint_id uuid
- sender_user_id uuid
- body text
- created_at timestamptz
// no deleted_at, no updated_at — write-once

complaint_status_events
- id uuid pk
- complaint_id uuid
- actor_user_id uuid
- from_status text
- to_status text
- note text nullable                // resolution note lives here too
- created_at timestamptz
```

Recommended indexes:

```text
@@index([centerId, status, lastActivityAt]) on complaints
@@index([classId, visibility, status]) on complaints
@@index([parentUserId, createdAt]) on complaints
@@index([complaintId, createdAt]) on complaint_replies and complaint_status_events
```

`complaint_status_events` is the source of truth for the director's timeline; `status` on the complaint is a denormalized current value updated in the same transaction.

## 8. oRPC Contract

Add a `complaints` contract group:

```text
complaints.create(input: CreateComplaintInput) -> ComplaintDetail
complaints.parentList(input: { childId?, status?, cursor? }) -> ComplaintListResponse
complaints.staffList(input: { centerId, status?, category?, classId?, cursor? }) -> ComplaintListResponse
complaints.detail(input: { complaintId }) -> ComplaintDetail        // includes replies + status events
complaints.reply(input: { complaintId, body }) -> ComplaintDetail
complaints.setStatus(input: { complaintId, status: 'in_progress' | 'resolved', resolutionNote? }) -> ComplaintDetail
complaints.withdraw(input: { complaintId }) -> ComplaintDetail
```

There is deliberately **no** `complaints.update`, `complaints.delete`, or reply delete procedure. `staffList` for a teacher server-side filters to `visibility = 'teacher_and_director'` and assigned classes and excludes `withdrawn`; for a director it returns everything.

## 9. Shared Schemas

Create `packages/shared/src/api/complaints.ts`:

- `complaintCategoryValues`, `complaintStatusValues`, `complaintVisibilityValues`
- `createComplaintInputSchema` — subject 1–120, body 1–4000, category enum, visibility enum, childId
- `complaintSummarySchema` (child with photo ref, class label, category token, subject, status, visibility, createdAt, lastActivityAt)
- `complaintReplySchema`, `complaintStatusEventSchema` (actor with photo ref per the name-photos convention)
- `complaintDetailSchema` (summary + body + replies + statusEvents + parent info)
- `setStatus` schema: `resolved` requires `resolutionNote` (1–1000).
- No `z.unknown()`.

## 10. Backend Service Rules

Create:

```text
packages/api/src/complaints/complaints.module.ts
packages/api/src/complaints/complaints.service.ts
packages/api/src/orpc/routers/complaints.router.ts
```

Service responsibilities:

- Validate parent-child guardianship and snapshot `class_id` from active enrollment on create.
- Enforce the visibility matrix in every read path (detail included — a teacher fetching a confidential complaint by ID gets generic not-found).
- Reopen on parent reply to `resolved`: write a status event `resolved → open` with the parent as actor, in the same transaction as the reply.
- Block `withdraw` after `resolved`; block staff `setStatus` on `withdrawn`.
- Update `last_activity_at` on reply and status change.
- Notifications (see §13) and audit on every mutation:

```text
complaint.created
complaint.replied
complaint.status_changed        // includes in_progress, resolved, reopened
complaint.withdrawn
```

Audit rows are the second tamper-evidence layer on top of `complaint_status_events`.

## 11. Frontend Routes

Web:

```text
packages/web/app/dashboard/complaints/page.tsx                    // role-aware list
packages/web/app/dashboard/complaints/new/page.tsx                // parent composer
packages/web/app/dashboard/complaints/[complaintId]/page.tsx      // detail + timeline
packages/web/app/dashboard/complaints/_components/*
```

Mobile (all three apps; parent app gets the composer, staff apps get handling views):

```text
app/complaints/index.tsx
app/complaints/new.tsx          // parent app only
app/complaints/[complaintId].tsx
```

Navigation: **Complaints** entry in the dashboard sidebar and mobile feature grid for all roles. Director nav shows an open-complaints count badge.

## 12. UI Requirements

- Use the frontend-design skill when building; complaints get their own domain accent color, distinct from messages.
- Web lists: TanStack Table, 10 per page, no horizontal scroll, child photo + name in one column, row numbers.
- Mobile lists: shared pattern — search field + funnel bottom-sheet (status filter + period All/Month/Day).
- Status badges: `open` (attention color), `in_progress`, `resolved` (success), `withdrawn` (muted).
- Confidential complaints show a lock icon + "Director only" label (parent and director views).
- Detail is a vertical timeline: original complaint card on top, then replies and status events interleaved chronologically, each with actor photo + name and 24h Tashkent timestamp.
- Composer shows the immutability warning (§6.1 step 6) styled as an info callout, and the visibility choice as two large radio cards with the explanatory text — this choice is the heart of the feature and must not look like a buried setting.
- Category tokens translated at render via the report-item-i18n pattern; all strings in uz/ru/en, uz verified for length.

## 13. Notifications

```text
complaint.created        → director(s) always; assigned teacher(s) only if teacher_and_director
  "New complaint" / "{parentName} filed a complaint about {categoryLabel}."
complaint.replied        → the other side (parent ↔ staff participants who can see it)
  "New reply to your complaint" / "{senderName} replied: {preview}"
complaint.in_progress    → parent
  "Complaint update" / "Your complaint is being reviewed."
complaint.resolved       → parent
  "Complaint resolved" / "Your complaint was resolved. Read the resolution note."
complaint.reopened       → staff who can see it
  "Complaint reopened" / "{parentName} replied to a resolved complaint."
```

Confidential complaints never generate a notification to any teacher. Deep-link to the complaint detail; grouped in the notifications inbox with the complaints domain icon.

## 14. Security And Safety

- No update/delete API surface for content — the guarantee is structural, not a permission flag.
- Teacher fetch of a confidential or out-of-class complaint returns generic not-found (no ID probing).
- Visibility filtering happens server-side only; the client never receives confidential rows to "hide".
- Complaint bodies never appear in logs.
- Rate limit `create` (e.g. 10/day/parent) against spam without silencing legitimate use.
- Withdrawn ≠ deleted: content persists and remains director-visible forever.
- `complaint_status_events` + audit log make any handling sequence reconstructable.

## 15. Acceptance Criteria

- Parent can file both visibility types; confirmation warning shown before submit.
- Director sees every complaint in the center, including `director_only` and `withdrawn`.
- Assigned teacher sees only `teacher_and_director` complaints for their classes; direct-ID fetch of a confidential one returns not-found.
- No API procedure exists to edit or delete a complaint or reply (verified by contract review).
- Teacher resolving a complaint leaves it fully visible to the director with actor + note in the timeline.
- Parent reply to a resolved complaint reopens it and notifies staff.
- Withdraw hides it from the teacher list but not the director list.
- Notifications fire per §13; teacher never notified about confidential complaints.
- All mutations audited; lists paginate at 10; `pnpm typecheck` passes across shared/api/web/mobile packages.

## 16. E2E Test Plan

Tamper path (the core test):

1. Parent files a `teacher_and_director` complaint about class conditions.
2. Teacher sees it, replies, marks resolved.
3. Director logs in and still sees the complaint, the teacher's reply, the resolution note, and the status timeline — nothing the teacher did removed it.

Confidential path:

1. Parent files a `director_only` complaint about the teacher.
2. Teacher's list does not contain it; direct fetch by ID → not-found; teacher received no notification.
3. Director sees and resolves it; parent gets the resolution.

Reopen/withdraw path:

1. Parent replies to a resolved complaint → status `open` again, staff notified.
2. Parent withdraws an open complaint → gone from teacher list, still in director list as `withdrawn`.

Permission path: parent B cannot fetch parent A's complaint; unassigned teacher sees an empty list; nobody can call a mutation that edits content (no such procedure).

## 17. Implementation Order

1. Shared schemas + oRPC contract.
2. Prisma migration (three new tables + indexes).
3. API module/service/router + notifications + audit.
4. Web: director/teacher list + detail timeline, parent composer.
5. Mobile: parent app (composer + list + detail), then teacher and director apps.
6. Typecheck all packages, then run the tamper, confidential, and reopen E2E paths.
