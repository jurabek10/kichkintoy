# Attendance Book / Check-in & Check-out Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/attendance.ts`, add procedures to `packages/shared/src/api/orpc/attendance.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under an `attendance` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style `출석부` / attendance-book feature: teachers and directors record child arrival/departure, parents see their child's attendance history, and important check-in/check-out events can notify parents in real time.

## 1. Product Research Summary

Kidsnote includes `출석부` / attendance book as one of its childcare operation features. Public Kidsnote help pages describe attendance as a record of a child's attendance status plus arrival and departure times. Kidsnote also promotes electronic attendance as a center operation tool that can be used from PC/mobile and later integrated with automatic attendance systems.

For Kichkintoy, attendance should become the daily operating spine of the center:

- Teachers start the day from a class attendance list.
- Directors see center-wide attendance status.
- Parents see whether their child arrived or left.
- Attendance events connect naturally to daily reports, pickup notices, and realtime notifications.

Sources:

- Kidsnote main site: `https://www.kidsnote.com/`
- Kidsnote menu guide: `https://www.with-kidsnote.com/guide/menusetting/app`
- Kidsnote attendance FAQ: `https://www.with-kidsnote.com/faq/director/best/best11`
- Kidsnote e-attendance campaign: `https://campaign.kidsnote.com/e-attendance/`

## 2. Scope

In scope for MVP:

- Director/teacher views today's attendance list.
- Teacher records check-in time for assigned class children.
- Teacher records check-out time for assigned class children.
- Director manages all center children.
- Teacher marks child absent, late, left early, or picked up.
- Staff adds optional attendance note and absence reason.
- Parent views attendance history for linked children.
- Parent receives in-app realtime notification when child checks in or checks out.
- Attendance list supports date, class, and status filtering.
- Audit logs are written for all staff changes.

Out of scope for MVP:

- QR code check-in.
- NFC/RFID attendance cards.
- Face recognition.
- Gate/door hardware integration.
- Government attendance reporting.
- Parent self check-in from mobile.
- Staff payroll/time attendance.
- Bulk CSV import/export.
- Temperature records; this can be a later feature or an optional field in daily health records.

## 3. Vocabulary

- **Attendance record:** one child attendance row for one center date.
- **Attendance date:** date-only value in the center's local timezone.
- **Check-in:** arrival time recorded by staff.
- **Check-out:** departure time recorded by staff.
- **Attendance status:** current state for the child on a date.
- **Absence reason:** optional text/reason category when a child is absent.
- **Late:** child arrived after expected start time.
- **Left early:** child left before expected end time.
- **Picked up:** child has checked out and handoff is complete.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| View center attendance dashboard | Yes | No | No | No |
| View assigned class attendance | Yes | Yes | No | No |
| View child attendance history | Center children | Assigned class children | No | Own children only |
| Mark check-in | Yes | Assigned class children | No | No |
| Mark check-out | Yes | Assigned class children | No | No |
| Mark absent / late / left early | Yes | Assigned class children | No | No |
| Edit attendance note/reason | Yes | Assigned class children | No | No |
| Delete attendance record | No | No | No | No |
| View parent feed/history | No | No | No | Own children only |

Authorization rules:

- Parent access is based on `child_guardians.user_id` and the child's active enrollment.
- Teacher access is based on active `teacher_class_assignments`.
- Director/organization owner can manage all attendance records in their center.
- Teacher cannot see or mutate attendance outside assigned classes.
- Parent cannot create or mutate attendance records.
- Attendance rows are never hard-deleted; corrections update the row and write an audit log.

## 5. Status Model

Attendance status values:

```text
not_checked_in
present
absent
late
left_early
picked_up
excused
```

Status behavior:

- `not_checked_in`: default state for an active enrolled child when no attendance has been recorded for the date.
- `present`: child has checked in and has not checked out.
- `late`: child checked in late; still currently present unless checked out.
- `absent`: child did not attend and no check-in/check-out should exist.
- `excused`: child is absent with an accepted reason, such as illness, family event, or approved leave.
- `left_early`: child checked out earlier than usual.
- `picked_up`: child has checked out normally.

Rules:

- Check-in sets status to `present` unless staff explicitly marks `late`.
- Check-out sets status to `picked_up` unless staff explicitly marks `left_early`.
- Marking `absent` or `excused` clears `checkedInAt` and `checkedOutAt`.
- Staff can correct a record for the selected date, but every correction writes audit metadata.
- Parent sees corrected values, not deleted historical rows.

## 6. User Flows

### 6.1 Staff Opens Attendance

