# Teacher Cron Notifications Spec

> Status: **implemented**. Adds scheduled notifications for teachers on top of the
> foundation from `parent-cron-notifications-spec.md` (registry, `CronRunnerService`,
> `cron_job_runs`, `enqueueWithKey` dedupe, admin monitoring). Director crons come later.

> **Anti-spam is a hard requirement.** Teachers live in the app all day; crons must tell them
> what is *missing or upcoming*, never recap what they already did. At most 4 notification
> slots per day, every job bundles all of a teacher's classes into **one** notification, and
> every job except the morning summary **skips entirely when there is nothing to act on** —
> silence means all good.

## 1. Goal

Parents now get evening digests assembled from teacher-entered data. Teacher crons close the
loop: a morning roll-call summary, a lunchtime medication reminder, an end-of-day checklist
that protects the 20:30 parent digest quality, a day-before heads-up for events and
birthdays, and a rare nudge for important notices.

## 2. Scope

In scope:

- Five teacher jobs (T1–T5) in the existing `packages/api/src/crons/` module.
- Registry entries (admin monitoring page picks them up automatically).
- New notification types + uz/ru/en translations + client rendering (web dashboard and
  teacher-mobile inbox: visuals, metadata body renderers, tap-through routes).
- Same idempotency mechanism as parent jobs (`enqueueWithKey`, `cron_job_runs` guard).

Out of scope:

- Director crons.
- Per-dose medication reminders at exact clock times (event scheduling, not a daily cron).
- Teacher read-tracking for notices (see T5 — v1 works without it).
- Push delivery (unchanged: `in_app` + pending `push` rows).
- Weekly teacher recap.

## 3. Recipients

A "teacher" is any user with an **active** `TeacherClassAssignment`
(`endedAt` null or ≥ today). All jobs resolve the teacher's classes from these assignments
and bundle every class into one notification per teacher. Users assigned to classes get the
notifications regardless of any additional roles they hold.

## 4. Jobs

Schedule overview (all Asia/Tashkent; parent jobs unchanged):

| Job | Name | Cron | Days |
| --- | --- | --- | --- |
| T1 | `teacher.attendance_summary` | `30 9 * * 1-6` | Mon–Sat 09:30 |
| T2 | `teacher.medications_today` | `0 12 * * 1-6` | Mon–Sat 12:00 |
| T3 | `teacher.end_of_day` | `30 17 * * 1-6` | Mon–Sat 17:30 |
| T4 | `teacher.tomorrow_reminder` | `35 20 * * *` | every day 20:35 |
| T5 | `teacher.notice_reminder` | `30 19 * * *` | every day 19:30 |

T4/T5 run all 7 days for the same reason as the parent jobs (a Monday event or birthday
needs its reminder on Sunday). T3 at 17:30 deliberately lands **before** the 20:30 parent
digest so teachers can fix gaps in time.

### T1 — Morning attendance summary (Mon–Sat 09:30)

The only job that **always sends** (per your requirement — the roll itself is the message).

Per class of the teacher: total actively enrolled children, how many are present
(`present`/`late`/`left_early`/`picked_up` — reuse `PRESENT_STATUSES`), how many absent with
their reasons, and how many not yet marked (no record or `not_checked_in`).

- `notificationType`: `teacher.attendance_summary`
- `entityType`/`entityId`: `class` / classId (single class) or null (multi-class bundle)
- `metadata`: `[{ classId, className, total, presentCount, notMarkedCount, absences: [{ childFirstName, reason }] }]`
  — `reason` is the parent's `absenceReason` free text (or null), passed through as-is.
- Dedupe: `enqueueWithKey` on (type, teacherUserId, date).
- Rendered example (uz): "Quyoshcha: 18 boladan 15 keldi · 2 kelmadi (kasal; oilaviy sabab) · 1 belgilanmagan".

### T2 — Today's medications (Mon–Sat 12:00)

