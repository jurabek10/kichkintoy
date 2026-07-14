# Admin Cron Monitoring — Spec

> Status: **approved for implementation**, depends on `parent-cron-notifications-spec.md` (the `cron_job_runs`
> table and the job registry it introduces). Web only, lives in the existing super-admin
> dashboard (`/admin`, `super_admin` role, `AdminGuard`).

Observability page for the platform owner: see every scheduled job, whether it ran, what it
sent, and why it failed — plus a one-click manual run. Without this, the only debugging tool
for a silently failed digest is psql; nobody complains about a notification they never knew
they were supposed to get.

**Read-mostly by design.** No editing of schedules from the UI — cron schedules live in code.
The only write is "run now".

## Job registry

The crons module exports a static registry (single source of truth, also used by the
scheduler itself):

```ts
type CronJobDefinition = {
  name: string;            // "parent.daily_digest"
  cronExpression: string;  // "30 20 * * 1-6" (Asia/Tashkent)
  descriptionKey: string;  // admin.crons.jobs.<name> translation key
};
```

The admin UI lists registry entries (not distinct DB values), so a job that has **never run**
still appears — that's exactly the failure this page exists to catch.

## What the admin can SEE

### Crons list (`/admin/crons`)

New sidebar item in `AdminShell` nav: `nav.crons` (icon: `Timer` or `Clock`).

Top — **jobs summary** (one card/row per registry entry, no pagination, ~6 jobs):

- Localized job title + localized description + human-readable schedule ("Mon–Sat 20:30").
  The stable machine identifier (for example `parent.daily_digest`) appears as smaller
  secondary text for debugging, never as the primary user-facing title.
- Last run: status badge (succeeded / failed / running / **never ran**), Tashkent date,
  duration, sent count.
- Failed runs get the error text inline (truncated, full text on the detail page).
- "Run now" button per job (see below).

Bottom — **recent runs** (TanStack Table, standard rules: 10 per page, row numbers,
no horizontal scroll):

- Columns: №, Job (localized title with machine identifier), Run date, Status, Sent,
  Duration, Started at.
- Filters: job name (select), status (select). Newest first. Default window: last 30 days.

### Job detail (`/admin/crons/[jobName]`)

History of one job over time:

- Header: description, schedule, last-run badge, "Run now".
- Stat cards (last 30 days): success rate, total notifications sent, failed runs count.
- Runs table: №, Run date, Status, Sent, Duration, Started/Finished, Error (full text,
  expandable row or tooltip). 10 per page, newest first.

No charts in v1 — the stat cards + table answer every real question at this scale.

## What the admin can DO

**Run now**: triggers one job immediately for a chosen Tashkent date (defaults to today;
date picker for backfills/testing). Confirmation dialog before running. Rules:

- Bypasses the `cron_job_runs` same-day guard, **never** bypasses per-notification dedupe —
  so re-running a succeeded job is always safe and sends nothing new.
- Backfills use the selected processing date in each notification's stable logical dedupe key;
  they do not use `Notification.createdAt`, which always records the real creation time.
- Runs are still recorded in `cron_job_runs`; a manual re-run for an existing
  (jobName, runDate) **updates** that row (status, counts, finishedAt) rather than violating
  the unique constraint.
- Executes synchronously (jobs are small at current scale); the button shows a spinner and
  the tables refetch on completion.
- Audit-logged: `cron.manual_run` with jobName + runDate.

This UI **replaces** the dev-only HTTP trigger sketched in
`parent-cron-notifications-spec.md` §8 — one guarded path instead of two.

## API (extends the `admin` oRPC contract, all behind `AdminGuard`)

- `admin.crons.list` — registry entries joined with each job's latest `CronJobRun`.
- `admin.crons.runs` — paginated runs; input: `{ jobName?, status?, page }`; 10 per page.
- `admin.crons.stats` — per-job 30-day aggregates (success rate, sent total, failure count).
- `admin.crons.runNow` — input `{ jobName, runDate? }`; validates jobName against the
  registry; returns the finished `CronJobRun`.

Contract types in `packages/shared/src/api/admin.ts` alongside the existing admin schemas.

## Plumbing notes

- New DB need beyond `cron_job_runs`: none.
- Web data layer: TanStack Query via the existing `queryKeys` factory
  (`admin.crons.*` keys); tables follow the centers-list component patterns.
- All UI strings in uz / ru / en under `admin.crons.*` (nav label, column headers, status
  badges, job descriptions, run-now dialog). Verify uz lengths in badges/buttons.
- Dates/times rendered Tashkent, 24-hour, `25.06.2026`; durations as `1,2 s` / `340 ms`.
- `/admin` layout already bounces non-super-admins; no extra access work.

## Out of scope (v1)

- Per-notification drill-down (who received what — the inbox and DB already answer this).
- Charts / history visualizations.
- Editing schedules, enabling/disabling jobs from the UI.
- Alerting (email/telegram on failure) — worth revisiting once push delivery exists.
- Exposing any of this to directors/teachers/parents.

## Verification plan

1. `pnpm typecheck` (api, shared, web).
2. Fresh DB, no runs: `/admin/crons` shows all registry jobs as "never ran".
3. Let (or manually make) a job run: summary badge, recent-runs row, and detail page agree
   on status/sent/duration; failed job shows its error text.
4. "Run now" on a succeeded job: completes, updates the same run row, sends **zero**
   duplicate notifications (dedupe holds); audit log row `cron.manual_run` exists.
5. Filters + pagination on the runs table; non-admin user hitting `/admin/crons` is bounced.
