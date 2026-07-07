# Kichkintoy

Kidsnote-style kindergarten app (Korean app Kidsnote, rebuilt for the Uzbek market).
Three user roles — **parent**, **teacher**, **director** — on web and mobile.
Core principle: **all roles share the same design; only the features differ per role.**

## Monorepo layout (pnpm workspaces)

- `packages/api` — NestJS + oRPC backend (Postgres via docker compose, MinIO for files)
- `packages/web` — Next.js app for all three roles (TanStack Query + TanStack Table)
- `packages/mobile` — Expo parent app (the mobile design reference)
- `packages/teacher-mobile` — Expo teacher app
- `packages/director-mobile` — Expo director app
- `packages/mobile-shared` — code shared between the mobile apps
- `packages/shared` — shared oRPC contracts and types
- `packages/translations` — shared i18n resources (uz / ru / en)

## Design rules (apply to every UI task)

- Use the **frontend-design** skill for any new or reworked UI — always, without being asked.
- Mobile apps must look identical across parent/teacher/director; parent mobile is the
  reference. Web parent/teacher pages mirror the mobile design.
- Before building a page for one role or platform, look at the equivalent page in the
  other role/platform and reuse its patterns (filters, tables, detail pages, colors).
- Web lists use TanStack Table: no horizontal scrolling, photo + name in one column
  (never a separate photo column), row numbers where counting matters.
- Lists paginate at **10 per page** on both web and mobile.
- Mobile list screens follow the shared pattern: search field + funnel button opening a
  bottom-sheet filter (All / Month / Day).

## Localization (critical)

- Every user-facing string must exist in **uz, ru, and en** via `packages/translations`.
  Never hardcode display text. Uzbek is the primary language — verify uz strings fit
  buttons and labels (they run long).
- Web and all mobile apps must use identical translation keys and wording.
- Timezone **Asia/Tashkent** everywhere; 24-hour time (no AM/PM); dates as `25.06.2026`;
  money as `25.000.000 so'm`; Uzbek month names like `15-iyun`.

## Workflow

- New feature: write a spec in `docs/spec/` first and confirm it, then implement.
- Commit only when asked ("make N commits") — split into logical commits on `main`.
- **Never `git push`.** The user always pushes manually.
- After changes, verify with `pnpm typecheck` (or `pnpm --filter @kichkintoy/<pkg> typecheck`).
- **Do not upgrade the Expo SDK** — the apps must keep working in the user's installed Expo Go.
- Slow web dev pages usually mean a runaway Turbopack cache: `rm -rf packages/web/.next`.

## Commands

- Dev: `pnpm dev:api`, `pnpm dev:web` (port 3000) / `dev:web:3001`, `pnpm dev:mobile`
- DB: `pnpm db:up`, `db:migrate`, `db:studio`, `db:reset`
- Checks: `pnpm typecheck`, `pnpm build`, `pnpm lint` (all support `--filter @kichkintoy/<pkg>`)
