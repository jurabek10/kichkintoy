# Pickup Time Notices Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/pickups.ts`, add procedures to `packages/shared/src/api/orpc/pickups.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `pickups` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style pickup time notice feature: parents tell the center who will pick up the child and when, while teachers/directors see a simple daily pickup list.

## 1. Product Research Summary

Kidsnote lists `お迎え時間届` / pickup time notice as one of its core childcare communication features. The public Kidsnote Japan feature page says parents can create a pickup-time notice for the center, and teachers can easily confirm pickup times. This feature belongs next to attendance because it helps staff safely manage end-of-day handoff.

For Kichkintoy, the feature should be simple, safety-focused, and fast to use:

- Parent submits pickup time for one linked child.
- Parent names the pickup person and relationship.
- Teacher/director sees today's pickup list by class/center.
- Staff acknowledges the notice after seeing it.
- Parent can change or cancel before pickup is completed.

Sources:

- Kidsnote Japan feature list: `https://www.kidsnote.com/jp`
- Kidsnote parent operation guide: `https://www.kidsnote.com/jp/parents/operation`

## 2. Scope

In scope:

- Parent creates a pickup time notice for their own child.
- Parent selects pickup date and pickup time.
- Parent enters pickup person name.
- Parent selects relationship: mother, father, grandparent, other.
- Parent can add an optional note.
- Parent can change or cancel a submitted notice.
- Teacher/director sees today's pickup list.
- Teacher/director acknowledges a submitted or changed notice.
- Notifications are sent when a notice is submitted, changed, cancelled, or acknowledged.
- Audit logs are written for create, change, cancel, and acknowledge actions.

Out of scope for MVP:

- QR code pickup verification.
- Identity document upload.
- Geolocation / parent arrival tracking.
- Automatic door/gate hardware integration.
- Multi-child bulk pickup notices.
- Legal handoff signature capture.
- Emergency release workflow for unknown pickup people.

## 3. Vocabulary

- **Pickup notice:** parent-submitted message telling the center when and by whom the child will be picked up.
- **Pickup person:** adult expected to pick up the child.
- **Relationship:** relationship of pickup person to child.
- **Acknowledgement:** staff confirmation that the center has seen the pickup notice.
- **Changed notice:** a notice that was edited by the parent after initial submission.
- **Cancelled notice:** a notice the parent withdrew before pickup.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create pickup notice | No | No | No | Own child only |
| Change pickup notice | No | No | No | Own active notice only |
| Cancel pickup notice | No | No | No | Own active notice only |
| View parent pickup list | No | No | No | Own children only |
| View staff pickup list | All center children | Assigned class children | No | No |
| View pickup detail | Center notices | Assigned class notices | No | Own child only |
| Acknowledge notice | Yes | Assigned class children | No | No |

Authorization rules:

- Parent access is based on `child_guardians.user_id` and the child's active enrollment.
- Teacher access is based on active `teacher_class_assignments`.
- Director/organization owner can view and acknowledge all center pickup notices.
- Parent cannot create or view notices for another child, class, or center.
- Teacher cannot see pickup notices outside assigned classes.
- Staff cannot edit parent-entered pickup data; staff can only acknowledge.

## 5. Status Model

Pickup notice status values:

```text
submitted
acknowledged
changed
cancelled
```

Status behavior:

- `submitted`: parent created a new pickup notice; staff has not acknowledged it.
- `acknowledged`: staff has seen and confirmed the current notice.
- `changed`: parent edited an already submitted or acknowledged notice; staff should acknowledge again.
- `cancelled`: parent cancelled the notice; it remains visible for audit/history.

Rules:

- Parent can edit `submitted`, `acknowledged`, or `changed` notices.
- Editing an `acknowledged` notice changes status to `changed`.
- Editing a `submitted` or `changed` notice keeps or sets status to `changed`.
- Parent can cancel `submitted`, `acknowledged`, or `changed` notices.
- Cancelled notices cannot be edited or acknowledged.
- Acknowledging `submitted` or `changed` sets status to `acknowledged`.

## 6. User Flows

### 6.1 Parent Creates Pickup Notice

