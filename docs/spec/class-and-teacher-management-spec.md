# Class And Teacher Management Spec

## 1. Scope

This spec defines how a **director** sets up the inside of their kindergarten after onboarding: creating **classes** (반) and assigning approved **teachers** to them. It is the bridge between the signup/approval handshake (already built) and every child-facing module that comes after (daily reports, notices, attendance, albums).

It mirrors Kidsnote's center setup, where a director defines classes (반 관리) and manages staff (교사 관리) before any daily communication can happen.

In scope:

- Director: create, rename, edit, and archive classes.
- Director: view the list of approved teachers at the center.
- Director: assign a teacher to a class and unassign them.
- Director: toggle a teacher's "can approve members" permission (the deferred piece from the approval spec).
- Teacher: see the classes they are assigned to and the children in each (read-only roster view).

Out of scope (separate specs):

- Daily reports, notices, attendance, albums — see [`daily-reports-spec.md`](./daily-reports-spec.md), which depends on this spec.
- Branches/multi-branch class grouping (the `branch_id` column exists but stays unused for MVP).
- Bulk class import, class schedules, capacity limits.
- Mobile UI. Web-first; the data model and API are reused by mobile later.

Builds on [`signup-center-selection-and-approval-spec.md`](./signup-center-selection-and-approval-spec.md) and [`kichkintoy-uzbekistan-system-design.md`](../design/kichkintoy-uzbekistan-system-design.md) §7.4.

## 2. Why This Feature

After approval, a center has a director, possibly some teachers, and some enrolled children — but nothing connects teachers to the children they care for. In Kichkintoy the link is:

```text
Class
  ├── teacher_class_assignments   (which teachers teach this class)
  └── child_enrollments           (which children are in this class)
```

A teacher can only see and act on children through a class they are assigned to (design doc §8). So class + assignment management is the gate that every teacher-facing feature waits on. It is deliberately small and is the right next deliverable.

It also closes two gaps left open earlier:

- The signup class picker and the director approval flow already reference classes, but there is **no way to create a class yet** — directors who create a brand-new center have zero classes.
- The approval spec added a `can_approve_members` flag and a `PATCH .../teachers/:userId` endpoint, but there is **no endpoint to list teachers**, so no UI could use it. This spec adds that list.

## 3. Vocabulary

- **Class** (반): a named group of children at a center. Row in `classes`.
- **Teacher assignment**: a row in `teacher_class_assignments` linking a teacher user to a class, with an `assignment_role` (`teacher` | `assistant_teacher`) and an active window (`started_at` / `ended_at`).
- **Approved teacher**: a user with a `user_roles` row of role `teacher` scoped to the center (created when the director approved their join request or invitation).
- **Active assignment**: a `teacher_class_assignments` row whose `ended_at` is null.

## 4. Roles And Permissions

| Action | Director / Org owner | Teacher | Parent |
|---|---|---|---|
| Create / edit / archive class | Yes | No | No |
| List center classes | Yes | Their assigned ones via teacher API | No |
| List center teachers | Yes | No | No |
| Assign / unassign teacher to class | Yes | No | No |
| Toggle teacher `can_approve_members` | Yes | No | No |
| View class roster (children) | Yes (any class) | Yes (assigned classes) | No |

Enforcement reuses the existing `CenterApproverGuard` / `DirectorOnly` pattern in [`director.controller.ts`](../../packages/api/src/director/director.controller.ts). Director-only actions use `@DirectorOnly()`. The teacher read endpoints get a new lightweight check that the teacher has an active assignment to the class.

## 5. Director: Class Management

### 5.1 Create Class

Fields:

- `name` (required) — e.g. "Quyoshcha"
- `ageGroup` (optional) — free text, e.g. "3–4"
- `academicYear` (optional) — e.g. "2026"

Behavior: insert into `classes` scoped to the center, `status = 'active'`. `branch_id` stays null for MVP.

### 5.2 Edit Class

Director can change `name`, `ageGroup`, `academicYear`. Updates `updated_at`.

### 5.3 Archive / Restore Class