1. Teacher/director opens **Attendance**.
2. Default date is today.
3. Director sees center summary plus class filter.
4. Teacher sees assigned classes only.
5. Each child row shows:
   - child name;
   - class name;
   - current status;
   - check-in time;
   - check-out time;
   - absence reason/note preview.

### 6.2 Teacher Checks In Child

1. Teacher opens class attendance for today.
2. Teacher clicks check-in on one child.
3. System records current local time by default.
4. Teacher can edit time before saving if needed.
5. Status becomes `present` or `late`.
6. Parent receives realtime in-app notification:
   - title: `Child checked in`
   - body: `{childName} arrived at {time}.`

### 6.3 Teacher Checks Out Child

1. Teacher opens class attendance.
2. Teacher clicks check-out on one child.
3. System records current local time by default.
4. Teacher can choose `picked_up` or `left_early`.
5. Staff can add optional handoff note.
6. Parent receives realtime in-app notification:
   - title: `Child checked out`
   - body: `{childName} left at {time}.`

### 6.4 Staff Marks Child Absent

1. Staff opens class attendance.
2. Staff selects a child.
3. Staff chooses `absent` or `excused`.
4. Staff enters optional absence reason.
5. System saves record and audit log.
6. Parent can see the absence in attendance history.

### 6.5 Director Reviews Center Attendance

1. Director opens **Attendance**.
2. Director sees summary cards:
   - total enrolled today;
   - present;
   - late;
   - absent/excused;
   - checked out.
3. Director filters by class or status.
4. Director can open a child record and correct it if necessary.

### 6.6 Parent Views Attendance

1. Parent opens **Attendance**.
2. Default view shows today's attendance for all linked children.
3. Parent can filter by child and date range.
4. Parent sees:
   - status;
   - check-in time;
   - check-out time;
   - class/center;
   - staff note if parent-visible.

## 7. Data Model

Add a new table:

```prisma
model AttendanceRecord {
  id              String   @id @default(uuid()) @db.Uuid
  centerId        String   @map("center_id") @db.Uuid
  classId         String?  @map("class_id") @db.Uuid
  childId         String   @map("child_id") @db.Uuid
  attendanceDate  DateTime @map("attendance_date") @db.Date
  status          String   @default("not_checked_in")
  checkedInAt     DateTime? @map("checked_in_at") @db.Timestamptz(6)
  checkedOutAt    DateTime? @map("checked_out_at") @db.Timestamptz(6)
  absenceReason   String?  @map("absence_reason")
  staffNote       String?  @map("staff_note")
  parentVisibleNote String? @map("parent_visible_note")
  recordedById    String?  @map("recorded_by_id") @db.Uuid
  updatedById     String?  @map("updated_by_id") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  center     Center @relation(fields: [centerId], references: [id])
  class      Class? @relation(fields: [classId], references: [id])
  child      Child  @relation(fields: [childId], references: [id])
  recordedBy User?  @relation("AttendanceRecordedBy", fields: [recordedById], references: [id])
  updatedBy  User?  @relation("AttendanceUpdatedBy", fields: [updatedById], references: [id])

  @@unique([childId, attendanceDate])
  @@index([centerId, attendanceDate, status])
  @@index([classId, attendanceDate, status])
  @@index([childId, attendanceDate])
  @@map("attendance_records")
}
```

Notes:

- `attendanceDate` is date-only and should be derived from the center's local timezone.
- `classId` should be copied from the child's active enrollment for that date.
- Keep one row per child per date.
- A child with no row should appear in staff lists as `not_checked_in`; the service can materialize a row on first mutation.
- `staffNote` is internal; `parentVisibleNote` is safe to show to parents.

## 8. Shared API Schemas

Create `packages/shared/src/api/attendance.ts`.

Enums:

```ts
attendanceStatusValues = [
  "not_checked_in",
  "present",
  "absent",
  "late",
  "left_early",
  "picked_up",
  "excused",
] as const;
```

Input schemas:

- `attendanceChildrenInputSchema`
  - `centerId?: uuid`
  - used to list parent children or staff class children depending on role.
- `staffAttendanceListInputSchema`
  - `centerId: uuid`
  - `date?: YYYY-MM-DD`
  - `classId?: uuid`
  - `status?: attendanceStatus`
- `parentAttendanceListInputSchema`
  - `childId?: uuid`
  - `from?: YYYY-MM-DD`
  - `to?: YYYY-MM-DD`