1. Parent opens **Pickup**.
2. Parent clicks **New pickup notice**.
3. Parent selects child.
4. Parent selects pickup date.
5. Parent enters pickup time.
6. Parent enters pickup person name.
7. Parent selects relationship:
   - mother;
   - father;
   - grandparent;
   - other.
8. Parent optionally writes a note.
9. Parent submits.
10. System notifies director and assigned class teacher(s).

### 6.2 Parent Changes Pickup Notice

1. Parent opens an active pickup notice.
2. Parent edits pickup time, pickup person, relationship, or note.
3. Parent saves changes.
4. Status becomes `changed`.
5. System notifies director and assigned class teacher(s).

### 6.3 Parent Cancels Pickup Notice

1. Parent opens an active pickup notice.
2. Parent clicks **Cancel notice**.
3. System asks for confirmation.
4. Status becomes `cancelled`.
5. System notifies director and assigned class teacher(s).

### 6.4 Staff Views Today's Pickup List

1. Teacher/director opens **Pickup**.
2. Default date is today.
3. Director sees all center pickup notices.
4. Teacher sees only assigned class notices.
5. List groups or filters by class.
6. Each row/card shows:
   - child name;
   - class name;
   - pickup time;
   - pickup person name;
   - relationship;
   - status;
   - parent note preview.

### 6.5 Staff Acknowledges Pickup Notice

1. Teacher/director opens pickup detail or list row.
2. Staff reviews pickup person, relationship, time, and note.
3. Staff clicks **Acknowledge**.
4. Status becomes `acknowledged`.
5. System records who acknowledged it and when.
6. System notifies parent.

## 7. Data Model

Add a new table:

```prisma
model PickupTimeNotice {
  id               String   @id @default(uuid()) @db.Uuid
  centerId         String   @map("center_id") @db.Uuid
  classId          String?  @map("class_id") @db.Uuid
  childId          String   @map("child_id") @db.Uuid
  parentUserId     String   @map("parent_user_id") @db.Uuid
  pickupDate       DateTime @map("pickup_date") @db.Date
  pickupTime       String   @map("pickup_time")
  pickupPersonName String   @map("pickup_person_name")
  relationship     String
  note             String?
  status           String   @default("submitted")
  acknowledgedById String?  @map("acknowledged_by_id") @db.Uuid
  acknowledgedAt   DateTime? @map("acknowledged_at")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  center         Center @relation(fields: [centerId], references: [id])
  class          Class? @relation(fields: [classId], references: [id])
  child          Child  @relation(fields: [childId], references: [id])
  parentUser     User   @relation("PickupParent", fields: [parentUserId], references: [id])
  acknowledgedBy User?  @relation("PickupAcknowledgedBy", fields: [acknowledgedById], references: [id])

  @@index([centerId, pickupDate, status])
  @@index([classId, pickupDate, status])
  @@index([childId, pickupDate])
  @@index([parentUserId, pickupDate])
  @@map("pickup_time_notices")
}
```

Notes:

- Store `pickupTime` as `HH:mm` text for MVP to avoid timezone confusion.
- `pickupDate` is a date-only value.
- `classId` should be copied from the child's active enrollment at create time so historical notices remain stable.
- Keep cancelled rows for audit and parent/staff history.

## 8. Shared API Schemas

Create `packages/shared/src/api/pickups.ts`.

Enums:

```ts
pickupRelationshipValues = ["mother", "father", "grandparent", "other"] as const;
pickupNoticeStatusValues = ["submitted", "acknowledged", "changed", "cancelled"] as const;
```

Input schemas:

- `createPickupNoticeInputSchema`
  - `childId`: UUID
  - `pickupDate`: ISO date string
  - `pickupTime`: `HH:mm`
  - `pickupPersonName`: 1-100 chars
  - `relationship`: enum
  - `note`: optional max 500 chars

- `updatePickupNoticeInputSchema`
  - `noticeId`: UUID
  - `body.pickupDate`: ISO date string
  - `body.pickupTime`: `HH:mm`
  - `body.pickupPersonName`: 1-100 chars
  - `body.relationship`: enum
  - `body.note`: optional max 500 chars