- Archive sets `status = 'archived'`.
- Archived classes are hidden from: the signup class picker (already filters to `active`), the invitation class dropdown, and the daily-report composer's class list.
- Existing enrollments and past assignments are left intact for history; archiving is not deletion.
- Restore sets `status = 'active'` again.
- A class cannot be archived while it has active child enrollments — return a clear error telling the director to move or unenroll children first. (Enrollment management is a later spec; for MVP the guard simply blocks archive when active enrollments exist.)

### 5.4 List Classes

Returns all classes for the center (both active and archived, with a status field and counts), newest first or by name. Each row includes:

- id, name, ageGroup, academicYear, status
- `childCount` — active enrollments in the class
- `teacherCount` — active assignments
- `teachers` — short list of assigned teacher names (for the list view chips)

## 6. Director: Teacher Management

### 6.1 List Teachers

`GET /director/centers/:centerId/teachers` returns every user with an active `teacher` role at the center:

- userId, fullName, phoneNumber, username
- `canApproveMembers` (the flag from the approval spec)
- `assignments` — the classes they are currently assigned to (id + name + assignmentRole)

This single endpoint powers both the teacher-permission toggle and the assignment UI.

### 6.2 Assign Teacher To Class

- Director picks a teacher and a class → insert `teacher_class_assignments` with `assignment_role` (default `teacher`, `assistant_teacher` selectable).
- Idempotent: if an active assignment already exists for that teacher+class, return it rather than duplicating.
- The teacher must be an approved teacher at the same center; the class must belong to the same center. Otherwise reject.

### 6.3 Unassign Teacher From Class

- Set `ended_at = today` on the active assignment rather than deleting, so authorship/history of past reports stays attributable.
- A re-assign later creates a fresh row.

### 6.4 Toggle Approval Permission

Reuse the existing `PATCH /director/centers/:centerId/teachers/:userId` with `{ canApproveMembers: boolean }`. This spec just gives it a UI now that a teacher list exists.

## 7. Teacher: Read-Only Class Views

These are the minimum a teacher needs so the assignment work is visible and testable; the full teacher workspace lands with daily reports.

### 7.1 My Classes

`GET /teacher/classes` → classes the signed-in teacher has an active assignment to, each with `childCount` and `assignmentRole`.

### 7.2 Class Roster

`GET /teacher/classes/:classId/children` → active enrolled children for a class the teacher is assigned to: child id, name, photo, date of birth. Used as the foundation for daily reports later.

Authorization: 403 if the teacher has no active assignment to that class.

## 8. Data Model

No new tables. Both `classes` and `teacher_class_assignments` already exist in the schema (design doc §7.4) with all required fields:

- `classes`: `id, center_id, branch_id?, name, age_group?, academic_year?, status, created_at, updated_at`
- `teacher_class_assignments`: `id, teacher_user_id, class_id, assignment_role, started_at, ended_at?, created_at`

Optional index to add for the roster/assignment lookups (only if not already covered by the existing `@@index([classId])` / `@@index([teacherUserId])`):

```sql
-- active-assignment lookups for a teacher
CREATE INDEX idx_tca_teacher_active
  ON teacher_class_assignments(teacher_user_id)
  WHERE ended_at IS NULL;
```

All mutating actions write an `audit_logs` row, consistent with the director module:

```text
class.created
class.updated
class.archived
class.restored
teacher.assigned_to_class
teacher.unassigned_from_class
teacher.permissions_updated   (already emitted)
```

## 9. API Endpoints

Add to the existing `director` route group and a new `teacher` route group.

### 9.1 Director (under `/director/centers/:centerId`, guarded)

```text
GET    /classes                                   list classes (+counts, +teacher chips)
POST   /classes                                   { name, ageGroup?, academicYear? }
PATCH  /classes/:classId                          { name?, ageGroup?, academicYear? }
POST   /classes/:classId/archive
POST   /classes/:classId/restore

GET    /teachers                                  list teachers (+canApproveMembers, +assignments)
POST   /classes/:classId/teachers                 { teacherUserId, assignmentRole? }
DELETE /classes/:classId/teachers/:teacherUserId  (sets ended_at)
PATCH  /teachers/:teacherUserId                    { canApproveMembers }   (already exists)
```

