# Director "My Page" — Design Spec

**Date:** 2026-06-23
**Status:** Draft for review
**Scope:** Director role only. Teacher and Parent "My Page" will reuse this foundation in follow-up specs.

---

## 1. Goal

Give a signed-in **director** a single place to view and edit their own account —
the equivalent of Kidsnote's "내 정보 / 더보기" (My info / More) screen. Today there is
no such page for any role: the only account action available in the app is **Sign out**.

A director must be able to view and update **all of their own account data** from this one
page:

- See who they are (avatar, name, role, the center they run).
- Change their **profile photo** (upload / replace / remove).
- Edit **full name** and **email**.
- Change their **phone number** (with SMS OTP re-verification).
- Change their **username**.
- Change their **password**.
- Change their **interface language** (persisted to their account, not just the session).
- Manage **notification settings** (push / SMS, quiet hours).

This is the director's *personal* account page — every editable field on the `User` record
plus credentials and notification settings. It is **not** center/organization configuration
(center name, address, branches, logo); that is shared organizational data with its own
permissions and is a separate feature (see §7). If you want center settings folded in too,
say so and we'll spec it separately.

---

## 2. What exists today (context)

- **Auth model:** directors log in with **username + password** (`loginSchema`), so
  password change belongs on this page. Phone is captured at signup and verified by SMS
  OTP (Eskiz), but is **not** the login credential.
- **`User`** (`packages/api/prisma/schema.prisma:131`) already has the fields we need:
  `fullName`, `avatarUrl`, `email` (`@unique`), `phone` (`@unique`), `username` (`@unique`),
  `preferredLanguage` (default `"uz"`).
- **`AuthCredential`** holds the bcrypt `passwordHash`.
- **`UserNotificationSettings`** already models `pushEnabled`, `smsEnabled`,
  `quietHoursStart`, `quietHoursEnd` (one row per user, `userId @unique`).
- **`auth.me`** returns a deliberately lean shape (id, username, phoneNumber, fullName,
  roles[]). It is used for session bootstrap, so we will **not** overload it; we add a
  dedicated `profile` contract instead.
- **Media uploads** use a 3-step presigned flow (`packages/web/app/dashboard/albums/_components/album-composer.tsx:94`):
  `media.createUploadUrl({ centerId, fileName, mimeType, sizeBytes, purpose })` →
  `PUT` the file to the returned `uploadUrl` → `media.completeUpload({ mediaAssetId })`.
  Files live in a private MinIO bucket; they are rendered through **signed download
  URLs** (`media.getDownloadUrl`), per the `signed-album-image.tsx` / `signed-meal-image.tsx`
  components. `mediaPurposeValues` currently has no `user_avatar` value.
- **UI kit:** shadcn-style primitives in `packages/web/components/ui/`
  (`card`, `input`, `label`, `button`, `switch`, `select`, `separator`, `dialog`, `sonner`
  for toasts). Data layer is TanStack Query via the `orpc` client (`packages/web/lib/orpc`).
- **Theme:** the director shell applies `data-theme="director"` to `<html>` — a restrained
  "operations console" skin (no candy decor). My Page must follow that skin for the director.

---

## 3. Page structure & UX

### 3.1 Entry point & route

- **Route:** `/dashboard/profile` (client page under the existing dashboard shell, so it
  inherits the sidebar, header, auth guard, and director theme).
- **Navigation:** the top-right header already shows the director's name + role
  (`DashboardShell.tsx:335`). Make that block a link to `/dashboard/profile` — this is the
  natural Kidsnote-style "tap your name to open My info" affordance. Additionally add a
  **"My Page"** item to the sidebar footer (above Sign out) with a `UserCircle` lucide icon,
  so it is discoverable from the nav too.
  - *Decision:* we add the footer link rather than a new entry in the grouped nav, because
    My Page is an account action (like Sign out), not a center workspace section.

### 3.2 Layout

Single column, max-width ~`640px`, centered, consistent with a settings page. Content is a
stack of **`Card` sections**, each with its **own Save button** (granular saves rather than
one giant form). This matches the granular API mutations below and keeps each interaction
small and low-risk.

