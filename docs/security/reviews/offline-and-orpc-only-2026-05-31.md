# Security Review — Offline layer + oRPC-only API

> Scored against [`../security-checklist.md`](../security-checklist.md). Covers: IndexedDB cache persistence, offline comment outbox + idempotency, `/rpc` rate limiting, and deletion of the 7 REST controllers.

## 1. Subject

| | |
|---|---|
| Feature | Persistence + offline outbox + oRPC-only API |
| Branch | main (uncommitted working tree) |
| Date | 2026-05-31 |
| Reviewer | Claude (Opus 4.8) |
| Files | `web: lib/query-persister.ts, lib/offline-mutations.ts, app/providers.tsx, lib/session.ts, reports/report-detail-screen.tsx` · `api: orpc/rate-limit.ts, orpc/router.ts, common/idempotency.ts, reports/reports.service.ts, *.module.ts (7), deleted 7 *.controller.ts` · `shared: api/daily-reports.ts` |
| New endpoints | none (procedures already existed); transport for all now oRPC `/rpc` only |
| New deps | `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval` |

## 2. Verdict

- [x] **Pass with required fixes** — one Critical found **and fixed during review**; one Low fixed; remaining items are Medium/Low and tracked below. No open Critical/High.

**Summary:** The migration to an oRPC-only API correctly re-homed authorization (handlers use `requireUser`/`requireCenterAccess`) and ported throttling to `/rpc`. Testing the throttle revealed it was silently inert (Critical) — now fixed and verified. The new persistence layer puts children's data at rest on the device, which raises the stakes of the still-open httpOnly-cookie item.

## 3. Findings

| ID | Severity | Checklist | Location | Issue | Fix | Status |
|----|----------|-----------|----------|-------|-----|--------|
| F1 | **Critical** | RATE-1, AUTHN-3 | `orpc/rate-limit.ts` | `/rpc` limiter read `req.path`, which Express strips of the `/rpc` mount, so the per-procedure suffix match never hit → login/register/sendCode had **no IP throttle** (regression from deleting the REST `@Throttle`). | Use `req.originalUrl`. Verified: login 429 after 10/min, sendCode after 5/min. | **Fixed** |
| F2 | Low | AUTHZ-3 | `reports.service.addComment` | Idempotency key used a global namespace — a reused/guessed key could return another user's cached comment result. | Namespaced the key as `comment:${userId}:${key}`. | **Fixed** |
| F3 | Medium | PRIV-5, AUTHN-2, INFRA | `lib/query-persister.ts`, `providers.tsx` | The query cache (children's names, reports, etc.) now persists **unencrypted in IndexedDB** on the device. Cleared on logout, but on a shared device a *tab-close* (no logout) leaves it for up to 24h; and like the `localStorage` token, it's readable by any same-origin script (XSS exfiltrates token **and** child data now). | Keep `maxAge` short; consider excluding the most sensitive queries from persistence; **prioritize moving the web session token to an httpOnly cookie** (already-open follow-up). | Open |
| F4 | Low | INFRA-2, RATE-1 | `common/idempotency.ts`, `orpc/rate-limit.ts` | Both stores are in-memory per-instance → at >1 node, idempotency dedupe and rate limits can be bypassed by hopping instances. | Move both to **Redis** before scaling out (design doc §22). | Accepted-risk (MVP, single node) |
| F5 | Low | SECRETS-3 | `orpc/router.ts` | Need to confirm Nest `HttpException`s thrown in services (401/403) surface as the right status/oRPC error through `RPCHandler` (bad input correctly mapped to 400 in testing; 401/403 paths not exercised). | Add a test; map exceptions in the oRPC `onError` interceptor if needed. | Needs-info |

## 4. Checklist results (touched categories)

### AUTHZ
| ID | Result | Evidence |
|----|--------|----------|
| AUTHZ-1 | Pass | oRPC handlers call `requireUser`; reads/writes gated. |
| AUTHZ-2/3/4 | Pass | Object-level checks unchanged from the audited services (`requireGuardian`, `requireCenterAccess`); tenant scoping intact. |
| AUTHZ-5 | Pass | `setAnnouncement`-style director actions use `requireCenterAccess(..., { directorOnly: true })`. |
| AUTHZ-6 | Pass (F2) | Comment write authorized before idempotency; key now user-scoped. |

### AUTHN
| ID | Result | Evidence |
|----|--------|----------|
| AUTHN-2 | **Fail → tracked (F3)** | Token in `localStorage`; now compounded by persisted child data. httpOnly cookie still pending. |
| AUTHN-3 | Pass (after F1) | OTP send/verify limits at service level **plus** `/rpc` caps (5/min send, 10/min verify/login/register) — verified by test. |
| AUTHN-4/5 | Pass | Unchanged from prior hardening (fail-closed demo code, generic login error). |

### PRIV / RATE / AUDIT / DATA / INFRA
| ID | Result | Evidence |
|----|--------|----------|
| PRIV-1/2 | Pass | Parent/child scoping unchanged; oRPC handlers preserve it. |
| PRIV-5 | **Fail → tracked (F3)** | Children's data now persisted at rest on device (IndexedDB). |
| RATE-1 | Pass (after F1) | Per-IP `/rpc` throttle verified; strict auth caps fire. |
| RATE-2 | Pass | Offline outbox replays each queued write once (TanStack paused mutations) + idempotency. |
| AUDIT-1 | Pass | `addComment` and director actions still write `audit_logs`. |
| DATA-1 | Pass | Comment creation stays transactional; idempotency wraps the whole produce step. |
| INFRA-2 | Partial (F4) | `/rpc` throttle present but in-memory/per-instance. |

## 5. Abuse cases tested

- [x] Hammer `POST /rpc/auth/login` ×12 → **429 after 10** (was: no throttle — F1). ✅
- [x] Hammer `POST /rpc/auth/sendCode` ×7 → **429 after 5**. ✅
- [x] Confirmed only `app.controller` remains; all domain access is oRPC + in-handler auth.
- [ ] Offline comment replay with a duplicated idempotency key → at-most-once (coded + user-namespaced; not runtime-tested).
- [ ] Cross-tenant id on a `/rpc` procedure → 403/404 (unchanged from prior audit; not re-run).

## 6. Required follow-ups

| Item | Severity | Notes |
|------|----------|-------|
| Move web session token to httpOnly cookie | Medium (F3) | Now also protects persisted child data from XSS. |
| Redis-back idempotency + rate-limit stores | Low (F4) | Before multi-node. |
| Verify 401/403 mapping through oRPC | Low (F5) | Add an integration test. |
| Consider excluding most-sensitive queries from persistence / shorter maxAge | Medium (F3) | Privacy of children's data at rest. |

## 7. Sign-off

Reviewer: Claude (Opus 4.8) — 2026-05-31. **Re-review after fixes: not required** (F1/F2 fixed + F1 verified by test; remainder tracked).
