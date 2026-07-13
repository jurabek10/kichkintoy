# Family Guardian Invitations Spec (Telegram)

> **API note: the app API is oRPC-only.** Any `METHOD /path` endpoints in this spec are
> conceptual — the live API is typed oRPC procedures in domain contracts under
> [`shared/src/api/orpc/`](../../packages/shared/src/api/orpc/), composed by
> [`orpc-contract.ts`](../../packages/shared/src/api/orpc-contract.ts). The only true HTTP
> exception in this spec is the Telegram bot webhook (§8.1), which Telegram calls directly.

## 1. Scope

Today only the signing-up parent (in practice: mom, with an Uzbek phone number verified by
Eskiz SMS) can see her child's information. Many Uzbek families are split across borders —
mom is in Uzbekistan handling kindergarten, dad works abroad and has no Uzbek SIM, so he can
never pass SMS verification. Telegram, however, is near-universal among Uzbeks at home and
abroad.

This spec adds **family guardian invitations**: the primary guardian invites up to two
family members per child with a **6-digit invitation code** entered in the Kichkintoy
Telegram bot; they sign up and log in with their Telegram identity (no phone, no password)
and use the same parent apps (Expo mobile from Play Market / App Store, and web) from
anywhere in the world.

In scope:

- A **@KichkintoyBot** Telegram bot, webhook-served from `packages/api` (new `telegram`
  module), handling invite acceptance and login confirmation.
- Telegram identity on `User` (`telegramId`, `telegramUsername`).
- New `FamilyInvitation` model + oRPC procedures (create / list / revoke / status).
- New `TelegramLoginNonce` flow: "Continue with Telegram" on the parent mobile app and web.
- A **Family** management screen (parent mobile + web, identical design): guardian list,
  pending invites, invite creation, revocation.
- Guardian visibility for teachers/directors on the child detail page (relationship badges).
- Hard cap: **max 3 guardians per child** (1 primary + up to 2 invited).
- All strings in uz / ru / en, including bot messages.

Out of scope (v1 — deferred, the bot makes these easy later):

- Telegram notifications (daily report ready, new photos, etc.).
- Letting phone-signup users link a Telegram account to their existing account.
- Per-invite permission tuning (e.g. "view only" invitees).
- Teacher/director Telegram login.
- Changes to the existing phone + Eskiz SMS signup — it is untouched.

## 2. Vocabulary

- **Primary guardian**: the parent who signed up with phone + SMS and registered the child.
  `ChildGuardian.isPrimary = true`. Exactly one per child.
- **Family guardian**: an invited family member. `ChildGuardian.isPrimary = false`,
  `ChildGuardian.accessLevel = "family"`.
- **Family invitation**: a row in `family_invitations` created by the primary guardian,
  identified by a single-use **6-digit numeric code** entered in the bot, expiring after
  **72 hours**.
- **Telegram-born user**: a `User` created through invite acceptance. Has `telegramId`,
  has **no** `AuthCredential` (no password) and typically no `phone`.
- **Login nonce**: a short-lived (5 min) single-use token binding one "Continue with
  Telegram" attempt on a device to one bot confirmation.

## 3. Roles And Permissions

Family guardians get the **same parent app experience** as the primary guardian for the
children they are linked to — home feed, daily reports, albums (view + comment + react),
attendance calendar, meal menu, notices, calendar/birthdays, teacher messaging — with these
exclusions, enforced server-side in the relevant oRPC procedures:

| Capability | Primary | Family |
| --- | --- | --- |
| View all child content, comment, react, message teachers | ✅ | ✅ |
| Medication / pickup / return-home requests | ✅ | ✅ |
| Tuition invoices & payments (Payme/Click) | ✅ | ❌ (screen hidden; API rejects) |
| Edit child profile (photo, allergies, notes) | ✅ | ❌ |
| Invite / revoke family guardians | ✅ | ❌ |
| Student document submissions | ✅ | ❌ |

Server-side rule of thumb: procedures that mutate the child's identity, money, or the
guardian set require `isPrimary = true`; everything else requires any active
`ChildGuardian` row.

## 4. End-To-End Flow Summary

