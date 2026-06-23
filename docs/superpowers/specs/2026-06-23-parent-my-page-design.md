# Parent "My Page" — Design Spec

**Date:** 2026-06-23
**Status:** Draft for review
**Scope:** Parent role only (web). Builds on the shipped Director & Teacher My Page
(`2026-06-23-director-my-page-design.md`, `2026-06-23-teacher-my-page-design.md`);
this spec describes only the deltas. The mobile parent profile screens
(`packages/mobile/app/profile-settings`, `.../children`) are the UX reference.

---

## 1. Goal

Give a signed-in **parent** one place for **their own account** and **their children** —
the web equivalent of the mobile parent "내 정보 / My info" + children screens.

A parent can update their own account:
- Profile photo, full name, username, email
- Phone number (SMS OTP re-verification)
- Password
- Notification settings

And manage **each child they are a guardian of**:
- Child **photo** (upload / replace / remove)
- **First/last name**, **birth date**, **gender**
- **Allergies** and **medical notes**
- See (read-only) the child's **class · center** and the parent's **relationship**

Children are the emotional center of a parent's experience, so they get the visual
emphasis on the page (photo-forward cards), while the parent's own settings stay quiet.

---

## 2. What already exists (reuse)

- **`profile` oRPC module** — `get` already returns `role: "parent"` with `teacher: null`,
  so the parent's own Profile / Security / Notifications cards work unchanged.
- **Reusable web components:** `ProfileCard`, `SecurityCard`, `NotificationsCard`,
  `AvatarUploader`, `ChangePhoneDialog`, `SignedAvatar`, `CurrentUserAvatar`.
- **Child read shapes & the director's `updateChild`** (firstName, lastName, dob, gender,
  allergies, medicalNotes) define the editable field set; we mirror it for parents.
- **`child_profile` media purpose** already exists; we extend its authorization to
  guardians so a parent can upload their child's photo.
- **Parent theme:** the dashboard shell already applies the warm candy theme + `font-kids`
  + `CandyTrim` + the parent bottom nav for `role === "parent"`. The My Page screen reads
  theme tokens, so it renders in the playful parent skin automatically.

What's genuinely new: a **parent-scoped children read + edit API**, child **photo** upload,
and a **My children** UI section.

---

## 3. UI / UX (matches the current parent web design)

### 3.1 Theme, entry points, order