- `recordCheckInInputSchema`
  - `childId: uuid`
  - `attendanceDate: YYYY-MM-DD`
  - `checkedInAt?: isoDateTime`
  - `late?: boolean`
  - `staffNote?: string`
  - `parentVisibleNote?: string`
- `recordCheckOutInputSchema`
  - `childId: uuid`
  - `attendanceDate: YYYY-MM-DD`
  - `checkedOutAt?: isoDateTime`
  - `leftEarly?: boolean`
  - `staffNote?: string`
  - `parentVisibleNote?: string`
- `markAttendanceStatusInputSchema`
  - `childId: uuid`
  - `attendanceDate: YYYY-MM-DD`
  - `status: absent | excused | late | present | left_early | picked_up`
  - `absenceReason?: string`
  - `staffNote?: string`
  - `parentVisibleNote?: string`

Output schemas:

- `attendanceChildSchema`
  - `id`
  - `name`
  - `centerId`
  - `centerName`
  - `classId`
  - `className`
- `attendanceRecordSummarySchema`
  - `id`
  - `centerId`
  - `centerName`
  - `classId`
  - `className`
  - `child`
  - `attendanceDate`
  - `status`
  - `checkedInAt`
  - `checkedOutAt`
  - `absenceReason`
  - `staffNote`
  - `parentVisibleNote`
  - `recordedBy`
  - `updatedBy`
  - `createdAt`
  - `updatedAt`
- `attendanceSummarySchema`
  - `total`
  - `notCheckedIn`
  - `present`
  - `late`
  - `absent`
  - `excused`
  - `leftEarly`
  - `pickedUp`
- `staffAttendanceListResponseSchema`
  - `{ summary, records }`
- `parentAttendanceListResponseSchema`
  - `AttendanceRecordSummary[]`

## 9. oRPC Contract

Create `packages/shared/src/api/orpc/attendance.contract.ts`.

Procedures:

```ts
attendance: {
  children
  staffList
  parentList
  detail
  checkIn
  checkOut
  markStatus
}
```

Semantics:

- `attendance.children`
  - Parent: returns own linked children.
  - Staff: returns children available for selected center/class scope.
- `attendance.staffList`
  - Staff only.
  - Returns current date/class attendance rows and derived `not_checked_in` rows for active enrolled children.
- `attendance.parentList`
  - Parent only.
  - Returns attendance records for own children.
- `attendance.detail`
  - Staff can view permitted center/class child.
  - Parent can view own child record only.
- `attendance.checkIn`
  - Staff only.
  - Upserts attendance row and records check-in.
- `attendance.checkOut`
  - Staff only.
  - Updates attendance row and records check-out.
- `attendance.markStatus`
  - Staff only.
  - Updates status and related note/reason fields.

## 10. Backend Implementation

Add:

```text
packages/api/src/attendance/attendance.module.ts
packages/api/src/attendance/attendance.service.ts
packages/api/src/orpc/routers/attendance.router.ts
```

Service responsibilities:

- Resolve staff scope:
  - director/organization owner: all classes in center.
  - teacher: active assigned classes only.
- Resolve parent scope:
  - child guardian relation plus active enrollment.
- Build staff list:
  - fetch active enrolled children;
  - fetch attendance records for date;
  - merge missing records as derived `not_checked_in` summaries.
- Upsert attendance row on first mutation.
- Copy `centerId` and `classId` from active enrollment at mutation time.
- Validate impossible state transitions:
  - cannot check out absent/excused child without first changing status;
  - cannot mark absent after check-in unless staff confirms correction;
  - cannot check in if already checked out without explicit correction path.
- Write audit logs:
  - `attendance.check_in`
  - `attendance.check_out`
  - `attendance.mark_absent`
  - `attendance.corrected`

## 11. Notifications

Create in-app + push notification rows for parent guardians:

### Check-in

```text
notificationType: attendance.checked_in
entityType: attendance_record
entityId: attendanceRecord.id
title: Child checked in
body: {childName} arrived at {HH:mm}.
```

### Check-out

```text
notificationType: attendance.checked_out
entityType: attendance_record
entityId: attendanceRecord.id
title: Child checked out
body: {childName} left at {HH:mm}.
```

### Absent / Excused

Optional in MVP; enable if centers want parent-visible attendance updates:

```text
notificationType: attendance.absence_recorded
entityType: attendance_record
entityId: attendanceRecord.id
title: Attendance updated
body: {childName} was marked {status}.
```

Realtime:

- Reuse existing `NotificationsService.enqueue`.
- Reuse existing realtime notification center.
- Add notification route mapping:
  - `attendance_record` -> `/dashboard/attendance/{recordId}` if detail route exists;
  - fallback -> `/dashboard/attendance`.
