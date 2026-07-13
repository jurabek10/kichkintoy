# Family Guardian Invitations — Frontend Spec

Companion to [`family-guardian-invitations-spec.md`](./family-guardian-invitations-spec.md)
(backend). The backend is implemented: `family` + `telegram` modules in
[`packages/api/src`](../../packages/api/src), contracts in
[`family.contract.ts`](../../packages/shared/src/api/orpc/family.contract.ts) and
[`auth.contract.ts`](../../packages/shared/src/api/orpc/auth.contract.ts), migration
`20260713120000_family_guardian_invitations`. This spec covers everything the user sees,
plus the manual end-to-end test plan with a real Telegram bot (§7).

## 1. Scope

In scope:

- **Parent mobile** (`packages/mobile` — the design reference):
  - "Continue with Telegram" on the login screen.
  - New **Family** screen under Profile settings: guardians per child, pending
    invitations, invite creation with the 6-digit code, revoke/remove.
  - Feature gating for family guardians (non-primary): child editing and document
    submission hidden.
- **Web** (`packages/web`): mirror of both — Telegram login (link + QR + polling) on
  `/login`, Family section under `/dashboard/profile`, payments nav hidden for
  non-primary users, guardian badges on the staff-side child detail page.
- All strings in uz / ru / en via `packages/translations`.
- Manual E2E test plan with a real Telegram bot (and the sandbox fallback).

Out of scope:

- Teacher / director mobile apps (staff guardian visibility ships on web only in v1).
- Backend changes, except the **known gaps** listed in §8 (small bot-side items the
  manual test will surface; they are backend follow-ups, not frontend work).

## 2. API Surface Consumed (already live)

| Procedure | Used by |
| --- | --- |
| `orpc.family.listGuardians` | Family screen (mobile + web). Returns `canManage`, children with guardian lists, `pendingInvitations` (with `code`, `expiresAt`, `status`). |
| `orpc.family.createInvitation({ relationship })` | Invite bottom sheet / dialog. Returns `{ id, code, expiresAt }`. |
| `orpc.family.revokeInvitation({ invitationId })` | Pending invite row. |
| `orpc.family.removeGuardian({ userId })` | Guardian row (primary only). |
| `orpc.auth.telegramLoginStart()` | Login screens. Returns `{ nonce, deepLink, expiresAt }`. |
| `orpc.auth.telegramLoginPoll({ nonce })` | Login screens, polled every 2 s → `pending` \| `approved` (session token) \| `expired`. |

Primary-vs-family detection: the profile's children payload already carries `isPrimary`
per child — the client treats the user as a **family guardian** when they are primary for
no child, and gates UI accordingly. Server-side enforcement already exists (payments,
child edit); the frontend gating is UX, not security.

## 3. Parent Mobile (`packages/mobile`)

### 3.1 Login — "Continue with Telegram"

Location: [`app/login`](../../packages/mobile/app/login), under the existing phone +
password form, separated by an "or" divider.

- Button: Telegram brand-blue outline style consistent with the app's button system,
  paper-plane glyph + `auth.telegram.continue`.
- Tap → `telegramLoginStart` → `Linking.openURL(deepLink)` (opens the Telegram app on the
  bot chat with the login nonce) → the login screen shows a **waiting state**: spinner,
  `auth.telegram.waiting` ("Confirm the login in Telegram…"), and a Cancel button.
- While waiting, poll `telegramLoginPoll` every 2 s:
  - `approved` → store the session token exactly as the phone login does, then route into
    the app (same post-login navigation).
  - `expired` (nonce TTL 5 min) → error state with `auth.telegram.expired` and a
    **Try again** button that starts a fresh nonce.
  - Cancel → stop polling, back to the form (the nonce simply expires server-side).
- Polling continues while the app is backgrounded-and-resumed (re-check immediately on
  `AppState` active) so the round-trip Telegram → back feels instant.
- No inbound deep link into the Expo app is needed — the poll carries the session — so the
  flow works unchanged in **Expo Go**.
