# Teacher "My Page" — Design Spec

**Date:** 2026-06-23
**Status:** Draft for review
**Scope:** Teacher role only. Builds directly on the shipped **Director My Page**
(`2026-06-23-director-my-page-design.md`); this spec describes only the deltas.

---

## 1. Goal

Give a signed-in **teacher** the same personal "My Page" the director already has,
adapted to a teacher's account and surfaced in the teacher's warm dashboard theme.

A teacher must be able to view and update all of their own account data:

- Profile photo (upload / replace / remove)
- Full name, username, email
- Phone number (SMS OTP re-verification)
- Password
- Notification settings (push / SMS, quiet hours)
- A short **bio** (teacher-specific — shown to colleagues/parents in future surfaces)

And **see** (read-only) the teacher-specific context that defines their role:

- Their **employee number** (managed by the director, not editable here)
- The **classes they are assigned to** (name, age group, role, child count)

As with the director, this is the teacher's *personal* account page — not class or
center configuration.

---

## 2. What already exists (reuse)

The director feature shipped a complete, theme-agnostic foundation we reuse as-is:

- **`profile` oRPC module** (`get`, `updateProfile`, `updatePhone`, `changePassword`,
  `updateAvatar`, `removeAvatar`, `updateNotificationSettings`) — all scoped to
  `context.user.id`, so they already work for a signed-in teacher.
- **`user_avatar` media flow** — `requireCenterUploader` already authorizes teachers
  (they are center staff), and the owner-can-read rule covers their own avatar.
- **Web screen** (`/dashboard/profile`) built from `Card` sections that read CSS theme
  tokens. A teacher has no `data-theme="director"`, so the **same components render in
  the warm teal/candy theme automatically** — no restyling required.
- Reusable `AvatarUploader`, `ChangePhoneDialog`, `SecurityCard`, `NotificationsCard`,
  `SignedAvatar`, `CurrentUserAvatar` — all role-agnostic.
- **Teacher class data** already has an endpoint: `teacher.classes` returns
  `{ id, name, ageGroup, academicYear, assignmentRole, childCount }[]`.

So the teacher build is mostly additive, not new infrastructure.

---

## 3. UI / UX (matches existing teacher pages)

### 3.1 Theme & entry point

- **Theme:** the warm default skin teacher pages already use (teal `--primary`, candy
  accents, `--radius: 1.1rem`, cream background, `CandyTrim` header). The My Page screen
  inherits this with no changes because it only uses theme tokens.
- **Navigation:** enable the existing entry points for teachers — the sidebar footer
  "My Page" item (with the teacher's avatar) and the clickable header greeting/avatar.
  Today these are gated to `isDirector`; widen the gate to **director OR teacher**.
- **Route:** the same `/dashboard/profile`. The page is now role-aware.

### 3.2 Section layout

Same single-column `Card` stack, in this order. The teacher's defining content — the
classes they care for — sits high on the page so it reads as a teacher's page, not a
generic settings form:

```
┌── Profile ───────────────────────────────┐
│ ( avatar )  Teacher · <center>            │
│             Full name      Username       │
│             Email                         │
│             Phone           [Change]      │
│             Employee no.  <ro, if set>    │
│             Bio (textarea)                │
│                              [ Save ]     │
└───────────────────────────────────────────┘
┌── My classes ────────────────────────────┐   ← teacher-only, read-only
│  🏫 Quyoshcha · 3–4y · Lead · 18 kids     │
│  🏫 Kichkintoy · 4–5y · Assistant · 22    │
│  (empty state: "No classes assigned yet.")│
└───────────────────────────────────────────┘
┌── Account & security (password) ─────────┐
└───────────────────────────────────────────┘
┌── Notifications ─────────────────────────┐
└───────────────────────────────────────────┘
```

- **Role badge** uses `roles.teacher` (the profile card currently hard-codes
  `roles.director`; generalize it to `roles.{role}`).
- **Bio**: a `Textarea` (existing UI primitive), optional, with a sensible max length
  (e.g. 280 chars) and a character hint.
- **Employee number**: read-only. Render only when set; show a one-line muted note that
  the director manages it. (Nothing sets it today, so it will usually be hidden — no
  empty field shown.)
- **My classes**: reuses the visual language of `TeacherClasses` / `TeacherClassDetail`
  — `rounded-xl` rows with a `School` icon, class name, an age-group + `assignmentRole`
  line, and a child-count badge. Loading uses `KidsLoader`; empty state is a friendly
  "No classes assigned yet." card.
- No **language** card (consistent with the director page — language lives in the top bar).

---

## 4. API changes (small, additive)

1. **`ProfileView`** gains an optional teacher block:
   ```ts
   teacher: { employeeNumber: string | null; bio: string | null } | null
   ```
   `profile.get` includes the user's `teacherProfile` and populates this when the
   primary role is `teacher` (otherwise `null`).

2. **New procedure `profile.updateTeacherProfile`**
   - Input: `{ bio: string | null }` (trimmed, max 280).
   - Updates `TeacherProfile.bio` for the signed-in user; errors if the user has no
     teacher profile. Returns the refreshed `ProfileView`.
   - `employeeNumber` is intentionally **not** writable here (director-managed).

3. No new media work, no new auth work — phone/password/avatar already work for teachers.

`teacher.classes` is consumed directly by the web for the "My classes" card (no change).

---

## 5. Web changes

- **Role-aware screen:** `MyPageScreen` reads `profile.role` and renders:
  - Director → existing cards (Profile, Security, Notifications).
  - Teacher → Profile (with **bio**), **MyClassesCard**, Security, Notifications.
- **ProfileCard:** generalize the role badge; when `profile.teacher` is present, show the
  bio textarea and (if set) employee number, and on save also call
  `profile.updateTeacherProfile` alongside `updateProfile`.
- **New `MyClassesCard`:** `useQuery(queryKeys.teacher.classes(), () => orpc.teacher.classes({}))`,
  rendering the rows/empty/loading states described above.
- **`DashboardShell`:** widen the My Page nav + header-avatar gate from `isDirector` to
  `isDirector || isTeacher`.

---

## 6. i18n

- Reuse the `profile` namespace; add keys: `fields.bio`, `fields.bioHint`,
  `fields.employeeNumber`, `fields.employeeNumberNote`, `classes.title`,
  `classes.subtitle`, `classes.empty`, `classes.childCount`, `toasts.bioSaved`.
- Add uz / ru / en values. Role labels already exist in `common` (`roles.teacher`).

---

## 7. Testing

- **API:** `profile.get` returns the teacher block for a teacher and `null` for a
  director; `updateTeacherProfile` updates bio, trims/limits length, and rejects a
  non-teacher caller. (Matches the existing convention; the repo has minimal service unit
  tests, so this is type-safety + manual verify unless we add a Vitest spec.)
- **Manual verify:** sign in as a teacher → see classes + bio; edit name/bio/photo;
  change phone (OTP) and password; toggle notifications; confirm the warm theme.

---

## 8. Out of scope / future

- Parent "My Page" (next spec) — parent editing their children (name/photo/allergies).
- Editing **employee number** (a director-side staff-management action).
- Teacher bio appearing on parent-facing surfaces (separate feature).