- `cancelPickupNoticeInputSchema`
  - `noticeId`: UUID

- `acknowledgePickupNoticeInputSchema`
  - `noticeId`: UUID

- `staffPickupListInputSchema`
  - `centerId`: UUID
  - `date`: optional ISO date string
  - `status`: optional enum
  - `classId`: optional UUID

- `parentPickupListInputSchema`
  - `childId`: optional UUID
  - `date`: optional ISO date string
  - `status`: optional enum

Response schemas:

- `pickupChildSchema`
  - child id/name
  - center id/name
  - class id/name

- `pickupNoticeSummarySchema`
  - id
  - center id/name
  - child
  - parent name
  - pickup date/time
  - pickup person name
  - relationship
  - note
  - status
  - acknowledged by/at
  - created/updated at

- `pickupNoticeDetailSchema`
  - same as summary for MVP

## 9. oRPC Contract

Create `packages/shared/src/api/orpc/pickups.contract.ts`.

Procedures:

```text
pickups.children
pickups.parentList
pickups.staffList
pickups.detail
pickups.create
pickups.update
pickups.cancel
pickups.acknowledge
```

Rules:

- All procedures require authenticated user.
- Parent procedures derive center/class from active child enrollment.
- Staff list and acknowledge require center/class scope.
- Responses must be parsed with shared Zod schemas; no `z.unknown()`.

## 10. Backend Implementation

Create:

```text
packages/api/src/pickups/pickups.module.ts
packages/api/src/pickups/pickups.service.ts
packages/api/src/orpc/routers/pickups.router.ts
```

Service methods:

- `children(userId, centerId?)`
- `listForParent(userId, filters)`
- `listForStaff(userId, centerId, filters)`
- `get(userId, noticeId)`
- `create(userId, input)`
- `update(userId, noticeId, input)`
- `cancel(userId, noticeId)`
- `acknowledge(userId, noticeId)`

Backend rules:

- Parent can create only for linked child with active enrollment.
- On create, copy `centerId` and `classId` from active enrollment.
- Parent can update/cancel only their own non-cancelled notice.
- Staff can acknowledge only center/class-scoped notices.
- Director can acknowledge any notice in center.
- Teacher can acknowledge only assigned class notices.
- Use transactions when writing notice + audit + notification.
- Parse every response through shared schemas.

## 11. Notifications

Create notifications:

| Event | Recipient | Type | Title |
|---|---|---|---|
| Parent creates notice | Director + assigned teachers | `pickup_notice.created` | New pickup notice |
| Parent changes notice | Director + assigned teachers | `pickup_notice.changed` | Pickup notice changed |
| Parent cancels notice | Director + assigned teachers | `pickup_notice.cancelled` | Pickup notice cancelled |
| Staff acknowledges notice | Parent | `pickup_notice.acknowledged` | Pickup notice confirmed |

Notification body examples:

- `Ali Notice will be picked up at 17:30 by Grandmother.`
- `Ali Notice's pickup time was changed to 18:00.`
- `The center confirmed Ali Notice's pickup notice.`

## 12. Audit Logging

Audit actions:

```text
pickup_notice.created
pickup_notice.changed
pickup_notice.cancelled
pickup_notice.acknowledged
```

Audit payload should include:

- organization id
- center id
- actor user id
- entity type: `pickup_time_notice`
- entity id

## 13. Web UI

Routes:

```text
/dashboard/pickups
/dashboard/pickups/new
/dashboard/pickups/[noticeId]
```

Navigation:

- Add **Pickup** to dashboard shell for director, teacher, and parent.
- Use a clear icon such as `Clock`, `Car`, or `UserCheck` from `lucide-react`.

Parent screen:

- Date filter, default today.
- Child filter, optional.
- Cards showing pickup time, child/class, pickup person, relationship, status.
- New pickup notice button.

Parent composer:

- child select
- pickup date
- pickup time
- pickup person name
- relationship select
- optional note
- submit button

Staff screen:

- Date filter, default today.
- Status filter.
- Class filter if useful.
- List grouped by class or sorted by pickup time.
- Each card/row shows:
  - pickup time
  - child
  - pickup person
  - relationship
  - note
  - status
  - acknowledge action