Lists today's still-pending medication requests for the teacher's classes:
`MedicationRequest` with `requestedForDate` = today, `status = "pending"` (administered /
skipped / cancelled are excluded), class in the teacher's assignments (or child enrolled in
one of them when `classId` is null).

12:00 is chosen because parents often write timing as free text ("tushlikdan oldin",
"after lunch") rather than a clock time — `medicationTime` is shown verbatim. The job lists
**all** of today's pending doses, so it also doubles as a "did you give the morning one?"
check: anything already administered has dropped off the list.

- `notificationType`: `teacher.medications_today`
- `entityType`/`entityId`: `medication_request` / requestId (single) or null (bundle)
- `metadata`: `[{ requestId, childFirstName, medicineName, dosage, medicationTime }]`
- Dedupe: (type, teacherUserId, date). **Silent when the list is empty.**

### T3 — End-of-day checklist (Mon–Sat 17:30)

One bundled checklist per teacher, covering their classes; each line only appears when its
count is non-zero, and the whole notification is **skipped when everything is clear**:

| Check | Source |
| --- | --- |
| Children checked in but not checked out | `AttendanceRecord` today, `checkOutAt` null, status still `present`/`late` |
| Published meals missing eating statuses | today's published `MealPost` for the class where a present child has no `MealChildStatus` |
| Present children without a published daily report | `AttendanceRecord` present-statuses minus published `DailyReport` rows for today |
| Unanswered parents (>24h) | parent-authored `DailyReportComment`/`NoticeComment` on the class's content with no later staff reply, and conversation threads where the last message is parent-sent, older than 24h, unread per `ConversationParticipant.lastReadAt` |
| Document submissions awaiting review | `StudentDocumentSubmission` status `submitted` for children in the teacher's classes (class-scoped review powers) |

- `notificationType`: `teacher.end_of_day`
- `entityType`/`entityId`: null (checklist has multiple destinations; tapping opens the home
  screen / notifications inbox)
- `metadata`: `{ missingCheckouts, missingMealStatuses, missingReports, unansweredParents, submissionsToReview }` (numbers; plus `classNames: string[]`)
- Dedupe: (type, teacherUserId, date).

### T4 — Tomorrow: events + birthdays (every day 20:35)

Same event-resolution engine as the parent `parent.tomorrow_events` job (extract the shared
query rather than duplicating), but scoped to events targeting the teacher's classes or the
whole center — **plus birthdays**: children in the teacher's classes whose `Child.dob`
month/day equals tomorrow's month/day. Events and birthdays bundle into one notification.

- `notificationType`: `teacher.tomorrow_reminder`
- `entityType`/`entityId`: `calendar_event` / eventId when it is exactly one event and no
  birthdays; otherwise null.
- `metadata`: `{ events: [{ eventId, title, startsAt, endsAt, allDay, locationText }], birthdays: [{ childId, childFirstName }] }`
- Dedupe: (type, teacherUserId, tomorrowDate). Silent when both lists are empty.
- Rendered example (uz): "Ertaga 16-iyul: Ota-onalar tashrifi (10:00) · Tug'ilgan kun: Aziza 🎂".

### T5 — Important notice reminder (every day 19:30, once ever per notice)

Teachers are **not** `NoticeRecipient`s (recipients are guardians only), so there is no
teacher read-tracking to lean on. v1 therefore sends exactly **one** reminder per important
notice per teacher, read or not: published notices with `isImportant` or
`requiresConfirmation`, published 24h–7d ago, targeting the teacher's classes or the whole
center, and **not authored by this teacher**. Multiple qualifying notices bundle into one
notification.

- `notificationType`: `teacher.notice_reminder`
- `entityType`/`entityId`: `notice` / noticeId (single) or null (bundle)
- `metadata`: `[{ noticeId, title, requiresConfirmation }]`
- Dedupe: per-notice once-ever — reuse the `previouslyNudgedNoticeIds` pattern
  (scan prior `teacher.notice_reminder` rows for entity ids and metadata notice ids), plus
  `enqueueWithKey` on (type, teacherUserId, date) for the bundle row itself.
