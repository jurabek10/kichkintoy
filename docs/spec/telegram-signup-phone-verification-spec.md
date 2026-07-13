# Telegram Signup Phone Verification Spec

> **API note: the app API is oRPC-only.** Endpoints written as `METHOD /path` are
> conceptual — the live API is typed oRPC procedures under
> [`shared/src/api/orpc/`](../../packages/shared/src/api/orpc/). The only true HTTP
> surface here is the existing Telegram bot webhook (`POST /telegram/webhook`) from the
> [family guardian invitations spec](./family-guardian-invitations-spec.md), which this
> feature extends.

## 1. Scope

Today every signup (parent, teacher, director) verifies the phone with an Eskiz SMS code.
This spec adds a **second verification channel the user chooses at the phone step**:

- **Sign up with phone (SMS)** — the existing Eskiz flow, unchanged.
- **Sign up with Telegram** — the user opens @KichkintoyUzBot via a deep link; the bot
  shows Telegram's built-in **"Share my phone number"** contact button; sharing it proves
  phone ownership (Telegram accounts are themselves SMS-verified by Telegram). The app
  continues the same signup wizard with the phone filled in and verified.

Everything after verification — full name, username, password, role, center selection /
child registration / director setup — is **identical for both channels and all three
roles**. `auth.register`'s contract does not change.

Users who verify via Telegram get `telegramId` / `telegramUsername` stored at
registration, so **"Continue with Telegram" login works for them immediately** (reusing
the login-nonce flow from the family spec).

Because Telegram phone numbers can be non-Uzbek, this also quietly removes Eskiz as the
only gate: a parent abroad can sign up as a primary guardian with a foreign number.

In scope:

- New nonce purpose `verify` on the existing Telegram nonce flow.
- Bot handling of `/start verify_<nonce>` + contact sharing.
- `auth.telegramVerifyStart` / `auth.telegramVerifyPoll` oRPC procedures.
- Channel choice UI on the signup phone step: parent mobile (reference), web, then
  teacher-mobile and director-mobile identically.
- Sandbox-mode simulation so the flow is testable without the real bot.
- All strings (app + bot) in uz / ru / en.

Out of scope (v1):

- Linking Telegram to an **existing** phone-signup account (still deferred).
- Login changes — "Continue with Telegram" already exists and is untouched.
- Changing or removing the Eskiz SMS flow — it stays as-is.

## 2. Flow

```text
Choose channel (any role, in the app signup wizard, phone step)
  1. The phone step offers two actions:
     [ Get SMS code ]  (existing, primary)
     [ Verify via Telegram ]  (new, secondary, Telegram mark)

Telegram path
  2. App calls auth.telegramVerifyStart() →
     { nonce, deepLink: https://t.me/<bot>?start=verify_<nonce>, expiresAt (5 min) }.
     Mobile opens the deep link; web shows the link + QR code (same pattern as
     Telegram login) — both show "Waiting for Telegram…" with a Cancel action.
  3. Bot receives /start verify_<nonce> → localized message + a reply keyboard with
     one request_contact button ("Share my phone number").
  4. User taps it; Telegram sends the contact to the webhook. The API:
     - checks contact.user_id === sender id (rejects forwarded third-party contacts),
     - normalizes the phone to +<digits>,
     - creates a PhoneVerification row (channel="telegram", verifiedAt=now, fresh
       verificationToken, telegramId + telegramUsername captured),
     - marks the nonce approved and links it to that verification row,
     - replies in the bot: "Phone verified — return to the Kichkintoy app."
  5. App polls auth.telegramVerifyPoll({ nonce }) every ~2s →
     pending | expired | verified { phoneNumber, verificationToken }.
  6. On verified, the app shows the phone read-only with a "Verified via Telegram"
     badge and proceeds to the existing form (name, username, password, role setup).
  7. auth.register consumes the verificationToken exactly as for SMS. Internally,
     when the consumed row has channel="telegram", the created User also gets
     telegramId / telegramUsername.
```

The SMS path is byte-for-byte the current flow.

## 3. Data Model (additive only)

### 3.1 `PhoneVerification` (modified)

```prisma
channel          String  @default("sms")            // "sms" | "telegram"
telegramId       BigInt? @map("telegram_id")
telegramUsername String? @map("telegram_username")
```

Telegram-channel rows are born verified (`verifiedAt` set, no `codeHash` use — store a
random hash so the column stays non-null and unusable).

### 3.2 `TelegramLoginNonce` (modified — becomes the shared Telegram nonce table)

```prisma
purpose             String  @default("login")       // "login" | "verify"
phoneVerificationId String? @map("phone_verification_id") @db.Uuid
```

One table for both flows: same hash-at-rest, single-use, TTL discipline (5 min for both
purposes). `phoneVerificationId` lets `telegramVerifyPoll` return the phone + token.

No other schema changes. Migration is purely additive.

## 4. oRPC Surface (`auth` additions)

- `auth.telegramVerifyStart()` → `{ nonce, deepLink, expiresAt }`. Unauthenticated,
  rate-limited per IP (same budget as `telegramLoginStart`). Deep-link payload is
  `verify_<nonce>`.
- `auth.telegramVerifyPoll({ nonce })` → discriminated union:
  - `{ status: "pending" }`
  - `{ status: "expired" }`
  - `{ status: "verified", phoneNumber, verificationToken }` — first successful poll
    consumes the nonce; later polls return `expired`.