Detail screen:

- Parent can update/cancel active notice.
- Staff can acknowledge submitted/changed notice.
- Cancelled notices are read-only.

## 14. TanStack Query

Add query keys:

```ts
pickups: {
  all: () => ["pickups"] as const,
  children: (centerId?: string | null) => ["pickups", "children", centerId ?? "parent"] as const,
  parentList: (input?: Record<string, unknown>) => ["pickups", "parent", input ?? {}] as const,
  staffList: (input: Record<string, unknown>) => ["pickups", "staff", input] as const,
  detail: (noticeId: string) => ["pickups", "detail", noticeId] as const,
}
```

Invalidation:

- After create/update/cancel/acknowledge: invalidate `pickups.all()`.
- Detail screen should use `staleTime: 0` and `refetchOnMount: "always"` because pickup data is time-sensitive.

## 15. Validation Rules

- `pickupDate` must be a valid ISO date string.
- `pickupTime` must match `HH:mm`.
- `pickupPersonName` is required, trimmed, max 100 chars.
- `relationship` must be one of:
  - `mother`
  - `father`
  - `grandparent`
  - `other`
- `note` max 500 chars.
- Cannot acknowledge cancelled notice.
- Cannot update cancelled notice.
- Cannot cancel already cancelled notice.

Optional MVP rule:

- Prevent creating more than one active pickup notice per child per date. If parent already has a non-cancelled notice for that child/date, send them to edit the existing notice.

## 16. Security And Privacy

- Pickup person names are sensitive child safety data.
- Parent can only see notices for their own linked children.
- Teacher can only see assigned class notices.
- Director can see all center notices.
- Do not expose pickup notices through public URLs.
- Do not include pickup person names in broad push notification previews if the app later supports lock-screen push.
- All writes must be audit logged.

## 17. Empty And Error States

Parent empty state:

```text
No pickup notices
Today's pickup plans will appear here.
```

Staff empty state:

```text
No pickup notices for today
Parent pickup notices will appear here.
```

Errors:

- `Choose a child.`
- `Pickup time is required.`
- `Pickup person name is required.`
- `You cannot access this pickup notice.`
- `Cancelled pickup notices cannot be changed.`
- `Only submitted or changed notices can be acknowledged.`

## 18. Acceptance Criteria

- Parent can create a pickup notice for their linked active child.
- Parent cannot create a pickup notice for another child.
- Parent can update an active notice and status becomes `changed`.
- Parent can cancel an active notice and status becomes `cancelled`.
- Director sees all center pickup notices for selected date.
- Teacher sees only assigned class pickup notices.
- Staff can acknowledge submitted/changed notices.
- Parent sees acknowledged status after staff confirmation.
- Parent and staff list screens default to today's date.
- All API inputs and outputs are typed with shared schemas.
- All write actions create audit logs.
- Notifications are created for create/change/cancel/acknowledge.
- Web typecheck passes.

## 19. E2E Test Plan

Browser E2E should cover:

1. Parent logs in.
2. Parent opens `/dashboard/pickups/new`.
3. Parent creates pickup notice:
   - child;
   - date;
   - time;
   - pickup person name;
   - relationship;
   - note.
4. Parent lands on detail page and sees `Submitted`.
5. Director logs in.
6. Director opens `/dashboard/pickups`.
7. Director sees the new notice in today's list.
8. Director acknowledges it.
9. Parent logs in again.
10. Parent opens detail and sees `Acknowledged`.
11. Parent changes pickup time.
12. Status becomes `Changed`.
13. Director sees changed notice and acknowledges again.
14. Parent cancels a separate active notice.
15. Staff sees cancelled status.

## 20. Future Enhancements

- Connect pickup notices to attendance check-out.
- Add pickup completion status after child leaves.
- Add QR code pickup confirmation.
- Add trusted pickup person directory per child.
- Add emergency pickup contacts.
- Add parent arrival notification.
- Add daily pickup timeline for front desk staff.
- Add printable pickup sheet.
- Add bulk sibling pickup notice.