- **Theme:** parent warm/candy + `font-kids` (inherited from the shell).
- **Navigation:** enable My Page for parents — widen the `showMyPage` gate to include
  parent (sidebar footer item + clickable header avatar). Additionally add a **"My Page"
  tab to the parent bottom nav** (a 6th tab with the parent's avatar), since parents
  navigate mostly from the bottom bar on phones.
- **Route:** the same `/dashboard/profile`, now parent-aware.
- **Section order:** `Profile` (own, compact) → **My children** (the rich, photo-forward
  hero) → `Account & security` → `Notifications`. No language card (consistent with the
  other roles; language is in the top bar / bottom-nav language screen).

### 3.2 "My children" section (the signature element)

A `Card` titled "My children". For each child, a warm row/card:

```
┌── My children ───────────────────────────────┐
│  ( photo )  Amina Karimova            [Edit]  │
│   ◍ ring     4 years · Quyoshcha · Yer sayyorasi
│  ──────────────────────────────────────────  │
│  ( photo )  Bobur Karimov             [Edit]  │
│   ◍ ring     2 years · Quyoshcha · Oymomo     │
└────────────────────────────────────────────────┘
   (empty: "No children linked yet." — add-child is a separate flow, see §6)
```

- Each child avatar gets a **stable candy accent ring** keyed off child index (reusing the
  `CHILD_COLORS` palette already used on the parent home), so siblings are visually
  distinct — this is the page's signature, tying it to the existing parent home.
- Photo via a `ChildAvatar` component: prefer the signed media asset, fall back to a legacy
  photo URL (see §4.3), else initials.
- **"Edit"** opens an **Edit child** dialog (mirrors `ChangePhoneDialog` structure) with:
  child photo uploader (change/remove), first name, last name, birth date (`DatePicker`),
  gender (`boy`/`girl` segmented control like the mobile screen), allergies (`Textarea`),
  medical notes (`Textarea`). Class · center and the parent's relationship are shown
  read-only ("Managed by your center.").
- Loading uses `KidsLoader`; errors surface in an `Alert` (no silent empties — learned
  from the teacher classes bug).

### 3.3 Copy & feedback

- Save button: "Save changes" → toast "Child updated." Photo actions → "Photo updated." /
  "Photo removed." Errors are specific and actionable, in the interface's voice.

---

## 4. API (new, parent-scoped)

All procedures authenticated and scoped so a parent can only read/edit a child they are a
**guardian** of (a `ChildGuardian` row linking `userId` ↔ `childId`).

| Procedure | Input | Output | Notes |
|---|---|---|---|
| `profile.listChildren` | — | `ParentChild[]` | The signed-in parent's guardian children with editable fields + read-only enrollment + relationship. |
| `profile.updateChild` | `{ childId, body: <child fields> }` | `ParentChild` | Reuses the director's child field set (firstName, lastName, dateOfBirth, gender, allergies, medicalNotes). Guardian-only. |
| `profile.updateChildPhoto` | `{ childId, mediaAssetId }` | `ParentChild` | Validates a `child_profile` asset uploaded by the parent; stores the `mediaAssetId` on `Child.photoUrl`. Guardian-only. |
| `profile.removeChildPhoto` | `{ childId }` | `ParentChild` | Clears the photo. Guardian-only. |

**`ParentChild`** shape:
```ts
{
  id, firstName, lastName: string | null, name,
  dateOfBirth: string | null, gender: "boy" | "girl" | null,
  photoMediaAssetId: string | null,   // resolve via media.getDownloadUrl
  photoUrl: string | null,            // legacy direct URL fallback (see §4.3)
  allergies: string | null, medicalNotes: string | null,
  className: string | null, centerName: string | null,
  relationship: string | null, isPrimary: boolean,
}
```

### 4.1 Guardian authorization

A shared `requireGuardian(userId, childId)` check (in the profile service) gates every
child read/write: there must be a `ChildGuardian` row for the pair, else `403`. List is
filtered to the parent's guardian children.

### 4.2 Media (child photos)

- Extend `createUploadUrl` to allow **guardians** to upload `child_profile` (today guardians
  are only allowed for `medication` / `student_document`).
- Extend `getDownloadUrl` so the uploader can read their own `child_profile` asset (mirror
  the existing `user_avatar` owner shortcut), so the parent can display the photo.
- `updateChildPhoto` stores the **`mediaAssetId`** on `Child.photoUrl`.

### 4.3 Photo storage compatibility

`Child.photoUrl` may already hold a **direct URL** from signup (the registration flow set
`imageUrl`). So the read endpoint returns **both**: `photoMediaAssetId` (when the stored
value is a UUID) and `photoUrl` (when it's a legacy URL). `ChildAvatar` prefers the signed
asset and falls back to the URL. New uploads always write a `mediaAssetId`.

---

## 5. Web changes

- **`MyPageScreen`** role-aware: parent → `Profile`, **`MyChildrenCard`**, `Security`,
  `Notifications`.
- **New `MyChildrenCard`** — `useQuery` over `profile.listChildren`; renders child cards +
  empty/loading/error states.
- **New `EditChildDialog`** — the child edit form + photo uploader; on save calls
  `profile.updateChild` (and `updateChildPhoto`/`removeChildPhoto` for photo changes), then
  invalidates `profile.listChildren`.
- **New `ChildAvatar`** — signed-asset-or-URL-or-initials, with the candy accent ring.
- **`DashboardShell`** — `showMyPage` includes parent; **`ParentBottomNav`** gains a
  "My Page" tab.
- **`queryKeys`** — add `profile.children()`.

---

## 6. i18n

Extend the `profile` namespace (uz / ru / en): `children.title`, `children.subtitle`,
`children.empty`, `children.edit`, `children.managedByCenter`, `child.firstName`,
`child.lastName`, `child.birthDate`, `child.gender`, `child.boy`, `child.girl`,
`child.allergies`, `child.medicalNotes`, `child.relationship`, `child.photo`,
`toasts.childSaved`, `toasts.childPhotoUpdated`, `toasts.childPhotoRemoved`.

---

## 7. Testing

- **API:** `listChildren` returns only guardian children; `updateChild` /
  `updateChildPhoto` reject a non-guardian (`403`); photo update validates the asset is a
  `child_profile` owned by the parent. (Type-safety + manual verify per repo convention,
  unless we add a Vitest spec.)
- **Manual verify:** sign in as a parent → see children with photos; edit a child's name /
  birthday / allergies; upload and remove a child photo; confirm class/center stay
  read-only; confirm own profile/password/phone/notifications still work.

---

## 8. Out of scope / future

- **Adding a new child** or **joining another center** — these are the existing
  join-request / signup flows (mobile "Add child" → find center). Linked from My Page later.
- Editing the **guardian relationship/nickname** or **pickup permissions**.
- **Removing/withdrawing** a child (a center-side action).
- Surfacing one parent's photo/edits to a co-guardian in real time (standard cache
  invalidation only).