- Expected to fire rarely; it is not a daily slot in practice.
- Future alternative (out of scope): create `NoticeRecipient` rows for class teachers at
  publish time (childId null) to get real read-tracking — requires excluding teacher rows
  from parent read statistics.

## 5. Idempotency & foundation reuse

- Five new entries in `CRON_JOBS` (`packages/api/src/crons/cron-registry.ts`) and
  `CronRegistryService.runNow`; new `teacher-crons` service file(s) following the parent
  cron pattern (`CronRunnerService.run` wrapper, per-target try/catch, `enqueueWithKey`).
- Channels `["in_app", "push"]`, same as parent jobs.

## 5a. Super-admin monitoring (`/admin/crons`)

The teacher jobs must be fully monitorable from the existing super-admin dashboard
(`admin-cron-monitoring-spec.md`). Because the page is registry-driven, most of this is
automatic — the checklist below is what actually needs doing:

- **Registry**: the five `CRON_JOBS` entries make the jobs appear on `/admin/crons` as
  "never ran" cards immediately, each with its own detail page
  (`/admin/crons/teacher.attendance_summary` etc.) and 30-day stats.
- **Run now**: add the five names to the `CronRegistryService.runNow` map (the
  `Record<CronJobName, …>` type makes forgetting one a compile error). Manual runs bypass
  the same-day guard but never the notification dedupe, and are audit-logged as
  `cron.manual_run` — no new admin code needed.
- **Run tracking**: `CronRunnerService.run` gives each job its `cron_job_runs` row
  (status / sent count / duration / error) for free; job code must route every send through
  it so the admin counts are truthful.
