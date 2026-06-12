# Director Class Children Table Spec

## Goal

Replace the current child card list on the director class detail page with a table that matches the admin/table pattern used elsewhere in Kichkintoy and referenced from Docquery.

Target page:

- `/dashboard/classes/[classId]`
- Director view only

The table should make it easy for a director to scan all children in a class, see key enrollment information, and open a future child detail/edit page.

## Current State

The class detail page currently shows children as small cards inside:

- `packages/web/app/dashboard/classes/[classId]/DirectorClassDetail.tsx`

Each card shows:

- child photo or initial
- child name
- gender
- birth date

This is visually okay for a small list, but it does not scale well and does not match the newer table design used in director/admin pages.

## Desired UI

Add a children table section below the teachers section.

Columns:

| Column | Description |
| --- | --- |
| Kid | Avatar/photo plus compact child identity preview |
| Image | Child image/avatar. If this duplicates the Kid avatar visually, this can be merged with Kid during implementation. |
| Name | Child full name, sortable/searchable |
| Birthday | Child date of birth, formatted with existing `formatDate` |
| Joined | Date when the child joined/enrolled in this kindergarten/class |
| Payment | Payment status for the current month, placeholder for now |
| Actions | Edit and Delete buttons |

Recommended implementation detail:

- Use one visual `Kid` column containing avatar + name, and keep `Name` as a sortable hidden/accessor column if needed. If the director specifically wants separate `Image` and `Name`, show them as separate columns.

## Table Behavior

Use the shared table system:

- `DataTable`
- `DataTableColumnHeader`
- `DataTableFacetedFilter`
- `DataTableViewOptions`
- `DataTablePagination`

Required behavior:

- Pagination
- Sort by name, birthday, joined date, payment status
- Search/filter by child name
- View/column toggle if available
- Empty state: “No children enrolled”

Optional filters:

- Payment status
- Gender

## Data Requirements

Current class detail child payload appears to include:

- `childId`
- `name`
- `photoUrl`
- `dateOfBirth`
- `gender`

Needed addition:

- `joinedAt` or `enrolledAt`

Backend source:

- `packages/api/src/director/class.service.ts`
- `getClass()` already queries `childEnrollments`
- Add `startedAt` from `ChildEnrollment` into the class detail response

Shared schema update:

- `packages/shared/src/api/classes.ts`
- Add `joinedAt: isoDateSchema` or nullable ISO date string to each child row in `classDetailSchema`

Payment status:

- Not implemented yet
- Display placeholder badge for now: `Not connected` or `Coming soon`
- Future values can be: `paid`, `unpaid`, `partial`, `waived`, `pending`

## Actions

### Edit

Button should navigate to a future child detail/edit route:

- Proposed route: `/dashboard/children/[childId]`

Initial page can be read-only or a placeholder if the backend edit API is not ready.

Future child detail page should show:

- photo
- full name
- date of birth
- gender
- class
- guardians/parents
- enrollment date
- medical notes/allergies if available
- payment section later

### Delete

Important: “Delete” should probably mean unenroll/remove from class, not permanently delete child data.

Recommended behavior for now:

- Show a Delete/Remove button in the table
- Disable it or show “Coming soon” until backend support exists

Future backend behavior:

- Confirm dialog before action
- Set `ChildEnrollment.enrollmentStatus` to inactive/withdrawn
- Preserve child history, reports, attendance, documents, and guardian links

## Acceptance Criteria

1. Director class detail page no longer shows child cards.
2. Children appear in a table matching the newer admin table style.
3. Table includes avatar/photo, name, birthday, joined date, payment placeholder, and actions.
4. Table supports pagination.
5. Table supports sorting by the useful columns.
6. Table has a search/filter control for child name.
7. Edit action links to the future child detail/edit route.
8. Delete action is present but safe if backend deletion/removal is not implemented.
9. Typecheck and build pass.

## Implementation Plan

1. Update shared `classDetailSchema` child shape to include `joinedAt`.
2. Update `ClassService.getClass()` to return `joinedAt` from enrollment `startedAt`.
3. Replace child cards in `DirectorClassDetail.tsx` with `DataTable`.
4. Add columns for kid/avatar, name, birthday, joined date, payment placeholder, actions.
5. Add or scaffold `/dashboard/children/[childId]` route for edit navigation.
6. Keep delete disabled or route it to a future TODO-safe handler.
7. Run `pnpm --filter @kichkintoy/web typecheck`.
8. Run `pnpm --filter @kichkintoy/web build`.
