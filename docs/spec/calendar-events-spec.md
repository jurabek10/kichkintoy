# Calendar & Events Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/calendar.ts`, add procedures to `packages/shared/src/api/orpc/calendar.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `calendar` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style calendar feature: directors and teachers create center/class/child events, parents see monthly and upcoming schedules, and the system sends reminders.

## 1. Product Basis

Kidsnote lists **Calendar** as a core menu. The Japan parent guide describes parents checking created calendar events, using map/location information, and saving needed schedules to a phone calendar. For Kichkintoy, this should become the center's shared schedule layer for holidays, field trips, parent meetings, birthdays, class events, payment reminders, and pickup-related notices.

Sources:

- Kidsnote main site: `https://www.kidsnote.com/`
- Kidsnote Japan feature list: `https://www.kidsnote.com/jp/`
- Kidsnote Japan parent operation page: `https://www.kidsnote.com/jp/parents/operation`

## 2. Scope

In scope for MVP:

- Director/teacher creates an event.
- Event has title, start date/time, optional end date/time, location/map text, and note.
- Event audience can be:
  - whole center;
  - selected classes;
  - optional child-specific event.
- Parent sees monthly calendar.
- Parent sees today's events and upcoming events.
- Teacher/director can edit or cancel events.
- Parent can mark an event as seen.
- Event reminder notification is sent before event start.
- Audit logs are written for staff create/edit/cancel actions.

Out of scope for MVP:

- Photo/file attachments.
- Google Calendar / Apple Calendar export.
- Recurring events.
- RSVP/attendance confirmation.
- Payments.
- External map provider integration.
- Push scheduling worker with guaranteed retries; MVP can use app-triggered due reminder publishing like existing scheduled notices.

Later phases:

- Add private attachment/photo support through MinIO signed upload/download.
- Add `.ics` export for Google Calendar / Apple Calendar.
- Add recurring events.
- Add RSVP or parent confirmation.
- Add event templates for common kindergarten schedules.

## 3. Vocabulary

- **Calendar event:** one scheduled item visible to staff and/or parents.
- **Audience type:** `center`, `class`, or `child`.
- **Center event:** visible to all active children/families in a center.
- **Class event:** visible to selected class children/families and assigned teachers.
- **Child event:** visible only to one child family and authorized staff.
- **Seen marker:** parent read/acknowledgement state for one event.
- **Reminder:** notification sent before event start.
- **Cancelled event:** event remains visible as cancelled, not deleted.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create center-wide event | Yes | No | No | No |
| Create class event | Yes, any class | Yes, assigned classes | No | No |
| Create child-specific event | Yes, center children | Yes, assigned class children | No | No |
| Edit event | Yes | Author or assigned class event | No | No |
| Cancel event | Yes | Author or assigned class event | No | No |
| View staff calendar | Yes, center | Yes, assigned classes | No | No |
| View parent calendar | No | No | No | Own children only |
| Mark seen | No | No | No | Own visible events only |

Authorization rules:

- Director/organization owner can manage all events in their center.
- Teacher can manage only events for active classes in `teacher_class_assignments`.
- Parent can view only events connected to their linked children's active enrollments.
- Parent cannot view a class event if they have no child currently enrolled in that class.
- Parent cannot mutate event content.
- Cancelled events stay visible to parents with `cancelled` status so schedule changes are clear.
- All write actions must audit log actor, center, event id, previous status, and target audience.

## 5. Event Status Model

Event status values:

```text
scheduled
cancelled
completed
```

Rules:

- New events default to `scheduled`.
- Staff can edit scheduled events.
- Staff can cancel scheduled or completed events, but the UI should usually show cancel for scheduled events only.
- Completed can be derived by date in the UI, but storing it is useful for future analytics.
- Events are not hard-deleted in MVP.

## 6. User Flows

### 6.1 Staff Creates Event

1. Director/teacher opens **Calendar**.
2. Clicks **New event**.
3. Enters title.
4. Chooses start date/time.
5. Optionally chooses end date/time.
6. Chooses audience:
   - whole center, director only;
   - selected classes;
   - selected child.
7. Adds location/map text if needed.
8. Adds note/details if needed.
9. Chooses reminder timing:
   - none;
   - 1 hour before;
   - 1 day before;
   - 3 days before.
