# Security Hardening

> Status: **Phase 1 implemented** on branch `security-hardening` (2026-05-30). Covers auth abuse-resistance + bootstrap hardening. Authorization/tenant isolation was audited and found solid (object-level guards already enforced) — no change needed there.

## 1. Context

Kichkintoy holds children's PII, photos, and locations — the most sensitive data class. The original audit (see §4) found the **authorization layer strong** (every child/report path does object-level checks via `child_guardians` / `teacher_class_assignments` / center role), but the **custom auth perimeter** and **app bootstrap** under-hardened. This spec records the hardening applied and what remains.

## 2. Implemented (Phase 1)

### 2.1 OTP (phone verification) — `auth.service.ts`
- **Fail-closed demo bypass.** The hardcoded `"123456"` fallback and "return code when not production" are gone. A fixed/returned code now requires **both** `NODE_ENV !== production` **and** `AUTH_ALLOW_DEMO_CODE === "true"`. A misconfigured env no longer opens auth.
- **Send rate limiting.** Per-phone: 30s resend cooldown + max 5 sends/hour (DB-counted on `phone_verifications`). Stops SMS bombing / Eskiz cost abuse.
- **Verify lockout.** New `phone_verifications.attempts` counter; after 5 wrong guesses the code is locked (request a new one). Stops 6-digit brute force.
- **Constant-time compare** of the code hash (`safeEqualHex`, `timingSafeEqual`).
- **TTL shortened** 10m → 5m.

### 2.2 Rate limiting
> **Updated 2026-05-31 (oRPC migration):** the REST controllers — where `@Throttle` lived — were deleted, and the API is now oRPC-only at `/rpc`. Throttling was **ported to a `/rpc` Express middleware** ([`orpc/rate-limit.ts`](../../packages/api/src/orpc/rate-limit.ts)): per-IP fixed window, `auth.sendCode` 5/min, `auth.verifyCode`/`login`/`register` 10/min, default 100/min. (A review found and fixed a bug where the per-procedure match used `req.path` — stripped of the `/rpc` prefix — so auth caps never fired; now uses `req.originalUrl`. See [`../security/reviews/offline-and-orpc-only-2026-05-31.md`](../security/reviews/offline-and-orpc-only-2026-05-31.md).) Service-level OTP send/verify limits in `AuthService` still provide fine-grained brute-force protection. `@nestjs/throttler`'s `APP_GUARD` remains but now only covers `app.controller`.

Original (REST, now removed):
- Global IP throttler (`@nestjs/throttler`): 100 req/min/IP default via `APP_GUARD`.
- Strict per-route on auth: `send-code` 5/min, `verify-code`/`register`/`login` 10/min.
- In-memory store (per-instance) — fine for single-node MVP.

### 2.3 Bootstrap — `main.ts`
- **`helmet`** security headers (HSTS, no-sniff, frameguard, …).
- **CORS allowlist** via `CORS_ORIGINS` env. **Fails closed in production** if unset (was `origin: true`, which reflected any origin with credentials).
- **Body size limit** (`BODY_LIMIT`, default 1mb) with the default parser disabled so the limit is authoritative.
- **`trust proxy`** so rate limiting / audit see the real client IP behind a proxy.

### 2.4 Account enumeration — `auth.service.ts`
- Registration now returns one neutral "username or phone already in use" message instead of revealing which field exists.

### 2.5 Audit trail — `auth.service.ts` (+ existing `audit_logs.ip_address`/`user_agent`)
- New audited events: `auth.register`, `auth.login.succeeded`, `auth.login.failed`, `auth.logout`, each with IP + User-Agent (previously these columns were never populated, and auth events weren't logged).

### 2.6 Migration
- `prisma/migrations/20260530120000_otp_attempts/` adds the `attempts` column. **Run `pnpm db:migrate`** when the dev DB is up (it was offline at implementation time, so only the client was regenerated).

### 2.7 New env vars (see `.env.example`)
`CORS_ORIGINS`, `BODY_LIMIT`, `TRUST_PROXY`, `AUTH_ALLOW_DEMO_CODE`, `AUTH_DEMO_CODE`.

## 3. Remaining (prioritized)

1. **Web session as httpOnly cookie.** Tokens are currently Bearer in the response body; if the web app stores them in `localStorage`, XSS can steal a 30-day session. Move web to `httpOnly` + `Secure` + `SameSite` cookies. Mobile keeps Bearer in Keychain/Keystore.
2. **Per-account login lockout.** Throttling is per-IP; add per-username lockout/backoff (needs a counter, like OTP) to resist distributed brute force.
3. **Redis throttler + OTP store** when scaling beyond one node (in-memory throttle is per-instance).
4. **Session lifetime.** Shorten 30-day non-rotating sessions; add rotation + "log out all devices".
5. **Media privacy.** Confirm MinIO buckets are private and served via short-TTL signed URLs only; enforce child-tag access on album media.
6. **🇺🇿 Data localization (legal + security).** Uzbekistan's Personal Data Law requires citizens' personal data to be stored on servers in Uzbekistan. Verify where Postgres + media actually live before onboarding real users. MinIO makes local/private hosting possible, but the deployed server location still matters.
7. **Dependency + secret scanning** in CI (`pnpm audit`, Dependabot, secret scanning).

## 4. Audit Findings Reference

Strong as-built: object-level authz on every report/child path, scrypt + `timingSafeEqual` password hashing, session tokens hashed at rest with strong entropy, Zod validation + `ParseUUIDPipe` everywhere, consistent audit logging on mutations, transactional multi-step writes. Phase 1 above closed the perimeter gaps; §3 is the roadmap.