```text
Invite (mom, in Uzbekistan)
  1. Profile → Family → "Invite family member"
  2. Picks relationship (Dad / Grandpa / Grandma / Other)
  3. API creates FamilyInvitation, returns a 6-digit code, e.g. 483 921.
  4. The app shows the code big and copyable, with a Share button → native share
     sheet with a localized message: "Open @KichkintoyBot in Telegram and enter
     code 483921 to see <child>'s kindergarten updates." Mom sends it to dad in
     Telegram — or just reads the code to him over the phone.

Accept (dad, abroad, inside Telegram)
  5. Dad opens @KichkintoyBot (searches the name or taps the bot mention in
     mom's message) → taps Start → bot asks for the invitation code → dad types
     the 6 digits. The bot validates the code and shows: inviter name, child
     name(s), relationship, in uz/ru/en → [Accept] button.
  6. On Accept the API:
     - captures dad's Telegram ID / name / username,
     - creates his User (or reuses an existing user with that telegramId),
     - creates ChildGuardian rows for every child of the inviter where the
       guardian count is < 3 (isPrimary=false, accessLevel="family",
       relationship from the invite),
     - marks the invitation accepted.
  7. Bot replies with App Store / Play Market links and instructions:
     "Open the app and tap Continue with Telegram."

Login (dad, in the parent app or web)
  8. Login screen → "Continue with Telegram" → app requests a login nonce
     from the API and opens https://t.me/KichkintoyBot?start=login_<nonce>.
  9. Bot resolves dad's telegramId → finds his User → shows [Confirm login]
     → marks the nonce approved.
 10. The app polls the API with the nonce; on approval it receives a normal
     AuthSession token. Web shows the same link plus a QR code and polls identically.
```

## 5. Data Model

### 5.1 `User` (modified)

```prisma
telegramId       BigInt?  @unique @map("telegram_id")
telegramUsername String?  @map("telegram_username")
```

- `telegramId` is Telegram's permanent numeric user id — the identity anchor.
- Telegram-born users have `phone = null`, no `AuthCredential` (relation already optional).
- `preferredLanguage` is set from the language the user picked in the bot (§8.3).

### 5.2 `FamilyInvitation` (new — mirrors `CenterInvitation`)

```prisma
model FamilyInvitation {
  id               String    @id @default(uuid()) @db.Uuid
  invitedByUserId  String    @map("invited_by_user_id") @db.Uuid
  relationship     String    // "father" | "mother" | "grandfather" | "grandmother" | "other"
  code             String    // 6 digits; uniqueness among pending invites enforced in the service
  expiresAt        DateTime  @map("expires_at") @db.Timestamptz(6)
  acceptedAt       DateTime? @map("accepted_at") @db.Timestamptz(6)
  acceptedByUserId String?   @map("accepted_by_user_id") @db.Uuid
  telegramUserId   BigInt?   @map("telegram_user_id")
  revokedAt        DateTime? @map("revoked_at") @db.Timestamptz(6)
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  invitedByUser  User  @relation("FamilyInvitationCreator", fields: [invitedByUserId], references: [id])
  acceptedByUser User? @relation("FamilyInvitationAcceptor", fields: [acceptedByUserId], references: [id])

  @@index([invitedByUserId, createdAt(sort: Desc)])
  @@index([code])
  @@map("family_invitations")
}
```

- `code`: 6 random digits (`crypto.randomInt`), single-use, unique among **pending**
  invitations (generate-and-retry on collision; expired/consumed codes are excluded from
  lookup, so reuse of old digits is harmless). Displayed grouped as `483 921`, entered
  with or without the space.
- Because the keyspace is only 1M, codes are worthless without the brute-force controls
  in §9 — treat those as part of this feature, not hardening for later.
- The invitation is **family-scoped, not child-scoped**: acceptance links the invitee to
  all of the inviter's children (subject to the per-child cap). This matches the existing
  family-scope direction of the parent apps and avoids making mom send two links for two
  kids.
- Status is derived: revoked → accepted → expired → pending (in that precedence).

### 5.3 `TelegramLoginNonce` (new)

