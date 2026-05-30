# Kichkintoy Security Checklist

> Use this as the **standard** every new feature is checked against. When you finish implementing a feature, hand an LLM **(a)** this file, **(b)** the feature diff/branch, and **(c)** a copy of [`security-review-template.md`](./security-review-template.md), and ask it to produce a filled-in review. Each item has a stable ID (e.g. `AUTHZ-2`) the review references.
>
> This is tailored to the real stack: **NestJS + Prisma + Postgres**, custom phone-OTP + username/password auth, multi-tenant by `center_id` / `organization_id`, authorization via `user_roles` + `child_guardians` + `teacher_class_assignments` + `child_enrollments`, Cloudflare R2 media, Eskiz SMS, Click/Payme/Uzum payments. See [`../design/kichkintoy-uzbekistan-system-design.md`](../design/kichkintoy-uzbekistan-system-design.md) §8/§24 and [`../spec/security-hardening-spec.md`](../spec/security-hardening-spec.md).

## How to read an item

Each item is a **requirement**, plus *How we do it here* (the existing pattern to copy) and *How to verify*. Mark each **Pass / Fail / N/A** in the review. **Any Critical or High failure blocks merge.**

## Severity

- **Critical** — child-data leak across tenants, auth bypass, payment/money manipulation, RCE/SQLi, secret exposure.
- **High** — privilege escalation within scope, IDOR on sensitive data, missing authz on a mutation, unauthenticated sensitive endpoint.
- **Medium** — missing rate limit on an abusable endpoint, enumeration, weak validation, missing audit on a sensitive action.
- **Low** — defense-in-depth gaps, hardening, info disclosure with low impact.

---

## AUTHZ — Authorization & Multi-Tenant Isolation (most important for this app)

- **AUTHZ-1 — Every endpoint is authenticated unless explicitly public.** Controller/handler is under `SessionGuard` (or a stricter guard). Public endpoints (signup, center search) are a deliberate, listed exception.
  *Here:* `@UseGuards(SessionGuard)`; `CurrentUser` decorator. *Verify:* no sensitive handler lacks a guard.
- **AUTHZ-2 — Object-level ownership is checked, not just role.** For every `:id` the code loads the row and verifies the caller may access *that specific* object — never trusts the role alone.
  *Here:* `requireGuardian` / `isGuardian` (parent→child), `requireCanAuthorClass` / `teacherClassAssignment` (teacher→class), `isDirectorForCenter` (director→center/org). *Verify:* fetch-then-authorize on each path; no "role === teacher → allow any class".
- **AUTHZ-3 — Tenant scoping on every query.** Reads/writes are filtered by `center_id` / `organization_id` (or via a relationship that is). A parent only sees their `child_guardians`; a teacher only their assigned classes.
  *Verify:* no `findMany` returning rows across centers; no query that takes a user-supplied id without a tenant/ownership filter.
- **AUTHZ-4 — No IDOR.** Changing an id in the request cannot return or mutate another tenant's data. Not-authorized returns `404`/`403` without leaking existence of cross-tenant data.
  *Here:* `getReportForParent` returns `NotFound` for non-published / non-owned. *Verify:* test with another center's valid id.
- **AUTHZ-5 — Director-only actions cannot be reached by approver-teachers or parents.** Sensitive admin actions use `@DirectorOnly()` / `CenterApproverGuard` correctly.
  *Verify:* the most privileged action in the feature requires the highest role.
- **AUTHZ-6 — Write authorization mirrors read.** If a user can read X, that does not imply they can edit/delete X; create/update/delete each re-check permission (author-or-director, etc.).
- **AUTHZ-7 — UUIDs validated.** Path/route ids use `ParseUUIDPipe`; ids in bodies are validated by Zod as uuid.

## AUTHN — Authentication & Session (for auth-touching features)

- **AUTHN-1 — Passwords hashed with a strong KDF** (scrypt/argon2/bcrypt) + per-user salt, compared with `timingSafeEqual`. Never logged.
  *Here:* `hashPassword` / `verifyPassword` in `auth.service.ts`.
- **AUTHN-2 — Session tokens are high-entropy and stored hashed at rest** (never plaintext in DB). Revocable; expiry enforced on every request.
  *Here:* `createSession` (32-byte random, SHA-256 `tokenHash`), `SessionGuard` checks `revokedAt`/`expiresAt`.
- **AUTHN-3 — OTP is rate-limited (send) and attempt-locked (verify), short TTL, single newest code valid, constant-time compared.**
  *Here:* `enforceOtpSendLimits`, `attempts` lockout, `safeEqualHex`, 5-min TTL.
- **AUTHN-4 — No auth bypass via env/debug.** Demo/test bypasses fail closed (require explicit non-prod flag); never active when `NODE_ENV=production`.
  *Here:* `allowDemoCode()`.
- **AUTHN-5 — Generic auth errors.** Login and verification return non-distinguishing messages (no "user exists" / "wrong password" split).
- **AUTHN-6 — New auth/secret tokens** (invitations, reset links, verification tokens) are opaque, single-use, expiring, and matched server-side (not guessable, not enumerable).

## PRIV — Children's Data & Privacy

- **PRIV-1 — A parent sees only their linked children.** No endpoint returns another child's report/album/attendance/profile. Default-deny.
- **PRIV-2 — Teacher-only fields are not exposed to parents** (internal notes, other guardians' phone numbers, staff-only data).
- **PRIV-3 — Response shaping is minimal.** Use explicit `select` — never return whole rows that include fields the caller shouldn't see (e.g. another guardian's contact, internal flags).
  *Verify:* check the `select`/`include` of every response; no leaking joins.
