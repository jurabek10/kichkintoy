# Parent Cron Notifications Spec

> Status: **approved for implementation**. Adds scheduled (cron) notifications for parents: a daily
> digest of the child's day, day-before event reminders, tuition payment reminders, a Sunday
> weekly recap, document deadline reminders, and a one-time nudge for unread important notices.
> Teacher and director cron jobs come later and reuse the same scheduler foundation.

> **API note:** no new client-facing endpoints. Cron jobs run inside `packages/api` and write
> rows through the existing `NotificationsService.enqueue`, so everything lands in the existing
> notification inbox (web + mobile) and the realtime bell, with zero client changes required
> beyond new translation keys and metadata-driven bodies.

## 1. Goal

Parents currently only get event-driven notifications (check-in, new report, new album…).
This feature adds **time-driven** notifications so that every evening the parent gets one
warm, complete summary of their child's day without opening the app, plus proactive
reminders (events tomorrow, tuition due, documents due, unread important notices).

The daily digest is deliberately **more general than the teacher-written daily report**: it is
assembled automatically from raw data (attendance, meals, sleep, activities) and is sent even
when the teacher wrote no report.

## 2. Scope

In scope:

- Scheduler foundation in `packages/api` using `@nestjs/schedule`, all jobs in **Asia/Tashkent**.
- Six parent-facing cron jobs (J1–J6 below).
- Idempotent delivery (safe across restarts and repeated runs).
- New notification types + uz/ru/en translations.
- Language-neutral `metadata` payloads; clients render localized bodies (same principle as
  report-item i18n tokens — never persist translated text).
- A `cron_job_runs` log table for observability.
- Dev-only manual trigger to test each job.

Out of scope (MVP):

- Teacher and director cron jobs (section 10 lists the planned ones so the foundation fits them).
- Actual push delivery to devices (APNs/FCM/Expo). Jobs enqueue `in_app` + `push` channels like
  existing code; `push` rows stay `pending` until push delivery is implemented.
- SMS for cron notifications.
- Per-notification-type opt-out settings UI.
- Quiet-hours enforcement (belongs to the future push-delivery layer; in-app rows are silent).
- Catch-up of runs missed while the server was down (logged in `cron_job_runs`, not replayed).
- Per-class payment day set by the director (future feature; it will only change `Invoice.dueDate`,
  the reminder job J3 does not change).

## 3. Scheduler foundation

- New dependency: `@nestjs/schedule` (`ScheduleModule.forRoot()` in `app.module.ts`).
- New module `packages/api/src/crons/` with `crons.module.ts` and one service per job family:
  - `parent-digest.cron.ts` (J1, J4)
  - `parent-reminders.cron.ts` (J2, J5, J6)
  - `tuition-reminder.cron.ts` (J3)
- Every `@Cron` declaration sets `timeZone: "Asia/Tashkent"` explicitly.
- Single API instance today, so no distributed locking; each run still starts by inserting a
  `cron_job_runs` row and each notification is deduped (section 5), so an accidental second
  instance or a restart mid-run cannot double-send.
- Job code pattern: gather targets → for each target build metadata → dedupe check → `enqueue`.
  Failures on one target are logged and skipped, never abort the whole run.

New table:

```prisma
model CronJobRun {
  id         String    @id @default(uuid()) @db.Uuid
  jobName    String    @map("job_name")
  runDate    DateTime  @map("run_date") @db.Date   // Tashkent calendar date of the run
  startedAt  DateTime  @default(now()) @map("started_at") @db.Timestamptz(6)
  finishedAt DateTime? @map("finished_at") @db.Timestamptz(6)
  status     String    @default("running")          // running | succeeded | failed
  sentCount  Int       @default(0) @map("sent_count")
  error      String?

  @@unique([jobName, runDate])
  @@map("cron_job_runs")
}
```

The `@@unique([jobName, runDate])` doubles as a same-day re-run guard: if a run for today
already `succeeded`, the job exits immediately (dev manual triggers bypass this).

## 4. Jobs

Schedule overview (all times Asia/Tashkent):