10. Saves event.
11. System notifies visible parents and staff if needed.

### 6.2 Parent Views Monthly Calendar

1. Parent opens **Calendar**.
2. Default view is current month.
3. Dates with events show a small indicator.
4. Parent taps a date.
5. Event list for that date appears.
6. Parent can filter by child if they have multiple children.

### 6.3 Parent Views Today / Upcoming

1. Parent opens Calendar or Dashboard.
2. Today and upcoming events are shown.
3. Each event shows:
   - title;
   - child/class context;
   - date/time;
   - location/map text;
   - status;
   - seen/unseen state.

### 6.4 Parent Marks Event Seen

1. Parent opens event detail.
2. System can automatically mark seen on detail open, or user clicks **Seen**.
3. Event seen marker is stored per parent user.
4. Staff can see aggregate seen count later.

MVP recommendation:

- Auto-mark as seen when parent opens event detail.
- Add explicit **Mark seen** button only if auto-mark feels unclear.

### 6.5 Staff Edits Event

1. Staff opens event detail.
2. Updates title, date/time, audience, location, note, or reminder.
3. System checks permission again against the new audience.
4. System saves event and writes audit log.
5. If date/time/title/audience changed, notify affected parents.

### 6.6 Staff Cancels Event

1. Staff opens event detail.
2. Clicks **Cancel event**.
3. Adds optional cancellation reason.
4. Event status becomes `cancelled`.
5. Parent sees cancelled badge.
6. System sends cancellation notification to affected parents.

## 7. Data Model

### 7.1 `calendar_events`

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  audience_type TEXT NOT NULL, -- center | class | child
  title TEXT NOT NULL,
  description TEXT,
  location_text TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | cancelled | completed
  cancellation_reason TEXT,
  reminder_minutes_before INT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_center_start ON calendar_events(center_id, starts_at);
CREATE INDEX idx_calendar_events_status_start ON calendar_events(status, starts_at);
```

Rules:

- `ends_at` must be null or greater than `starts_at`.
- `reminder_minutes_before` must be one of `null`, `60`, `1440`, `4320` for MVP.
- `all_day = true` means UI should show date without exact time.

### 7.2 `calendar_event_classes`

Only used when `audience_type = class`.

```sql
CREATE TABLE calendar_event_classes (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, class_id)
);

CREATE INDEX idx_calendar_event_classes_class ON calendar_event_classes(class_id);
```

### 7.3 `calendar_event_children`

Only used when `audience_type = child`.

```sql
CREATE TABLE calendar_event_children (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, child_id)
);

CREATE INDEX idx_calendar_event_children_child ON calendar_event_children(child_id);
```

### 7.4 `calendar_event_seen`

```sql
CREATE TABLE calendar_event_seen (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_calendar_event_seen_user ON calendar_event_seen(user_id, seen_at DESC);
```

### 7.5 Later: `calendar_event_media`

Attachments/photos should be added later with existing private MinIO media flow.

```sql
CREATE TABLE calendar_event_media (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, media_asset_id)
);
```

## 8. Shared Schemas

Create `packages/shared/src/api/calendar.ts`.

Core enums:

```ts
calendarAudienceType = "center" | "class" | "child"
calendarEventStatus = "scheduled" | "cancelled" | "completed"
calendarReminderMinutes = 60 | 1440 | 4320
```

Core response:

```ts
CalendarEventSummary {
  id
  centerId
  centerName
  authorUserId
  authorName
  audienceType
  classIds
  classNames
  childIds
  childNames
  title
  description
  locationText
  startsAt
  endsAt
  allDay
  status
  cancellationReason
  reminderMinutesBefore
  reminderSentAt
  seenByMe
  seenCount
  createdAt
  updatedAt
}
```

Inputs:

```ts
CreateCalendarEventInput {
  centerId
  audienceType
  classIds?
  childIds?
  title
  description?
  locationText?
  startsAt
  endsAt?
  allDay?
  reminderMinutesBefore?
}

UpdateCalendarEventInput {
  eventId
  audienceType?
  classIds?
  childIds?
  title?
  description?
  locationText?
  startsAt?
  endsAt?
  allDay?
  reminderMinutesBefore?
}

CancelCalendarEventInput {
  eventId
  cancellationReason?
}

CalendarListInput {
  centerId?
  childId?
  from
  to
  status?
}