Class create/edit/archive use `@DirectorOnly()` (organization owner or director), matching invitations. Assignment endpoints likewise.

### 9.2 Teacher (new `/teacher` group, SessionGuard + assignment check)

```text
GET    /teacher/classes
GET    /teacher/classes/:classId/children
```

### 9.3 Contracts

Add Zod request/response schemas to `@kichkintoy/shared` following the existing `centers` / `membership` contract files, and export the inferred types for the web client (`ClassSummary`, `ClassDetail`, `CenterTeacher`, `AssignTeacherRequest`, etc.). The existing `centerClassSummarySchema` can be extended/reused for the list shape.

## 10. Web UI

New routes inside the existing dashboard shell (shadcn + Kidsnote-blue system already in place).

```text
Director
  /dashboard/classes                 Class list: cards/table with name, age group,
                                     child & teacher counts, status. "New class" button
                                     opens a Dialog. Row → detail.
  /dashboard/classes/:classId        Class detail:
                                       - edit name/age/year (inline or Dialog)
                                       - assigned teachers list with "Assign teacher"
                                         (Select of center teachers) + remove
                                       - roster preview (children, read-only)
                                       - archive/restore
  /dashboard/teachers                Teacher list: name, phone, assigned classes (chips),
                                     "can approve requests" Switch, assign-to-class action.

Teacher
  /dashboard/classes                 My classes (read-only cards with child counts)
  /dashboard/classes/:classId        Roster (read-only list of children)
```

Sidebar (`DashboardShell`) gains **Classes** for directors and teachers, and **Teachers** for directors, alongside the existing Overview / Join requests / Invitations.

Components reuse what already exists: `Dialog` for create/edit, `Select` for teacher and assignment-role pickers, `Badge` for status and class chips, `Card`/table for lists, `sonner` toasts for success. A new shadcn `Switch` component is needed for the approval-permission toggle (add it the same hand-rolled way as the other primitives).

## 11. Validation And Errors

- Class `name` required, 1–60 chars.
- Cannot create/assign across centers (class and teacher must belong to `:centerId`).
- Cannot archive a class with active enrollments (clear, actionable error).
- Assigning an already-assigned teacher is a no-op success (idempotent), not an error.
- A teacher hitting a class they are not assigned to gets 403.
- Only directors/org owners reach the management endpoints (guard enforced).

## 12. Acceptance Criteria

- A director can create a class and see it in the class list with zero children and zero teachers.
- A director can edit a class name, age group, and academic year.
- A director can archive a class; it disappears from the signup and invitation class pickers but remains visible (as archived) in the dashboard, and can be restored.
- A director sees a list of approved teachers at the center.
- A director can assign a teacher to a class and unassign them; unassign preserves history (`ended_at`, not deletion).
- A director can toggle a teacher's "can approve requests" permission and the change takes effect in the join-request inbox.
- A teacher sees only the classes they are actively assigned to, with the correct children in each.
- Every mutation writes an audit-log row.

## 13. Suggested Build Order

1. Director class CRUD + archive (endpoints + `/dashboard/classes` list & detail).
2. `GET /director/centers/:centerId/teachers` + `/dashboard/teachers` page with the approval-permission Switch.
3. Assign / unassign teacher to class (wired into class detail and/or teachers page).
4. Teacher read-only `/teacher/classes` + roster.

After this lands, [`daily-reports-spec.md`](./daily-reports-spec.md) is unblocked.

## 14. Open Questions

- Should a class support multiple homeroom teachers, or exactly one homeroom + N assistants? Spec allows many of each via `assignment_role`; UI can still highlight one "homeroom".
- Do we need class capacity limits (max children) in v1? Assumed no.
- When unassigning the last teacher from a class that has children, should we warn the director? Assumed: allow but show a warning.
- Should archived-class restore re-validate the academic year? Assumed no.