- `auth.sendCode` / `auth.verifyCode` / `auth.register` / `auth.lookupInvitations`:
  **unchanged contracts.** `register` and `lookupInvitations` accept Telegram-issued
  verification tokens transparently because both channels share `PhoneVerification`.

## 5. Telegram Bot (extends the family-spec bot)

- `/start verify_<nonce>`: validate the nonce (exists, purpose `verify`, pending, not
  expired). Valid → send the localized prompt with a one-button `request_contact` reply
  keyboard. Invalid/expired → localized "this link has expired — go back to the app and
  try again."
- **Contact message**: only honored while the sender has a pending `verify` nonce.
  Enforce `contact.user_id === from.id`; a forwarded contact gets a localized "please
  share your own number using the button." After success, remove the reply keyboard.
- If the sender's `telegramId` already belongs to a `User`: reply "You already have an
  account — open Kichkintoy and use *Continue with Telegram* to log in" and do **not**
  create a verification row (prevents duplicate-account signups; `telegramId` stays
  unique).
- Everything else (bare `/start`, 6-digit codes, login confirmation) behaves per the
  family spec.
- **Sandbox mode** (no `TELEGRAM_BOT_TOKEN`): `POST /telegram/sandbox` gains
  `{ action: "verify", nonce, telegramId, phone, username?, fullName? }` performing
  step 4 of §2, so dev/CI runs the whole flow without a real bot.

## 6. UI

### 6.1 Signup phone step (parent mobile — reference; web mirror; staff apps identical)

- Phone input + primary **"Get SMS code"** button (existing) and a secondary
  **"Verify via Telegram"** button with the Telegram mark beneath it, separated by a
  localized "or" divider.
- Tapping Telegram: mobile opens the deep link and shows a "Waiting for Telegram
  confirmation…" state with Cancel (returns to the idle phone step, nonce abandoned).
  Web shows the button, the link, and a QR code — same composition as the Telegram
  login screen.
- On success: phone field fills read-only with a "Verified via Telegram" badge and the
  wizard advances exactly as after SMS verification. The user can tap "Change" to
  restart verification (either channel).
- Failure states: expired nonce → "Verification timed out — try again"; the
  already-has-account bot reply leaves the app waiting, so the waiting state includes a
  hint: "Already have an account? Log in with Telegram instead" linking to login.

### 6.2 Translations

New keys in `packages/translations` (uz / ru / en), shared verbatim across web and all
mobile apps: the two channel buttons, "or" divider, waiting/cancel, verified badge,
timeout error, login hint, and the bot strings in §5. Verify Uzbek copy fits the
buttons (e.g. `Telegram orqali tasdiqlash`).

## 7. Security

- Nonces: cryptographically random, hashed at rest, single-use, 5-minute TTL; consumed
  on the first successful poll.
- `contact.user_id === from.id` is mandatory — the phone is trusted only because
  Telegram verified it for **that** account.
- Phone numbers arrive only via the authenticated webhook (secret header) or the
  dev-only sandbox endpoint — never from app client input on the Telegram path.
- Rate limits: `telegramVerifyStart` per IP; webhook contact handling per `telegramId`
  (reuse the family-spec attempt limiter).
- Existing `register` protections (duplicate phone / username) apply unchanged.
- Audit log entries for `telegram_verify` issued / completed.

## 8. Edge Cases

- **Phone already registered**: verification succeeds (the bot cannot know the app-side
  phone table), and `register` rejects with the existing duplicate-phone error — same
  behavior as SMS today.
- **telegramId already on a User**: blocked in the bot (§5) before any verification row
  is created.
- **Same phone, different Telegram account than before**: allowed — phone uniqueness is
  enforced at `register`, `telegramId` uniqueness at the bot.
- **User abandons the wizard after verifying**: the verification row expires unconsumed
  (existing TTL semantics); nothing to clean up.
- **Nonce link opened by a different Telegram user than intended**: harmless — whoever
  shares their own contact becomes the verified identity; the nonce binds a device
  session, not a person.
- **User taps "Verify via Telegram" twice**: each tap issues a fresh nonce; earlier
  nonces simply expire.
- **Foreign phone numbers**: accepted end-to-end (`phoneNumberSchema` is already
  international; store E.164-normalized).

## 9. Testing

- Unit: verify-nonce lifecycle (issue → approve → poll-consume → expire), contact
  ownership rejection, already-linked-telegramId rejection, register consuming a
  telegram-channel token and stamping `telegramId` on the user.
- Webhook tests with mocked updates: `/start verify_<nonce>` valid/expired, own vs
  forwarded contact, contact with no pending nonce.
- E2E in sandbox mode, per role: start verify → sandbox verify → poll returns phone +
  token → register (parent with child payload, teacher with invitation, director with
  setup) → session works → "Continue with Telegram" login works for the new user.

## 10. Rollout

- Prisma migration: three columns on `phone_verifications`, two on
  `telegram_login_nonces` — additive, no backfill.
- No new env vars; reuses `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` /
  `TELEGRAM_WEBHOOK_SECRET`. Sandbox mode keeps dev/CI green until the webhook is
  registered per environment.
- Ship order: API (schema + bot + procedures) → parent mobile → web → teacher-mobile /
  director-mobile.