```prisma
model TelegramLoginNonce {
  id         String    @id @default(uuid()) @db.Uuid
  nonceHash  String    @unique @map("nonce_hash")
  userId     String?   @map("user_id") @db.Uuid
  approvedAt DateTime? @map("approved_at") @db.Timestamptz(6)
  consumedAt DateTime? @map("consumed_at") @db.Timestamptz(6)
  expiresAt  DateTime  @map("expires_at") @db.Timestamptz(6)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("telegram_login_nonces")
}
```

Same hash-at-rest discipline as `PhoneVerification` / `AuthSession`: the raw nonce lives
only in the deep link and the polling client; the DB stores its hash.

### 5.4 `ChildGuardian` (unchanged schema, new usage)

Rows created at acceptance: `isPrimary=false`, `accessLevel="family"`, `relationship` from
the invite, `canPickup=false`, `canMessage=true`. Existing code that renders guardians
keeps working.

## 6. oRPC Surface (new `family` domain + `auth` additions)

- `family.listGuardians` → for the current primary guardian: children with their guardian
  lists (name, photo, relationship, isPrimary) + pending invitations (relationship,
  expiresAt, code for re-sharing).
- `family.createInvitation({ relationship })` → validates caller is a primary guardian of
  at least one child below the cap; enforces at most **2 non-primary guardians per child**
  and at most **2 pending invitations** at a time; returns `{ id, code, expiresAt }`.
- `family.revokeInvitation({ invitationId })` → pending invites only; sets `revokedAt`.
- `family.removeGuardian({ userId })` → deletes the family guardian's `ChildGuardian` rows
  for the caller's children and revokes all of that user's `AuthSession`s. Rejects if the
  target `isPrimary`.
- `auth.telegramLoginStart()` → creates a nonce, returns `{ nonce, deepLink, expiresAt }`.
  Unauthenticated; rate-limited per IP.
- `auth.telegramLoginPoll({ nonce })` → `pending` | `approved` (returns session token,
  marks nonce consumed) | `expired`. Polled every ~2s by the client.

## 7. UI

### 7.1 Family screen (parent mobile — reference — and web mirror)

`Profile → Family` ("Oila"). Per child (or one section per child in multi-child families):

- Guardian rows: photo + name in one element (per the app-wide name-photo rule),
  relationship badge, "Primary" badge for mom. Family guardians get a trailing **Remove**
  action (confirm dialog) visible only to the primary guardian.
- Pending invitation rows: relationship, the code (e.g. `483 921`), "expires 16.07.2026",
  **Share again** (reopens the share sheet with the same code message) and **Revoke**.
