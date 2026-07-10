# Parent Multi-Child — Add a Kid & Global Kid Switcher

## Overview

Kidsnote-style multi-child support for the parent role. A parent can add another kid
from inside the app (the kid may attend a **different kindergarten**), and both the
parent web dashboard and the parent mobile app show the **selected kid's photo + name**
instead of the parent's, with a switcher to change kids. Every parent page scopes its
data to the selected kid; switching the kid re-scopes the whole app.

The data model already supports this: `ChildGuardian` links one parent to many kids,
`ChildEnrollment` links each kid to its own center/class, and every parent-facing
oRPC endpoint already takes a `childId` verified against guardianship. This change is
therefore: one new API flow (add-kid join request), a shared "selected kid" state on
web and mobile, the switcher UI, and refactoring parent pages off their local
`children[0]` defaults.

## Scope

**In this change**
- API: `centers.requestChildJoin` (add-kid join request), `profile.myJoinRequests`
  (list own pending kid requests), reuse of existing `auth.cancelJoinRequest`.
- Web: `SelectedChildProvider` + `useSelectedChild()`, kid switcher in the dashboard
  top header (parent role only), add-kid stepper at `/dashboard/children/new`,
  refactor of all parent pages to the selected kid.
- Parent mobile: selected-kid store (AsyncStorage), `useCurrentChild()` rework, kid
  switcher in the home header (bottom sheet), add-kid flow screens.
- i18n: new keys in uz / ru / en, identical across web and mobile.

**Not in this change**
- Teacher / director apps (approval UI already works — these requests are ordinary
  `kind: "parent"` join requests).
- Invitation-code based kid adding (invitations already work at signup; can be added
  to this flow later).
- Multi-guardian management (inviting the other parent to an existing kid).

## Backend

### `centers.requestChildJoin` (new, authed parent)

Input mirrors the signup child step:
`{ centerId, classId?, child: { name, dateOfBirth, gender, imageUrl?, relationshipType, customRelationshipLabel? }, message? }`

Creates a `CenterJoinRequest` with `kind: "parent"` and the child payload columns —
exactly what `AuthService.handleParentSelfSearch` does today, **except**:

- It does **not** call `cancelExistingPendingRequests` — a parent with an active kid
  keeps that kid, and may hold several pending requests at once (two new kids).
- Duplicate guard: reject only when the same user already has a **pending** request
  at the same center with the same trimmed child name.
- Requires the caller to already hold the parent role somewhere (this is an in-app
  flow, not signup).

Approver notification and audit log identical to the signup path (extract the shared
logic rather than copy it). Director approval is untouched:
`MembershipsService.activateParent` already creates the child, guardianship,
enrollment, and an idempotent parent role at the new center.

### `profile.myJoinRequests` (new, authed)

Returns the caller's own `CenterJoinRequest`s with `status: "pending"` and
`kind: "parent"`: `{ id, centerName, className?, childName, childPhotoUrl?, createdAt }`.
Used by both switchers to show "pending approval" entries and by the profile page.
Cancelling reuses the existing `auth.cancelJoinRequest` endpoint.

### Shared contracts (`packages/shared`)

- `centers.contract`: `requestChildJoin` with input/output schemas (reuse
  `childRegistrationSchema` from `src/child/registration.ts`).
- `profile.contract`: `myJoinRequests` output schema.

## Selected-kid state

### Web

`SelectedChildProvider` mounted inside the dashboard providers for the parent role:

- Loads `profile.listChildren` (already returns kids ordered primary-first with
  center/class info).
- `selectedChildId` persisted in `localStorage` (`kichkintoy.selectedChildId`);
  falls back to the first (primary) kid when unset or when the stored id no longer
  exists (kid removed / different account).
- Exposes `useSelectedChild(): { child, children, pending, select(childId), isPending }`.

All parent pages replace their local `useState(children[0])` pattern with
`useSelectedChild()`: home, reports, albums, attendance, calendar, meals,
medications, pickups, payments, documents, notices, chat. **Notifications stay
global** (all kids). Query keys already include `childId`, so switching the kid
re-fetches everything automatically. The per-page kid chips on the parent home are
removed in favor of the global switcher.

### Mobile (parent app)

Same provider persisted in AsyncStorage. `useCurrentChild()` in `data/parent.ts` —
already the single source used by home, reports, albums, meals, calendar,
attendance — changes from "first kid" to "selected kid". Composer screens
(medications/new, pickups/new) default their kid picker to the selected kid.

## Switcher UI

Shared look (parent mobile is the design reference):

- **Trigger**: kid photo (Avatar with media-asset resolution) + kid first name +
  chevron. Replaces the parent greeting/avatar spot in the web top header; in mobile
  it replaces the parent identity in the home header. Parent identity remains in the
  web sidebar profile section and the mobile profile tab.
- **Menu** (web: dropdown; mobile: bottom sheet, same pattern as list filters):
  - One row per kid: photo, full name, center name (+ class), check mark on the
    selected kid.
  - Pending rows from `myJoinRequests`: photo, name, center name, "pending approval"
    badge — not selectable.
  - Divider, then **“Add kid”** action.

Selecting a kid whose kindergarten differs simply changes `childId` — every page
already derives center/class from the kid, so the whole app flips to the other
kindergarten's content.

## Add-kid flow

A stepper reusing the signup step components/patterns:

1. **Kid info** — name, date of birth, gender, photo, relationship (reuse
   `signup/_components/child-step.tsx` + `relationship-step.tsx` logic).
2. **Kindergarten** — region/district center search (reuse `center-step.tsx`;
   mobile reuses the `find-center` screen).
3. **Class** — optional class selection at that center (`class-step.tsx`).
4. **Review & submit** — calls `centers.requestChildJoin`, then shows a success
   state; the kid appears as *pending* in the switcher.

Web route: `/dashboard/children/new`. Mobile route: `/children/add` (stack screens).

## Edge cases

- One kid only: header still shows the kid (not the parent); menu shows that kid +
  "Add kid".
- Stored selected id invalid → silently fall back to primary/first kid.
- All requests rejected / no active kids (cannot happen for an active parent role,
  but guard anyway) → existing empty states remain.
- Pending request cancelled → disappears from switcher (query invalidation).

## i18n

New keys (uz/ru/en, identical keys web + mobile), e.g. `childSwitcher.title`,
`childSwitcher.pendingBadge`, `childSwitcher.addChild`, `addChild.*` step titles and
actions. Uzbek strings verified to fit the header trigger and menu rows.

## Verification

`pnpm typecheck` for `shared`, `api`, `web`, `mobile`; manual flow: add kid to a
second center → approve as director → kid appears in switcher → switch →
home/reports/payments show the other kindergarten's data.