```
┌──────────────────────────────────────────────┐
│  My Page                            (h1/header)│
├──────────────────────────────────────────────┤
│  ┌── Profile ───────────────────────────────┐ │
│  │  ( avatar )   Full name  [____________]   │ │
│  │  [Change photo] [Remove]                  │ │
│  │  Role: Director    Center: <name> (ro)    │ │
│  │  Email     [________________]             │ │
│  │  Phone     +998 90 123 45 67   [Change]   │ │
│  │                              [ Save ]     │ │
│  └───────────────────────────────────────────┘ │
│  ┌── Account & security ────────────────────┐ │
│  │  Username  [director_jamshid]   [ Save ]  │ │
│  │  Current password   [____________]        │ │
│  │  New password       [____________]        │ │
│  │  Confirm password   [____________]        │ │
│  │                         [ Change password ]│ │
│  └───────────────────────────────────────────┘ │
│  ┌── Preferences ───────────────────────────┐ │
│  │  Language  ( Oʻzbekcha ▾ )       [ Save ] │ │
│  └───────────────────────────────────────────┘ │
│  ┌── Notifications ─────────────────────────┐ │
│  │  Push notifications        ( ◯ switch )   │ │
│  │  SMS notifications         ( ◯ switch )   │ │
│  │  Quiet hours   [22:00] – [07:00]          │ │
│  │                              [ Save ]     │ │
│  └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 3.3 Section details

**Profile**
- Circular avatar (~96px). When `avatarMediaAssetId` is null, show initials of `fullName`
  on a director-token background.
- "Change photo" opens a file picker (images only). On select: run the 3-step media upload
  with `purpose: "user_avatar"` and `centerId` = director's center, then call
  `profile.updateAvatar({ mediaAssetId })`. "Remove" calls `profile.removeAvatar`.
  Avatar is rendered via `media.getDownloadUrl` (a small `SignedAvatar` component mirroring
  `signed-album-image.tsx`).
- **Full name** (required) and **Email** (optional, validated) are edited here; Save calls
  `profile.updateProfile`.
- **Role** ("Director") and **Center name** are read-only badges.
- **Phone**: shown with a **"Change"** action that opens a small dialog implementing the same
  OTP flow as signup: enter the new number → `auth.sendCode` sends an SMS code → enter the
  code → `auth.verifyCode` returns a `phoneVerificationToken` → `profile.updatePhone` commits
  the new number. The number is only changed after successful verification. New number must
  not already belong to another user.

**Account & security**
- **Username**: editable (min 3, max 40, unique — reuse the registration username rule).
  Saved via `profile.updateProfile`. On conflict, show a field error.
- **Change password**: current + new + confirm. New password must satisfy the existing
  registration rule (min 8 chars, at least one letter and one digit — reuse the regex from
  `registerSchema`). Wrong current password returns a field error. On success, show a toast;
  do **not** invalidate the current session (the active token stays valid).

**Preferences**
- **Language** select (`uz` / `ru` — the languages the app ships). Saving updates
  `User.preferredLanguage` via `profile.updateProfile` and switches the live UI language
  (reuse `LanguageSwitcher`'s mechanism so the two stay in sync).

**Notifications**
- Push / SMS switches + optional quiet-hours start/end time inputs. Save upserts
  `UserNotificationSettings` via `profile.updateNotificationSettings`.

### 3.4 Visual language (frontend-design notes)

- Use the **director "operations console" skin** already active via `data-theme="director"`:
  restrained tokens (`bg-director-grid` page bg, `sidebar-primary` accents), `Card` with thin
  borders + section header, `Separator` between rows, no candy decor / no `font-kids`.
- Section headers: short uppercase label like the director sidebar's `tracking-[0.14em]`
  treatment, so it reads as the same product surface.
- Inputs/labels: existing `Label` + `Input`/`Select`/`Switch`. Buttons: existing `Button`
  (primary for Save, `variant="ghost"`/destructive for Remove photo).
- Feedback: `sonner` toasts on success; inline field errors for validation; disable Save
  while the mutation is pending. Empty/loading state uses `Skeleton`.

---

## 4. API design

New oRPC contract + NestJS module: **`profile`** (sibling of `auth`). All procedures are
authenticated (`access.authed`) and operate strictly on `context.user.id` — a director can
only read/modify their own account. No `director.guard` needed (it is self-service, not a
center-admin action).

Files:
- Contract: `packages/shared/src/api/orpc/profile.contract.ts` + schemas in
  `packages/shared/src/api/profile.ts`; wire into `orpc-contract.ts`.
- Server: `packages/api/src/profile/{profile.module.ts,profile.router.ts,profile.service.ts}`;
  register in `app.module.ts` and the oRPC router.

### 4.1 Procedures

| Procedure | Input | Output | Notes |
|---|---|---|---|
| `profile.get` | — | `ProfileView` | Full editable profile for the signed-in user. |
| `profile.updateProfile` | `{ fullName, username, email? \| null, preferredLanguage }` | `ProfileView` | `fullName` required (min 1). `username` 3–40 chars, `@unique` → conflict error. `email` optional, validated, `@unique` → conflict error. |
| `profile.updatePhone` | `{ phoneNumber, phoneVerificationToken }` | `ProfileView` | Commits a new phone after OTP verification. Validates the token (issued by `auth.verifyCode` for that number, unconsumed/unexpired) and that no other user holds `phoneNumber`. Marks the token consumed. |
| `profile.changePassword` | `{ currentPassword, newPassword }` | `{ success: true }` | Verify `currentPassword` against `AuthCredential.passwordHash`; reject if wrong. `newPassword` reuses registration password rule. Rehash + update. Audit-logged. |
| `profile.updateAvatar` | `{ mediaAssetId }` | `ProfileView` | Asset must exist, have `purpose = user_avatar`, and be owned (uploaded) by the user. Store the **`mediaAssetId`** on `User.avatarUrl`. |
| `profile.removeAvatar` | — | `ProfileView` | Clears `User.avatarUrl`. |
| `profile.updateNotificationSettings` | `{ pushEnabled, smsEnabled, quietHoursStart? \| null, quietHoursEnd? \| null }` | `NotificationSettingsView` | Upsert the `UserNotificationSettings` row. Times as `"HH:mm"` strings. |

**`ProfileView`** shape:
```ts
{
  id, fullName,
  email: string | null,
  phone: string | null,          // changed via profile.updatePhone (OTP)
  username: string | null,       // editable via profile.updateProfile
  role: "director",              // from user_roles
  centerId: string | null,
  centerName: string | null,
  preferredLanguage: "uz" | "ru",
  avatarMediaAssetId: string | null,  // resolve to a signed URL via media.getDownloadUrl
  notificationSettings: { pushEnabled, smsEnabled, quietHoursStart, quietHoursEnd }
}
```

### 4.2 Avatar storage decision

Reuse the existing private-bucket + signed-download pattern rather than introducing public
URLs:

1. Add `"user_avatar"` to `mediaPurposeValues` (`packages/shared/src/api/media.ts`).
2. In `media.service.ts`, authorize `user_avatar` uploads for **any authenticated center
   member uploading for their own center** (the director qualifies via `requireCenterUploader`),
   and authorize `getDownloadUrl` for `user_avatar` assets when the requester is the asset's
   uploader/owner.
3. `profile.updateAvatar` validates ownership + purpose, then stores the **`mediaAssetId`** on
   `User.avatarUrl`. `profile.get` returns it as `avatarMediaAssetId`, and the web resolves it
   to a signed URL with `media.getDownloadUrl`.
   *(We reuse the existing `avatarUrl` column to hold this reference rather than adding a new
   column, since `avatarUrl` is otherwise unused today.)*

### 4.3 Errors & security

- All mutations scoped to `context.user.id`; no cross-user access.
- `email` and `username` uniqueness conflicts surface as a typed validation error mapped to
  the right field in the UI.
- `updatePhone` only changes the number after a valid, unconsumed OTP token for that exact
  number; reject if the number is already taken or the token is invalid/expired. Reuses the
  existing `auth.sendCode` / `auth.verifyCode` procedures, so rate-limiting and SMS delivery
  behave exactly as in signup. Phone change is audit-logged.
- `changePassword` must verify the current password and is recorded in the **audit log**
  (the `audit` module already exists). Other sessions are **not** revoked in v1 (noted as
  optional future hardening).
- Inputs validated by Zod at the contract boundary (lengths, email format, time format,
  password complexity).

---

## 5. Data flow

```
Page (/dashboard/profile, client)
  └─ useQuery profile.get ──────────────► render 4 Card sections
       ├─ Profile Save     → useMutation profile.updateProfile ─┐ (name, email)
       ├─ Username Save     → useMutation profile.updateProfile │ on success:
       ├─ Change password  → useMutation profile.changePassword │  toast + invalidate
       ├─ Language Save     → updateProfile + set i18n language   │  ["profile","get"]
       ├─ Notifications Save→ updateNotificationSettings          │
       ├─ Change phone (dialog):                                 │
       │     auth.sendCode(newPhone) → auth.verifyCode(code) ────┤
       │     → profile.updatePhone(phone, verificationToken) ────┘
       └─ Avatar change     → media.createUploadUrl → PUT file
                              → media.completeUpload
                              → profile.updateAvatar(mediaAssetId)
       Avatar render: media.getDownloadUrl(avatarMediaAssetId) via <SignedAvatar/>