- Error cases: network failure during poll → keep polling (transient); `telegramLoginStart`
  failure → toast `common.error.generic`.

### 3.2 Family screen

Route: `app/profile-settings/family.tsx`, plus an entry row **Family**
(`family.title`, people icon) in
[`profile-settings/index.tsx`](../../packages/mobile/app/profile-settings/index.tsx)
between the existing profile rows. Data: `family.listGuardians` via the shared query
conventions; pull-to-refresh; skeleton loading state.

Layout (one section per child, matching the app's card/list pattern):

- **Child header**: child photo + name (photo + name in one element, app-wide rule).
- **Guardian rows**: avatar + full name (base `Avatar` resolves media-asset vs URL),
  relationship badge (`family.relationship.<value>`), `family.badge.primary` chip for the
  primary, Telegram username as secondary text when present. For the primary viewer,
  non-primary rows get a trailing **Remove** action → confirm dialog
  (`family.remove.confirmTitle` / `confirmBody` with the person's name) →
  `removeGuardian` → optimistic list update + success toast.
- **Pending invitations** (own card below the children): relationship, code displayed
  grouped (`483 921`, monospace-styled), `family.invite.expires` with the date as
  `16.07.2026`, actions **Share** (reopens the share sheet, §3.3) and **Revoke**
  (confirm → `revokeInvitation`).
- **Invite button**: primary button `family.invite.cta` pinned at the bottom. Disabled
  with caption `family.invite.capReached` when every child already has 3 guardians
  (compute from the payload). Hidden entirely when `canManage` is false.
- **Family-guardian view** (`canManage: false`): same screen, read-only — no invite
  button, no remove/revoke actions, no pending section.

### 3.3 Invite flow (bottom sheet → code view)

1. Tap invite → bottom sheet (the app's standard sheet) with the relationship picker:
   five option rows matching the contract enum — Father / Mother / Grandfather /
   Grandmother / Other (`family.relationship.*`) — then **Create**
   (`family.invite.create`).
2. On success the sheet content swaps to the **code view**:
   - the code huge and centered, grouped `483 921`, tap-to-copy (`family.invite.copied`
     toast);
   - numbered steps: `family.invite.step1` ("Open @KichkintoyBot in Telegram"),
     `step2` ("Press Start"), `step3` ("Enter this code");
   - expiry line (`family.invite.expires`, 72 h from now, `16.07.2026 14:30` format);
   - **Share** button → native share sheet with `family.invite.shareMessage` — a single
     localized string containing the bot username and the code, e.g. uz: "Sizni
     Kichkintoy'ga taklif qilishdi! Telegramda @KichkintoyBot ni oching, Start bosing va
     ushbu kodni kiriting: 483921".
3. Closing the sheet refreshes the list (the new invite appears under pending).

The bot username comes from a shared constant (`EXPO_PUBLIC_TELEGRAM_BOT_USERNAME` /
`NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, default `KichkintoyBot`) so share texts and links
never hardcode it.

### 3.4 Family-guardian gating (mobile)

For a user with no `isPrimary` child:

- `profile-settings/child.tsx` (child edit) — entry hidden.
- Admission/student document submission entries — hidden.
- Everything else (reports, albums + comments/reactions, attendance, meals, notices,
  calendar, medications, pickups, messaging, notifications) — identical to the primary.

## 4. Web (`packages/web`)

### 4.1 Login page

[`app/login`](../../packages/web/app/login): same "or" divider + **Continue with
Telegram** button. Clicking it calls `telegramLoginStart` and swaps the form panel to a
waiting card:

- QR code of `deepLink` (rendered client-side; add the `qrcode` package if we don't have
  one) for the phone-Telegram case, plus a plain **Open Telegram** link (`deepLink`) for
  Telegram Desktop users;
- the same 2 s `telegramLoginPoll` loop; `approved` → establish the session exactly as
  the password login does → redirect to `/dashboard`;
- `expired` → "code expired, try again" state; Cancel returns to the form.

### 4.2 Family page

`app/dashboard/profile` gains a **Family** section (own card or tab, following the
profile page's existing structure): the same content as §3.2 — per-child guardian lists
with avatar + name in one cell, relationship badges, primary chip, remove buttons;
pending invitations with code, expiry, share-again (copies the localized share message to
the clipboard) and revoke; **Invite family member** button opening a dialog with the
relationship picker → code view (identical copy to mobile). TanStack Query with the
`queryKeys` factory; mutations invalidate the family query.

### 4.3 Role gating + staff visibility

- **Payments** nav item and `/dashboard/payments` pages are hidden for users who are
  primary for no child (server already rejects; this is UX).
- Teacher/director **child detail** page (`dashboard/children`): the existing guardian
  info area lists **all** guardians — avatar + name, relationship badge, primary chip —
  read-only.

## 5. Translations

New keys (all in uz / ru / en in `packages/translations/locales`; uz first, verify
lengths on buttons):

- `auth.telegram.continue`, `.waiting`, `.expired`, `.tryAgain`, `.openTelegram`,
  `.scanQr`
- `family.title`, `family.badge.primary`
- `family.relationship.father|mother|grandfather|grandmother|other`
- `family.invite.cta`, `.create`, `.capReached`, `.expires`, `.copied`, `.step1`,
  `.step2`, `.step3`, `.shareMessage`, `.pendingTitle`, `.share`, `.revoke`,
  `.revokeConfirmTitle`, `.revokeConfirmBody`
- `family.remove.action`, `.confirmTitle`, `.confirmBody`
- `family.empty` (no other guardians yet — shown under a child with only the primary)

Same keys and wording on web and mobile. Dates `25.06.2026`, 24-hour times,
Asia/Tashkent.

## 6. States, Errors, Edge Cases (frontend)

- **Removed guardian mid-session**: their sessions are revoked server-side; the next API
  call returns 401 → existing global logout handling kicks in. No special UI.
- **Cap race**: `createInvitation` can reject (cap hit between render and tap) → show the
  server message as a toast and refetch.
- **Invite accepted while the screen is open**: pull-to-refresh / query invalidation on
  screen focus shows the new guardian; no realtime push in v1.
- **Multi-child families**: one invite covers all children; the Family screen groups by
  child so mom sees exactly who is attached to whom.
- **Offline**: standard query error states; the invite code view keeps the code visible
  (it's already created) so mom can share it later from the pending list.

## 7. Manual E2E Test Plan (real Telegram)

### 7.1 One-time setup

1. **Create the bot**: in Telegram, talk to `@BotFather` → `/newbot` → pick a name and a
   username (e.g. `KichkintoyDevBot`). Copy the token.
2. **Env** (`packages/api` `.env`):
   `TELEGRAM_BOT_TOKEN=<token>`, `TELEGRAM_BOT_USERNAME=KichkintoyDevBot`,
   `TELEGRAM_WEBHOOK_SECRET=<any long random string>`, and set
   `EXPO_PUBLIC_TELEGRAM_BOT_USERNAME` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` to match.
3. **Expose the API** (Telegram must reach the webhook): `ngrok http 4000` (or
   `cloudflared tunnel --url http://localhost:4000`). Note the public https URL.
4. **Register the webhook**:

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<public-host>/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"   # verify, check pending_update_count
   ```

5. Run `pnpm dev:api`, `pnpm dev:web`, `pnpm dev:mobile`. You need **one real Telegram
   account** to play "dad" (your own); "mom" is a normal phone-signup parent account with
   at least one approved child. For the cap tests a second Telegram account (or a second
   test bot round with the first guardian removed) is needed.

> Setting `TELEGRAM_BOT_TOKEN` automatically **disables** the `/telegram/sandbox`
> endpoint — real-bot mode and sandbox mode are mutually exclusive by design.

### 7.2 Test checklist

**Invite creation (mom, mobile + web)**

1. Family screen shows mom as Primary under each child; empty family state otherwise.
2. Create an invite (Father) → code view shows a 6-digit grouped code, 3 steps, expiry
   ≈72 h; Share opens the share sheet with the localized message; code appears under
   Pending.
3. Create a second invite → allowed. A third while both are pending → blocked with a
   clear message (max 2 pending).
4. Revoke a pending invite → disappears; entering its code in the bot → "invalid or
   expired" reply.

**Bot acceptance (dad's Telegram)**

5. Open the bot → Start → welcome message prompts for a code.
6. Type a wrong code 6 times → cooldown message ("try again in 24 hours"); restart the
   API to clear (in-memory) and continue.
7. Type the real code (with and without a space — `483 921` must work) → Accept/Decline
   buttons → Accept → success reply. Mom's Family screen now lists dad (after refresh)
   with the right relationship badge and his Telegram username.
8. Re-enter the same code → invalid/expired reply (single-use).

**Telegram login (dad)**

9. Mobile app → Continue with Telegram → Telegram opens on the bot → Confirm login →
   return to the app → it logs in within ~2 s and lands on the home feed showing mom's
   child(ren).
10. Log out, repeat on **web**: QR path (scan with phone) and the "Open Telegram" link
    path (Telegram Desktop). Both must land on `/dashboard`.
11. Start a login but wait >5 min before confirming → app shows "expired", Try again
    works.
12. On a Telegram account that was never invited: Continue with Telegram → bot replies
    "no account" → app keeps waiting → cancel works.

**Permissions (dad logged in)**

13. Sees reports, albums (can comment/react), attendance, meals, notices, calendar; can
    create a medication/pickup request; can message the teacher.
14. Sees **no** payments nav (web), no child-edit entry, no document submission; direct
    API calls (or direct URL on web) are rejected by the server.
15. Family screen is read-only for dad (no invite/remove buttons).

**Cap & removal**

16. With dad + one more family guardian accepted (3 total per child): invite button is
    disabled with the cap caption.
17. Mom removes dad → he disappears from the list; dad's app hits a 401 on next action
    and returns to login; Continue with Telegram now gets the "no account" bot reply
    (guardianship gone). Re-invite → accept → he's back, same Telegram identity, no
    duplicate account (check `users` has one row for his `telegramId`).

**Staff visibility & i18n**

18. Director/teacher web child detail shows all guardians with badges.
19. Switch app language uz → ru → en: every new string translates; uz strings fit the
    buttons; dates render `25.06.2026`.

### 7.3 Sandbox fallback (no bot, CI / quick local)

With `TELEGRAM_BOT_TOKEN` unset, drive the same flows with curl:

```bash
# dad accepts an invite
curl -X POST localhost:4000/telegram/sandbox -H 'content-type: application/json' \
  -d '{"action":"accept","code":"483921","telegramId":"777000111","fullName":"Aziz Karimov","username":"azizk","language":"uz"}'

# dad confirms a login (nonce from the app's telegramLoginStart call)
curl -X POST localhost:4000/telegram/sandbox -H 'content-type: application/json' \
  -d '{"action":"login","nonce":"<nonce>","telegramId":"777000111"}'
```

The mobile/web waiting screens pick the approval up via their normal polling — useful for
demoing the full UI without leaving localhost.

## 8. Known Backend Gaps (will surface during §7 — fix as backend follow-ups)

1. **Bot messages are hardcoded English** — the backend spec (§8.3 there) requires
   uz/ru/en from `packages/translations` with a language picker on first contact.
2. **Code entry preview is generic** ("Invitation found…") — the spec calls for showing
   the inviter's name and child name(s) before Accept, so dad knows what he's joining.
3. **Attempt-limit state is in-memory** (`Map` in the controller) — resets on API restart
   and won't survive multiple instances; move to the DB or cache when hardening.
4. **Decline button** answers with no handler action (`callback_data: "decline"`) — should
   at least acknowledge and, ideally, mark the invitation declined.

## 9. Ship Order

1. Mobile login (Telegram button + waiting/polling states).
2. Mobile Family screen + invite flow (reference design).
3. Web login mirror (QR + link).
4. Web Family section + payments gating + staff guardian badges.
5. Translations land with each step (uz/ru/en together, never partially).
6. Manual E2E pass per §7, then fix the §8 backend gaps.