- **PRIV-4 — Child photos/media are access-controlled** (see MEDIA). Album/report media respects child-tagging so a parent only gets media for their child.
- **PRIV-5 — PII is not written to logs or audit metadata.** No full phone/password/OTP/token in logs or `audit_logs.metadata`.

## INPUT — Validation & Output

- **INPUT-1 — All input validated by Zod** (`@kichkintoy/shared` schema), parsed before use; bodies typed `unknown` then parsed. No trusting client-shaped objects.
- **INPUT-2 — No SQL injection.** Prisma parameterized queries only; no `$queryRawUnsafe` / string-built SQL with user input.
- **INPUT-3 — No mass assignment.** Server picks the fields it writes; client cannot set `status`, `role`, `centerId`, ownership, or `*_user_id` fields it shouldn't.
- **INPUT-4 — Output encoding / no stored XSS surface.** User text (comments, notes, notice body) is treated as data; rich-text/HTML is sanitized or rendered safely on the client.
- **INPUT-5 — File/numeric bounds enforced** (max items, max attachments, string length, amount ranges).

## RATE — Rate Limiting & Abuse

- **RATE-1 — Abusable endpoints are throttled.** Anything that sends SMS/push, creates rows in bulk, or is brute-forceable has a per-IP and (where relevant) per-subject limit beyond the global throttler.
  *Here:* `@Throttle(...)` on auth routes; `enforceOtpSendLimits` per phone.
- **RATE-2 — Bulk/fan-out operations are bounded** (e.g. notice/report fan-out, nudges) and cannot be triggered repeatedly to spam users (cooldowns, like notice `last_nudged_at`).
- **RATE-3 — No unbounded queries.** List endpoints paginate or cap results; no `findMany` without a limit on user-growing tables.

## PAY — Payments & Webhooks (Click / Payme / Uzum)

- **PAY-1 — Webhook signatures verified** for every provider callback before acting. Reject unsigned/invalid.
- **PAY-2 — Idempotency.** Replayed webhooks / double submits do not double-charge or double-credit (idempotency key, unique provider txn id).
- **PAY-3 — Server is the source of truth for amounts.** Never trust client-supplied amount/currency; compute from the invoice.
- **PAY-4 — Payment state transitions are authorized and audited**; raw payloads stored without leaking secrets.

## MEDIA — Uploads & R2

- **MEDIA-1 — Direct-to-R2 via signed URLs**, permission-checked before issuing the URL (no upload through the API; no public bucket).
- **MEDIA-2 — Served via short-TTL signed URLs only** — child media is never on a public/guessable URL.
- **MEDIA-3 — Upload validated** (mime/type/size) and `media_assets` is tenant-scoped (`center_id`); links checked against the owning entity.
  *Here:* `requireMediaAssets` checks asset `centerId` before linking.

## AUDIT — Logging & Traceability

- **AUDIT-1 — Sensitive actions write `audit_logs`** (create/update/delete of child data, publishes, approvals, role/permission changes, payments, support access).
  *Here:* `this.audit.log({ action, entityType, entityId, actorUserId, ... })`.
- **AUDIT-2 — Auth events are audited** with IP + User-Agent (login success/fail, register, logout, role grants).
- **AUDIT-3 — Audit writes are inside the same transaction** as the action where atomicity matters.

## DATA — Data Model & Transactions

- **DATA-1 — Multi-step writes are transactional** (`prisma.$transaction`); partial failure leaves no half-state (e.g. publish + receipts + notifications + audit all-or-nothing).
- **DATA-2 — Deletes cascade / soft-delete deliberately**; no orphaned sensitive rows; cascades reviewed.
- **DATA-3 — New columns/tables for sensitive data are tenant-scoped and indexed** for the ownership lookups they need.

## SECRETS — Config & Secrets

- **SECRETS-1 — No secrets in code or committed env.** Secrets via env only; `.env` gitignored; `.env.example` has placeholders.
- **SECRETS-2 — New config fails closed.** Missing security-relevant env (CORS allowlist, signing keys) denies rather than opens (see `resolveCorsOrigins`).
- **SECRETS-3 — Errors don't leak internals** (stack traces, provider keys, SQL) to clients.

## DEPS & INFRA

- **DEPS-1 — New dependencies are reputable, pinned, and necessary**; `pnpm audit` clean for high/critical.
- **INFRA-1 — Transport is TLS-only in prod**, `helmet` headers present, CORS locked to known origins.
- **INFRA-2 — Bound request size / no obvious DoS** (body limits, pagination, no unbounded loops over user data).

## LEGAL — Localization & Compliance

- **LEGAL-1 — 🇺🇿 Data localization.** Personal data of Uzbek citizens (especially children) is stored on servers in Uzbekistan. Any new data store / third-party that holds PII is checked against this before use.
- **LEGAL-2 — Consent respected.** Marketing/SMS/notification sends honor `user_consents` / `user_notification_settings`.

---

## Quick gate (the 6 that catch most real bugs here)

1. Can another center's user hit this with a valid id and get data? (**AUTHZ-4**)
2. Does a parent path verify guardianship of *that* child? (**AUTHZ-2 / PRIV-1**)
3. Is every mutation authorized, not just every read? (**AUTHZ-6**)
4. Is the input Zod-validated and are server-owned fields un-settable by the client? (**INPUT-1 / INPUT-3**)
5. Does anything that sends SMS/push or brute-forces have a limit? (**RATE-1**)
6. Is the sensitive action audited and transactional? (**AUDIT-1 / DATA-1**)