```

- Query key follows the existing `queryKeys` factory convention.
- After `updateProfile`/`updateAvatar`, also refresh the locally stored session
  (`packages/web/lib/session.ts`) name/avatar so the header reflects changes immediately.

---

## 6. Testing

- **API (vitest, mirroring existing `*.spec.ts`):**
  - `updateProfile`: updates fields; rejects empty name; email-conflict and
    username-conflict error paths.
  - `updatePhone`: commits the number with a valid token; rejects an invalid/expired/consumed
    token, a token issued for a different number, and a number already held by another user.
  - `changePassword`: success rehash; wrong current password rejected; weak new password
    rejected.
  - `updateAvatar`: rejects an asset that is not `user_avatar` or not owned by the user.
  - `updateNotificationSettings`: creates row when absent, updates when present.
- **Web:** type-check + a light component/render test for the page's loading/loaded states
  if the project has a precedent; otherwise rely on type-safety + manual verify.
- **Manual verify:** sign in as a director → upload avatar, edit name/email/username, change
  phone (receive OTP, verify, confirm new number sticks), change password (re-login with new
  password), switch language, toggle notifications.

---

## 7. Out of scope (explicit) / future

- Teacher and Parent "My Page" (separate specs; will reuse `profile.*` + add role-specific
  bits — e.g. parent editing children's name/photo/allergies).
- **Center / organization configuration** (center name, address, branches, logo) — shared
  organizational data with its own permissions, not personal director data. Separate feature.
- Revoking other sessions on password change; 2FA; account deletion.

---

## 8. i18n

Add a `profile` (and reuse `common`) translation namespace in `packages/translations` for
**uz** and **ru** (English if the repo carries it), following
`docs/templates/dashboard-translation-template.md`. Keys: section titles, field labels,
button labels, validation messages, success toasts.