- Add TanStack Query invalidation hint group `attendance`.

## 12. Web UX

Add dashboard route:

```text
packages/web/app/dashboard/attendance/page.tsx
packages/web/app/dashboard/attendance/_components/staff-attendance.tsx
packages/web/app/dashboard/attendance/_components/parent-attendance.tsx
packages/web/app/dashboard/attendance/_components/attendance-card.tsx
```

Add sidebar item to `DashboardShell` for director, teacher, and parent:

```text
Attendance
```

### Staff Screen

Controls:

- Date picker/input.
- Class filter.
- Status filter.

Summary:

- Total
- Present
- Late
- Absent/excused
- Picked up

Child rows:

- Child name.
- Class name.
- Status badge.
- Check-in time.
- Check-out time.
- Buttons:
  - Check in.
  - Check out.
  - Mark absent.
  - More/edit note.

### Parent Screen

Controls:

- Child filter.
- Date range filter.

Cards:

- Date.
- Child/class.
- Status.
- Check-in/check-out times.
- Parent-visible note.

## 13. TanStack Query Keys

Add to `packages/web/lib/query-keys.ts`:

```ts
attendance: {
  all: () => ["attendance"] as const,
  children: (centerId?: string | null) =>
    ["attendance", "children", centerId ?? "parent"] as const,
  staffList: (input: Record<string, unknown>) =>
    ["attendance", "staff", input] as const,
  parentList: (input?: Record<string, unknown>) =>
    ["attendance", "parent", input ?? {}] as const,
  detail: (recordId: string) =>
    ["attendance", "detail", recordId] as const,
}
```

Invalidation:

- Check-in/check-out/mark-status invalidates:
  - `queryKeys.attendance.all()`
  - `queryKeys.notifications.unreadCount()`
- Realtime notification hook invalidates `["attendance"]` when `queryKeys` hint includes `{ group: "attendance" }`.

## 14. Security And Safety

- No parent write access.
- No public child attendance data.
- Staff scope must be checked on every read and write.
- Parent scope must be checked on every read.
- Attendance history is sensitive child-location data; do not expose it in public URLs or unauthenticated endpoints.
- Use the existing auth/session and oRPC authorization helpers.
- Audit every staff mutation with actor, target child, date, old status, and new status.
- Keep staff internal notes separate from parent-visible notes.
- Realtime delivery is best effort; oRPC notification history remains source of truth.

## 15. Edge Cases

- Child has no active enrollment:
  - Staff mutation rejected.
  - Parent history may still show previous records.
- Child changes class:
  - Existing records keep old `classId`.
  - New records use current active enrollment.
- Teacher unassigned mid-day:
  - Future operations denied.
  - Existing audit remains.
- Duplicate check-in:
  - Return current record or require explicit correction.
- Check-out before check-in:
  - Reject unless status is manually marked `picked_up` with correction note.
- Absent child later arrives:
  - Allow staff correction from absent/excused to present/late and audit it.
- Multiple guardians:
  - Notify all active guardians linked to the child.

## 16. Implementation Phases

### Phase 1 - MVP

1. Prisma model + migration.
2. Shared schemas + oRPC contract.
3. Backend service and router.
4. Staff list + check-in/check-out/mark absent.
5. Parent attendance history.
6. Realtime parent notifications.
7. Sidebar link and query keys.

### Phase 2 - Better Operations

1. Bulk actions for class attendance.
2. Attendance correction modal with reason.
3. Weekly/monthly attendance history.
4. Export attendance CSV/PDF.
5. Default class start/end times to auto-suggest `late` and `left_early`.

### Phase 3 - Kidsnote-style Smart Attendance

1. QR check-in.
2. Tablet kiosk mode.
3. NFC/RFID integration.
4. Automatic attendance sync.
5. Temperature/health check pairing.

## 17. Acceptance Criteria

- Director can view and manage attendance for all center children.
- Teacher can view and manage only assigned class children.
- Parent can view only linked children's attendance.
- Staff can check in a child and parent receives realtime notification.
- Staff can check out a child and parent receives realtime notification.
- Staff can mark absent/excused with reason.
- Parent attendance feed shows correct status and times.
- Attendance staff list derives `not_checked_in` for active enrolled children with no row.
- All write actions create audit logs.
- Typecheck and production build pass.
- E2E test covers:
  - staff check-in;
  - parent notification;
  - parent list update;
  - mark read in notification center;
  - staff check-out;
  - permission denial for unrelated teacher/parent.