CalendarUpcomingInput {
  centerId?
  childId?
  limit?
}
```

Validation:

- `title`: required, 1-120 chars.
- `description`: optional, max 2000 chars.
- `locationText`: optional, max 300 chars.
- `startsAt`: ISO datetime.
- `endsAt`: optional ISO datetime and must be after `startsAt`.
- `classIds`: required and non-empty when `audienceType = class`.
- `childIds`: required and non-empty when `audienceType = child`.
- `classIds` and `childIds` must not be accepted for center-wide event.

## 9. oRPC Contract

Create `packages/shared/src/api/orpc/calendar.contract.ts`.

Procedures:

```ts
calendar.staffList(input: CalendarListInput) -> CalendarEventSummary[]
calendar.parentList(input: CalendarListInput) -> CalendarEventSummary[]
calendar.upcoming(input?: CalendarUpcomingInput) -> CalendarEventSummary[]
calendar.detail(input: { eventId }) -> CalendarEventSummary
calendar.create(input: CreateCalendarEventInput) -> CalendarEventSummary
calendar.update(input: UpdateCalendarEventInput) -> CalendarEventSummary
calendar.cancel(input: CancelCalendarEventInput) -> CalendarEventSummary
calendar.markSeen(input: { eventId }) -> CalendarEventSummary
calendar.publishDueReminders(input?: { now? }) -> { sent: number }
```

Notes:

- `publishDueReminders` is staff/system-only. It can be called opportunistically on list/detail routes for MVP, like scheduled publishing patterns.
- Later, move reminders to a cron/worker.

## 10. Backend Service

Create:

```text
packages/api/src/calendar/calendar.module.ts
packages/api/src/calendar/calendar.service.ts
packages/api/src/orpc/routers/calendar.router.ts
```

Service responsibilities:

- Resolve staff scope:
  - director/organization owner by center;
  - teacher class assignments.
- Resolve parent scope:
  - linked children via `child_guardians`;
  - active enrollments.
- Validate event audience against role permissions.
- For class events:
  - director can use any active class in center;
  - teacher can use only assigned classes.
- For child events:
  - director can target active center children;
  - teacher can target children in assigned classes.
- Parent list:
  - include center events for child's center;
  - include class events for child's active class;
  - include child events for child.
- Mark seen:
  - parent can mark only visible events;
  - staff can view seen counts but should not mark parent seen.
- Cancel instead of delete.

Audit actions:

```text
calendar_event.created
calendar_event.updated
calendar_event.cancelled
calendar_event.seen
calendar_event.reminder_sent
```

## 11. Notifications

Notification types:

```text
calendar_event.created
calendar_event.updated
calendar_event.cancelled
calendar_event.reminder
```

Created notification:

- Title: `New event`
- Body: `{eventTitle} is scheduled for {date/time}.`
- Entity: `calendar_event`

Updated notification:

- Title: `Event updated`
- Body: `{eventTitle} schedule was updated.`

Cancelled notification:

- Title: `Event cancelled`
- Body: `{eventTitle} was cancelled.`

Reminder notification:

- Title: `Event reminder`
- Body: `{eventTitle} starts {relativeTime}.`

Rules:

- Notify only affected parents for visible children/classes.
- Notify assigned teachers when director creates class/child event.
- Do not send duplicate reminders if `reminder_sent_at` is set.
- Realtime notification center should route event notifications to `/dashboard/calendar`.

## 12. Web UX

Add routes:

```text
packages/web/app/dashboard/calendar/page.tsx
packages/web/app/dashboard/calendar/new/page.tsx
packages/web/app/dashboard/calendar/[eventId]/page.tsx
```

Components:

```text
packages/web/app/dashboard/calendar/_components/calendar-month.tsx
packages/web/app/dashboard/calendar/_components/event-list.tsx
packages/web/app/dashboard/calendar/_components/event-card.tsx
packages/web/app/dashboard/calendar/_components/event-composer.tsx
packages/web/app/dashboard/calendar/_components/event-detail-screen.tsx
packages/web/app/dashboard/calendar/_components/staff-calendar.tsx
packages/web/app/dashboard/calendar/_components/parent-calendar.tsx
```

### 12.1 Director / Teacher UI

Default screen:

- Month calendar on top.
- Today's events section.
- Upcoming events section.
- `New event` button.
- Class filter for director.
- Teacher sees only assigned class events.

Event composer:

- Title input.
- Date input.
- Start time input.
- End time input.
- All-day toggle.
- Audience segmented control:
  - center;
  - classes;
  - child.
- Class multi-select.
- Child select/search.
- Location text input.
- Description textarea.
- Reminder select.
- Save button.

### 12.2 Parent UI

Default screen:

- Month calendar.
- Today section.
- Upcoming section.
- Child filter if multiple children.

Event card:

- Date/time.
- Title.
- Child/class context.
- Location.
- Cancelled badge if cancelled.
- Seen state.

Parent detail:

- Full event info.
- `Mark seen` button or auto-mark on open.
- Later: `Add to calendar` button.

## 13. TanStack Query

Add query keys:

```ts
calendar.all()
calendar.staffList(input)
calendar.parentList(input)
calendar.upcoming(input)
calendar.detail(eventId)
```

Invalidation:

- Create/update/cancel event:
  - invalidate `calendar.all()`;
  - invalidate notification unread count.
- Mark seen:
  - invalidate event detail;
  - invalidate current list/upcoming;
  - invalidate notification unread count if notification read-state is connected later.

## 14. Security And Privacy

- Event visibility must be computed server-side.
- Parent cannot request arbitrary center/class event by id unless visible through active child enrollment.
- Child-specific events must not leak child names to unrelated parents.
- Location text can contain sensitive trip/meeting info; only visible audience can fetch it.
- Attachments/photos in later phase must use private MinIO signed download URLs.
- Cancellation reason may contain sensitive information; keep max length and visible only to affected audience.

## 15. Implementation Plan

1. Add Prisma models and migration.
2. Add shared schemas and oRPC contract.
3. Add API module/service/router.
4. Compose `calendar` into root oRPC router.
5. Add notification routing to `/dashboard/calendar`.
6. Add TanStack query keys.
7. Add dashboard navigation item.
8. Build staff calendar list/month UI.
9. Build parent calendar list/month UI.
10. Add event composer/detail/cancel/seen flows.
11. Add reminder publishing.
12. Run typechecks, builds, and manual role tests.

## 16. Manual Test Plan

### Director

1. Login as director.
2. Open Calendar.
3. Create center-wide event for tomorrow.
4. Create class event for one class.
5. Create child-specific event.
6. Edit event title/time.
7. Cancel event with reason.
8. Confirm all events appear in director month/upcoming views.

### Teacher

1. Login as assigned teacher.
2. Open Calendar.
3. Confirm assigned class events are visible.
4. Create class event for assigned class.
5. Try creating event for unassigned class; must be denied.
6. Edit own/assigned class event.
7. Confirm center-wide director event is visible.

### Parent

1. Login as parent.
2. Open Calendar.
3. Confirm parent sees:
   - center-wide event;
   - their child's class event;
   - their child-specific event.
4. Confirm parent does not see unrelated class/child events.
5. Open event detail.
6. Mark event seen.
7. Confirm seen state persists after reload.
8. Confirm cancelled event is visible with cancelled badge.

### Notifications

1. Create event as staff.
2. Confirm affected parent receives in-app notification.
3. Update event.
4. Confirm affected parent receives update notification.
5. Cancel event.
6. Confirm affected parent receives cancellation notification.
7. Create event with reminder and call due reminder publisher.
8. Confirm one reminder notification is sent and not duplicated.

## 17. Acceptance Criteria

- Director can create center/class/child events.
- Teacher can create only assigned class/child events.
- Parent sees monthly calendar and upcoming events for own children only.
- Parent can mark visible event as seen.
- Staff can edit and cancel authorized events.
- Cancelled events remain visible.
- Event notification routing works.
- Reminder publisher sends due reminders once.
- All oRPC outputs are typed with Zod schemas.
- No `z.unknown()` in public calendar outputs.
- No `any` in router/service code unless unavoidable and justified.
- Typecheck and build pass:

```bash
pnpm --filter @kichkintoy/shared build
pnpm --filter @kichkintoy/shared typecheck
pnpm --filter @kichkintoy/api typecheck
pnpm --filter @kichkintoy/web typecheck
pnpm --filter @kichkintoy/api build
pnpm --filter @kichkintoy/web build
```