| Job | Name | Cron | Days |
| --- | --- | --- | --- |
| J1 | `parent.daily_digest` | `30 20 * * 1-6` | Mon–Sat 20:30 |
| J2 | `parent.tomorrow_events` | `35 20 * * *` | every day 20:35 |
| J3 | `parent.tuition_reminder` | `0 10 * * 1-6` | Mon–Sat 10:00 |
| J4 | `parent.weekly_recap` | `0 19 * * 0` | Sunday 19:00 |
| J5 | `parent.document_deadline` | `5 10 * * *` | every day 10:05 |
| J6 | `parent.notice_nudge` | `30 19 * * *` | every day 19:30 |

J1 skips Sunday by design. J2/J5/J6 run all 7 days because a Monday event/deadline needs its
reminder on Sunday. Everything is batched into at most two windows (morning ~10:00,
evening 19:30–20:35) so a parent never gets pushes scattered across the day.

### J1 — Daily digest (Mon–Sat 20:30)

One notification **per child per guardian** summarizing today from raw data.

Targets: every active `Child` with an active enrollment whose `AttendanceRecord` for today
exists and is a "present" status (checked in and/or out). For each child, notify every linked
guardian (`ChildGuardian`).

Skip rules:

- No attendance record for today, or status is absent → **skip** (an 8:30pm "your child was
  absent" tells the parent nothing new).
- Attendance exists but literally nothing else recorded (no meals, no report items, no
  schedule) → still send; check-in/check-out alone is a valid summary.

Data assembled into `metadata` (all language-neutral tokens/numbers/ISO strings):

| Section | Source | Metadata shape |
| --- | --- | --- |
| Check-in / check-out | `AttendanceRecord.checkInAt/checkOutAt` | ISO timestamps |
| Picked up by | `AttendanceRecord.pickedUpBy/pickedUpRelationship` | name + relationship token |
| Meals | published `MealPost` (type breakfast/lunch/snack) targeting the child's class + `MealChildStatus` | `[{ mealType, menuText, eatingStatus }]` with `eatingStatus` ∈ `ate_all/ate_most/ate_some/did_not_eat` |
| Sleep | published `DailyReport` items with `itemType = "sleep"` | total minutes (sum of items; from `value`/`recordedAt` pairs as recorded today) |
| Activities / class | `Schedule` rows for the child's class overlapping today + report items with `itemType = "activity"` | `[{ title }]` |

Notification:

- `notificationType`: `digest.daily`
- `entityType`/`entityId`: `child` / childId (tapping opens the child's day — reports tab)
- `title` (stored English fallback; clients localize by type key): "Daily summary"
- `body`: short stored fallback ("Summary for {childFirstName} — 25.06.2026"); clients render
  the full localized body from `metadata`.
- Dedupe key: (`userId`, `digest.daily`, childId, today).

Rendered example (uz, the reference language):

> **Kunlik xulosa — Aziza**
> 08:42 keldi · 17:15 ketdi (otasi olib ketdi)
> Nonushta: sutli bo'tqa — hammasini yedi · Tushlik: osh — ko'p qismini yedi
> Uyqu: 2 soat 10 daqiqa
> Mashg'ulotlar: ingliz tili, rasm

### J2 — Tomorrow's events & notices reminder (every day 20:35)

Reminds parents about calendar events happening **tomorrow** (Tashkent date).

Targets: `CalendarEvent` with `status = "scheduled"` and `startsAt` on tomorrow's Tashkent
date, audience resolved via `audienceType` + `CalendarEventClass`/`CalendarEventChild` to the
parent's children. Multiple events for one family are bundled into **one** notification listing
all of them (never one push per event).

This is independent of the existing per-event `reminderMinutesBefore`/`reminderSentAt` feature;
that stays as-is for same-day reminders. Dedupe here is by notification row, not by
`reminderSentAt`.

Notification:

- `notificationType`: `digest.tomorrow_events`
- `entityType`/`entityId`: `calendar_event` / first event id (single event) or null (bundle)
- `metadata`: `[{ eventId, title, startsAt, endsAt, allDay, locationText }]`
- Dedupe key: (`userId`, `digest.tomorrow_events`, tomorrow's date).

Example (uz): "Eslatma: ertaga 15-iyul — Ota-onalar tashrifi (10:00, hovli)".

### J3 — Tuition payment reminder (Mon–Sat 10:00, D-7 until paid)

Because invoices are **lazily materialized** (created when the parent opens the payments
screen), the job cannot just scan existing `Invoice` rows — a parent who never opened the
screen would have no invoice and get no reminder.

Flow, per enrolled child (reusing the enrollment/materialization logic of
`payments.service.ts` — extract `ensureMonthInvoice` + the enrollment query into a shared
helper rather than duplicating):

1. Compute the current Tashkent month and materialize the invoice if missing
   (`dueDate` = period end today; the future per-class payment-day feature will change only
   this value).
2. If invoice status is paid → nothing.
3. If today ≥ `dueDate - 7 days` → remind the primary guardian (`ChildGuardian.isPrimary`),
   with wording that escalates: `upcoming` (D-7…D-2) → `due_tomorrow` (D-1) → `due_today`
   (D-0) → `overdue` (past due, still unpaid).
4. Reminders repeat daily (Mon–Sat) until the Payme/Click webhook flips the invoice to paid —
   then they stop automatically because step 2 short-circuits.

Notification:

- `notificationType`: `payment.reminder`
- `entityType`/`entityId`: `invoice` / invoiceId (tapping opens the payments screen)
- `metadata`: `{ childId, amount, currency, dueDate, phase }` — amount rendered client-side as
  `25.000.000 so'm`.
- `priority`: `normal` for `upcoming`, `high` from `due_tomorrow` onward.
- Dedupe key: (`userId`, `payment.reminder`, invoiceId, today) — max one per invoice per day.

### J4 — Weekly recap (Sunday 19:00)

Sunday has no daily digest, so it gets the nicest notification of the week instead: a recap of
Monday–Saturday, one per child per guardian.

Counts (Mon–Sat of the ending week, Tashkent):

- Days attended: `AttendanceRecord` present-status days vs. days the center operated
  ("attended 5 of 6 days").
- New photos of the child: `AlbumMedia` in published posts where the child is tagged
  (`AlbumMediaChild`), created this week.
- Daily reports published for the child this week.
- Notices published to the parent this week (`NoticeRecipient` rows created this week).

Skip rule: if every count is zero (child on vacation, center closed) → skip.

Notification:

- `notificationType`: `digest.weekly`
- `entityType`/`entityId`: `child` / childId
- `metadata`: `{ weekStart, weekEnd, attendedDays, operatingDays, photoCount, reportCount, noticeCount }`
- Dedupe key: (`userId`, `digest.weekly`, childId, weekStart).

Example (uz): "Bu hafta: 5 kun qatnashdi · 14 ta yangi rasm · 6 ta kunlik hisobot".

### J5 — Document deadline reminder (every day 10:05, D-3 and D-1)

Targets: `StudentDocumentRequest` with `status = "sent"`, `dueDate` = today+3 or today+1,
resolved to the parent's children via request classes/children, where the child's
`StudentDocumentSubmission` is missing or has status `not_started`, `draft`, or
`needs_correction` (i.e. the parent still has to act). Submitted/approved → no reminder.

Notification:

- `notificationType`: `document.deadline_reminder`
- `entityType`/`entityId`: `student_document` / requestId
- `metadata`: `{ requestId, childId, title, dueDate, daysLeft }` (`daysLeft` ∈ 3 | 1)
- Dedupe key: (`userId`, `document.deadline_reminder`, requestId, childId, `daysLeft`) — exactly
  two reminders per request maximum, ever.

### J6 — Unread important notice nudge (every day 19:30, once ever)

Targets: published `Notice` with `isImportant = true` **or** `requiresConfirmation = true`,
published more than 24h ago and less than 7 days ago, where the parent's `NoticeRecipient`
has `readAt = null` (or `confirmedAt = null` when confirmation is required).

Hard cap: **one nudge per notice per parent, ever.** Dedupe key: (`userId`,
`notice.unread_nudge`, noticeId) with **no date component** — a prior nudge on any day blocks
forever. Multiple qualifying notices in one evening are bundled into a single notification.
(The existing `Notice.lastNudgedAt` belongs to the manual teacher-side nudge and is not used
here.)

Notification:

- `notificationType`: `notice.unread_nudge`
- `entityType`/`entityId`: `notice` / noticeId (or null for a bundle)
- `metadata`: `[{ noticeId, title, requiresConfirmation }]`

## 5. Idempotency & delivery

- `Notification` has a nullable `dedupeKey` column. Cron notifications populate it with a
  stable logical key derived from the per-job identities above; ordinary notifications leave
  it null. The database enforces uniqueness for non-null keys.
- Date-based keys use the job's selected Tashkent processing date, not `Notification.createdAt`.
  This keeps historical backfills idempotent without falsifying when a notification was
  actually created or changing its inbox ordering.
- Enqueue claims the logical key and creates the notification channels atomically. A unique-key
  conflict means another scheduled or manual attempt already delivered the logical
  notification, so the attempt skips silently.
- Channels: `["in_app", "push"]`, matching the existing enqueue pattern. `in_app` is delivered
  immediately through the realtime gateway and the inbox; `push` rows wait for the future
  delivery worker.
- All channels for one target are created in one transaction. Only the canonical `in_app` row
  stores the logical key; the companion delivery rows remain linked by their shared payload.

## 6. i18n

- New keys in `packages/translations/src/locales/{uz,ru,en}/notifications.json` under `types.`:
  `digest.daily`, `digest.tomorrow_events`, `digest.weekly`, `payment.reminder`,
  `document.deadline_reminder`, `notice.unread_nudge` — same mechanism the inbox already uses
  to localize titles by `notificationType`.
- Bodies are rendered client-side from `metadata` with new keys in a `cron` (or extended
  `notifications`) namespace: meal type names, eating-status phrases (`ate_all` → "hammasini
  yedi"), sleep duration format, payment phases, recap line. Web and all mobile apps share the
  identical keys (a shared render helper in `packages/mobile-shared` + a web counterpart,
  following the `report-item-i18n.ts` pattern).
- Stored `title`/`body` are English fallbacks only; **no translated text is persisted**.
- Formats per project rules: Tashkent time, 24-hour, `25.06.2026` dates, `15-iyun` month names,
  `25.000.000 so'm`.
- Verify uz strings fit push/inbox line lengths (uz runs long).

## 7. Client changes

- Inbox (web + parent mobile): map the six new `notificationType`s in `notification-visuals.ts`
  (icon + domain color: digest → home/sky, events → calendar color, payment → payments green,
  document → documents color, notice → notices color) and add the metadata body renderers.
- Tap-through routes: digest → child's reports/day view; events → calendar; payment → payments
  screen; document → document request; notice → notice detail.
- No new screens.

## 8. Manual trigger

Manual runs go through the super-admin dashboard — see `admin-cron-monitoring-spec.md`
(`admin.crons.runNow`): runs one job for an arbitrary Tashkent date, bypassing the
`cron_job_runs` same-day guard but **not** the per-notification dedupe. That page is also the
verification path in review. The crons module exports a static job registry (name, cron
expression, description key) that both the scheduler and the admin monitoring API consume.

## 9. Verification plan

1. `pnpm --filter @kichkintoy/api typecheck` + full `pnpm typecheck`.
2. Seed a day of data (attendance with check-in/out + pickup, published meals with child
   statuses, report with sleep items, schedule entry), run J1 manually, confirm one inbox
   notification per guardian with correct metadata; run again → no duplicate.
3. J2: event tomorrow → reminder tonight; two events → one bundled notification.
4. J3: unpaid invoice due in ≤7 days → daily reminder with correct phase; mark paid → next run
   sends nothing; parent who never opened payments screen still gets a reminder (invoice
   materialized by the job).
5. J4 on a Sunday date: counts match seeded week; all-zero child → skipped.
6. J5: request due D-3 and D-1 → exactly one reminder each; submitted child → none.
7. J6: important notice unread 24h → one nudge; re-run next day → nothing.

## 10. Future (not in this spec)

Teacher crons: morning attendance nudge (~09:30), pre-digest completeness check (~17:30 —
missing check-outs / meal statuses / unpublished reports, protects J1 quality), tomorrow's
events for their classes, unanswered parent comments >24h.

Director crons: daily center summary (~18:30), Monday payment-collection digest, inactive-class
alert (no reports/meals/photos 2+ days), pending queue digest (join requests, expiring
invitations, complaints >3 days), platform-fee reminder (`CenterPlatformPayment`).

All reuse the same `crons` module, `cron_job_runs` guard, dedupe pattern, and i18n approach.