- **Translations**: new keys in `admin.json` (uz / ru / en) — `crons.jobNames.teacher.*`
  (card titles), `crons.schedules.teacher.*` (human-readable schedules, e.g. "Dush–Shan
  09:30"), `crons.jobs.teacher.*` (one-line descriptions). These are the **only** admin-side
  strings required; filters, badges, run-now dialog and tables reuse existing keys.
- **No contract or web changes**: `admin.crons.list/runs/stats/runNow` and the dashboard
  components are already generic over the registry.

## 5b. Unit tests (vitest, `pnpm --filter @kichkintoy/api test`)

Follow the existing spec-file patterns in `packages/api/src/crons/`:

- **Job logic with mocked Prisma** (pattern: `cron-notifications.service.spec.ts` — plain
  objects with `vi.fn()` for `PrismaService`/`NotificationsService`, no DB):
  - T1: given mocked enrollment + attendance rows, asserts `presentCount`,
    `notMarkedCount`, and `absences[].reason` passthrough; asserts it still sends when
    everything is fine (always-send rule).
  - T2: `administered`/`skipped`/`cancelled` requests are excluded; empty list → no
    enqueue call (silent-skip).
  - T3: each checklist line's counting; the all-clear case enqueues nothing.
  - T4: birthday matching compares **month/day only** across different birth years
    (including 29 Feb → assert the chosen convention); event + birthday bundle produces a
    single enqueue per teacher.
  - T5: self-authored notices excluded; a notice id already present in prior rows
    (entityId or metadata array) is never re-nudged.
- **Renderer** (pattern: `cron-notification.spec.ts` — call
  `renderCronNotificationBody(type, metadata, fakeT)` and assert the composed line): one
  test per new type, plus a malformed-metadata case returning the fallback.
- **Registry/runner**: assert `CRON_JOBS` contains the five teacher names with the exact
  cron expressions above (guards against schedule typos); `cron-runner.service.spec.ts`
  already covers the same-day guard and failure recording — no changes needed.
- **Admin service** (pattern: `admin-cron.service.spec.ts`): `runNow` accepts a teacher job
  name and rejects an unknown one.

## 5c. E2E test (`packages/api/scripts/e2e-cron-jobs.mjs`)

Extend the existing script — it runs the real compiled services against a disposable
Postgres database. Runbook (unchanged):

```bash
pnpm --filter @kichkintoy/api build
docker exec kichkintoy-postgres psql -U kichkintoy -d kichkintoy \
  -c "CREATE DATABASE kichkintoy_cron_e2e;"
DATABASE_URL="postgresql://kichkintoy:<pw>@localhost:5433/kichkintoy_cron_e2e?schema=public" \
  npx prisma db push --accept-data-loss   # migrate deploy once the migration chain is repaired
CRON_E2E_DATABASE_URL="postgresql://…/kichkintoy_cron_e2e?schema=public" \
  node scripts/e2e-cron-jobs.mjs
```

The script refuses to run against a database named `kichkintoy`, so it can never touch dev
data. Fixture additions: one teacher assigned to **two classes**, plus a second "all clear"
teacher. Seed: children in present / absent-with-reason / unmarked states; one pending and
one administered medication for today; a missing check-out, an unrecorded meal status and an
unpublished report in class 1; a parent comment older than 24h without a staff reply; a
`submitted` document submission; a calendar event tomorrow; a child whose `dob` month/day is
tomorrow (born years earlier); an important director-authored notice published 25h ago and
one authored by the teacher herself.

Assertions per job (same style as the parent asserts):

1. First manual run `sentCount === 1` for T2–T5 and `sentCount === 2` for T1 because its
   always-send rule also includes the all-clear teacher; immediate re-run returns
   `sentCount === 0` (idempotency), and historical-date re-runs create no extra notifications.
2. The two-class teacher receives exactly **one** in_app row per job; metadata contents
   match the seeds (T1 counts + reason text, T2 lists only the pending request, T3 all five
   counters, T4 contains both the event and the birthday, T5 contains only the
   director-authored notice).
3. The all-clear teacher receives T1 **only** (T2–T5 silent for her).
4. T5 re-run the next day sends nothing (once-ever), and every in_app row has a
   `cron:`-prefixed `dedupeKey` with a matching pending `push` row.
5. `cron_job_runs` holds one `succeeded` row per teacher job and processing date with the
   correct `sentCount` (manual same-date reruns update that row, which is what the admin
   dashboard displays).

## 6. i18n & clients

- New `types.*` keys in `notifications.json` (uz/ru/en) for the five types; body renderers
  added to `renderCronNotificationBody` in `packages/shared/src/api/cron-notification.ts`
  reusing the existing `cron.*` token namespaces (add `cron.teacher.*` keys for the new
  line formats, birthday line, checklist items).
- Metadata stays language-neutral; the only free text passed through verbatim is
  parent-authored content (`absenceReason`, `medicationTime`, notice/menu titles).
- Visuals: map the five types in `notification-visuals.ts` (mobile-shared + web) — attendance
  color for T1, medications color for T2, home/primary for T3, calendar for T4, notices for T5.
- Tap-through routes: T1 → attendance book; T2 → medications list; T3 → home; T4 → calendar;
  T5 → notice detail (or notices list for bundles). Wire in web + **teacher-mobile** route
  maps (parent mobile does not receive these types).
- Verify uz string lengths; dates/times in Tashkent 24h formats as everywhere else.

## 7. Verification plan

1. `pnpm typecheck` (all packages) passes.
2. Unit tests per §5b pass (`pnpm --filter @kichkintoy/api test`).
3. E2E per §5c passes on a fresh disposable database.
4. On `/admin/crons`: the five teacher jobs appear as "never ran" before the first run;
   a run-now on each shows the correct sent count and a `cron.manual_run` audit row; a
   repeated run-now sends zero duplicates.
5. Inbox spot-check in web + teacher-mobile: localized titles/bodies render from metadata
   in uz/ru/en and tap-through routes land on the right screens.

## 8. Future (unchanged)

Director crons: daily center summary, Monday payment-collection digest, inactive-class
alert, pending queue digest, platform-fee reminder — same foundation.
