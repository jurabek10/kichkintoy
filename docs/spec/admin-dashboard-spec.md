# Admin (Founder) Dashboard — Spec

Platform-level dashboard for the startup founder to oversee and manage all kindergarten
centers. Web only, new `/admin` section in `packages/web`. Access requires the new global
**`super_admin`** role (scope-less `UserRole`, granted to the founder's account via a seed
script — no UI for creating admins).

**Privacy rule:** the admin sees business-level aggregates and director contact info only —
never lists of child or teacher names. Admin API endpoints simply do not expose them.

## What the admin can SEE

### Overview (`/admin`)
- Platform totals: centers, children, teachers, classes, parents.
- Centers by status (active / suspended).
- Centers by region (table).
- Newest centers (mini-list).

### Centers list (`/admin/centers`)
- TanStack Table, 10 per page, row numbers, no horizontal scroll.
- Columns: №, Center (name + center code), Region/District, Director (photo + name +
  phone in one column), Kids, Teachers, Classes, Status, Created date.
- Search by center name/code; filters by region and status.
- "No director yet" badge for centers awaiting a director.

### Center detail (`/admin/centers/[id]`)
- Center info: name, code, facility type, address, phone, region/district,
  monthly tuition fee, status, created date.
- Director card: photo, name, phone, email.
- Stat cards: children, teachers, classes, parents.
- Class summary table: class name, teacher count, child count (aggregates only).
- Director invitation status (pending / accepted / expired / revoked).

## What the admin can DO

- **Add a new center** (`/admin/centers/new`): center name, facility type,
  region → district, address, phone, monthly tuition (UZS). Creates a new
  Organization + Center (same shape as director self-signup, which keeps working).
- **Edit center**: all fields above, including monthly tuition.
- **Suspend / activate a center**: suspended centers are hidden from signup center
  search and block new join requests/invitations; existing members are NOT locked out.
- **Invite a director**: by phone number — new invitation kind `"director"`. The
  invitee signs up with the code and becomes `director` + `organization_owner` of that
  center, skipping the create-your-own-center step.
- **Resend / revoke** a director invitation.

## API (new `admin` oRPC contract, all behind `AdminGuard`)

`admin.overview.stats` · `admin.centers.list` · `admin.centers.get` ·
`admin.centers.create` · `admin.centers.update` · `admin.centers.setStatus` ·
`admin.invitations.createDirector` · `admin.invitations.revoke`

All writes audit-logged (`center.created`, `center.updated`, `center.suspended`,
`invitation.director.created`, `invitation.director.revoked`).

## Plumbing notes

- `super_admin` added to `roleNameValues` (`packages/shared/src/auth/roles.ts`) and the
  role seed; login redirects super_admin users to `/admin`; the `/admin` layout bounces
  everyone else to `/dashboard`.
- `"director"` added to `invitationKindValues` (`packages/shared/src/membership/invitation.ts`).
- All UI strings in uz / ru / en via `packages/translations` (`admin.*` keys).

## Out of scope (v1)

Revenue/collection metrics, activity/attendance metrics, mobile admin app, deleting
centers (suspend instead), multiple-admins management UI, locking out members of
suspended centers.