- **"Invite family member"** button — disabled with an explanatory caption when every child
  is at the cap. Tapping it opens a bottom sheet: relationship picker (Dad / Grandpa /
  Grandma / Other) → Create → the code shown large and copyable with step-by-step
  instructions ("1. Open @KichkintoyBot in Telegram · 2. Press Start · 3. Enter this
  code") and a **Share** button for the localized message.
- Family guardians see the same screen read-only (no invite/remove controls).

### 7.2 Login screens

Parent mobile app and web login get a **"Continue with Telegram"** button under the
existing phone form. Tapping it starts the nonce flow (§4 steps 8–10) and shows a
"Waiting for Telegram confirmation…" state with a cancel option. Web additionally renders
a QR code of the deep link for phone-Telegram users.

### 7.3 Teacher / director visibility

The child detail page (web + staff mobile apps) lists all guardians with relationship
badges and marks the primary. No staff-side management actions in v1.

## 8. Telegram Bot

### 8.1 Infrastructure

- New `packages/api/src/telegram` module. Webhook endpoint `POST /telegram/webhook`,
  registered with Telegram via `setWebhook` and protected by the
  `X-Telegram-Bot-Api-Secret-Token` header (secret in env).
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.
  Like the payments sandbox, when the token is absent the module runs in **sandbox mode**:
  invite codes and login deep links are still generated, and a dev-only endpoint simulates
  bot interactions (code entry, accept, login confirm) so the whole flow is testable
  locally without a real bot.
- Only `/start`, `/start login_<nonce>`, 6-digit code messages, and the inline-button
  callbacks below are handled; anything else gets a localized "use the Kichkintoy app"
  reply.

### 8.2 Conversations

- Bare `/start`: language picker (§8.3) if first contact, then a short localized intro
  with a "have an invitation code? just type it here" prompt + store links.
- **Code entry** (any message that is 6 digits, spaces ignored): validate (exists,
  pending, not expired, sender not over the attempt limit — §9). On success show inviter
  name, child name(s), relationship + **Accept** / **Decline** inline buttons. Accept runs
  §4 step 6 atomically and replies with store links. Invalid/expired/revoked/used codes
  get a specific, polite localized explanation; repeated failures get the cooldown message.
- `/start login_<nonce>`: if the sender's `telegramId` maps to a user → **Confirm login** /
  **Cancel** buttons; confirm approves the nonce. Unknown `telegramId` → "no account yet —
  ask your family member for an invitation code."

### 8.3 Bot language

First contact shows a language picker (uz / ru / en) defaulting to the inviter's
`preferredLanguage`; the choice is stored on the invitation (pre-account) and then as the
user's `preferredLanguage`. All bot strings live in `packages/translations` alongside the
app strings.

## 9. Security

- Invite codes and login nonces: cryptographically random, single-use, TTLs of **72
  hours** / **5 minutes** respectively. Nonces are hashed at rest.
- **Brute-force controls for 6-digit codes** (mandatory, since the keyspace is 1M):
  - max **5 failed code attempts per Telegram user per hour**, then a 24-hour cooldown
    for that `telegramId` (tracked server-side, localized cooldown message);
  - a global alert (log + notification to platform admins) when aggregate failed attempts
    spike, indicating a scripted scan;
  - at most 2 pending invitations per family and 72-hour expiry keep the number of live
    codes — and thus the hit probability — tiny.
- `telegramId` is trusted only when it arrives via the authenticated webhook (secret
  header) — never from client input.
- The cap (≤ 3 guardians per child) is enforced inside the acceptance transaction, not just
  in the UI, so two invites accepted concurrently cannot exceed it.
- Revoking a guardian revokes all their sessions immediately.
- Rate limits: invitation creation (per user), `telegramLoginStart` (per IP), webhook
  update handling (per telegramId).
- Audit log entries (existing `AuditLog`) for invite created / accepted / revoked and
  guardian removed.

## 10. Edge Cases

- **Invitee already has an account** (same `telegramId` — e.g. two moms invite the same
  grandma): no new `User`; just add the missing `ChildGuardian` rows.
- **One child at cap, another not** (multi-child family): acceptance links the children
  below the cap and the bot's confirmation names exactly which children were linked.
- **All children at cap at acceptance time** (race with another invite): invitation is
  marked accepted-with-no-effect and the bot explains the limit.
- **Mom removes dad, later re-invites him**: fresh invitation; his existing account is
  reused via `telegramId`.
- **Code shared with / guessed by the wrong person**: single-use + 72-hour expiry + the
  §9 attempt limits keep exposure low; mom sees who accepted (name + Telegram username)
  on the Family screen and can remove them instantly, which also revokes their sessions.
- **Child graduates / changes center**: guardianship is child-scoped, not center-scoped —
  nothing changes.

## 11. Testing

- Unit: invitation service (cap enforcement, expiry, revoke, re-invite, code generation
  collision retry, concurrent-accept transaction), code attempt limiting + cooldown,
  nonce lifecycle (approve/consume/expire), permission guards for the family-excluded
  procedures (§3).
- Webhook handler tests with mocked Telegram updates (code entry, accept, decline,
  unknown user, invalid code, attempt cooldown, language picker).
- E2E happy path in sandbox mode: create invite → simulate accept → simulate login confirm
  → poll returns session → family-guardian API access verified, payments API rejected.

## 12. Rollout Notes

- Prisma migration adds `User.telegramId/telegramUsername`, `family_invitations`,
  `telegram_login_nonces` — purely additive, no backfill.
- Bot must be created via BotFather and the webhook registered per environment; until then
  sandbox mode keeps dev/CI green.
- Ship order: API (models + bot + auth flow) → parent mobile (Family screen + Telegram
  login) → web mirror → staff-side guardian badges.
