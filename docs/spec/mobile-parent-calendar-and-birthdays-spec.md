# Mobile Parent Calendar & Birthdays Spec

> **API note:** the app API is oRPC-only. The calendar **event** backend already exists — see [`calendar-events-spec.md`](./calendar-events-spec.md), `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/orpc/calendar.contract.ts`, and `packages/api/src/calendar/`. The **mobile** screen consumes the existing `calendar.parentList` procedure via the typed `orpc` client + TanStack Query. The **birthdays** layer is the only part that needs a new backend procedure (§5). See [`../adding-a-feature.md`](../adding-a-feature.md) for conventions.

> Status: **planned**. Kidsnote-style monthly schedule (일정표) for parents on mobile: a month-grouped list of center/class/child events **plus** classmates' birthdays derived from each child's date of birth. Replaces the placeholder calendar screen.

## 1. Product Research Summary

Kidsnote's **일정표** (schedule) is a single scrollable list grouped by month. Each row shows a large day number with the weekday beneath it on the left, the event title in the middle, and a trailing glyph on the right. In the client's reference screenshots almost every row is a child **birthday** (`생일`) — the classmate's name, their profile photo as the row avatar, and a 🎂 cake on the right — interleaved with month headers (`2026년 7월`, `2026년 8월`, …). Birthdays are not events someone typed in; they are generated automatically from each child's date of birth and repeat every year.

For Kichkintoy:

- The **event** half already exists end-to-end on the backend and on **web** (`packages/web/app/dashboard/calendar/`, parent view `ParentCalendar` → `orpc.calendar.parentList`). Directors/teachers create holidays, field trips, parent meetings, performances, and closures.
- The **mobile** calendar screen does **not** exist yet. The shortcut tile routes to `/feature/calendar`, which today renders the generic placeholder in [`app/feature/[key].tsx`](../../packages/mobile/app/feature/[key].tsx) (an `EmptyState`). This is why the mobile calendar looks empty regardless of data — it is never wired to the API.
- **Birthdays do not exist anywhere yet.** No procedure emits them; they must be derived from `Child.dob`.

This spec covers (a) building the real mobile parent calendar screen against the existing event API, and (b) adding a birthdays source and merging it into the same list, to match the Kidsnote 일정표.

## 2. Scope

In scope (MVP):

- A dedicated mobile parent calendar screen at `/feature/calendar`, replacing the placeholder.
- Kidsnote-style **month-grouped list**: month headers (`YYYY MMMM`) with rows beneath, ordered chronologically.
- **Event rows** from `calendar.parentList` for the active child's center/class/child audience: title, date, time (or all-day), optional location, status.
- **Birthday rows** for the **whole class** (all active classmates in the parent's child's class(es)): child name, profile photo, age turning, 🎂 glyph.
- Cancelled events visually de-emphasised (or filtered — Decision D4).
- Month range navigation (the list shows a window; default current month forward — Decision D3).
- Localised (uz / ru / en) labels; Uzbekistan-time rendering via `lib/date`.

Out of scope (MVP):

- Event **creation/editing** on mobile (staff do this on web; the contract already supports it but mobile is parent-only here).
- A month **grid** view (this screen is the agenda/list view; the home page already has the attendance grid — see [`parent-attendance-calendar-spec.md`](./parent-attendance-calendar-spec.md)).
- Saving an event to the phone's native calendar, map/location deep-links (follow-up).
- Birthday greetings, gifts, or notifications (birthdays are display-only here; event reminders already exist server-side).
- Configurable birthday privacy in the UI — this MVP fixes the policy at **whole class** (Decision D1).

## 3. Vocabulary

- **Event:** a `CalendarEvent` row created by staff (`calendar-events-spec.md`).
- **Birthday entry:** a *derived*, non-persisted item computed from a child's `dob`; not a `CalendarEvent`.
- **Schedule item:** the unified list element rendered by the screen — either an event or a birthday.
- **Active child / classmates:** the parent's currently selected child (`useCurrentChild`) and the other active enrollments in that child's class(es).
- **Occurrence date:** for a yearly-recurring birthday, the date it falls on within the viewed range (`dob` month/day, current/next year).
- **Today:** today's date in Uzbekistan time (`todayIsoDate()`).

## 4. Events API — already exists, no backend work required

The screen consumes the existing procedure:

**`calendar.parentList({ centerId?, childId?, from, to, status? })` → `CalendarEventSummary[]`**
(`packages/shared/src/api/orpc/calendar.contract.ts`, `CalendarService.listForParent`)

- Returns events the parent may see (audience `center` / `class` containing the child's class / `child`) with `startsAt` within `[from, to]`, ordered ascending.
- Each summary already carries everything a row needs: `title`, `startsAt`, `endsAt`, `allDay`, `locationText`, `status`, `audienceType`, `classNames`, `childNames`, `seenByMe`, `description`.
- Range-driven, so list navigation only changes `from`/`to`. Web already calls this exact procedure.

`queryKeys.calendar` on mobile currently only has `upcoming`; add `parentList(input)` to the factory (mirrors web's `queryKeys.calendar.parentList`).

**Conclusion:** the event half needs **mobile frontend only**.

## 5. Birthdays — new backend procedure

Birthdays are derived data, not events, so they get a dedicated **read-only** procedure rather than polluting the event CRUD model or the `parentList` response.

### 5.1 Contract

Add to `packages/shared/src/api/calendar.ts` + `calendar.contract.ts`:

**`calendar.birthdays({ childId?, from, to }) → BirthdayEntry[]`**

```ts
type BirthdayEntry = {
  childId: string;
  childName: string;        // firstName + lastName
  photoUrl: string | null;  // Child.photoUrl
  classId: string | null;
  className: string | null;
  date: string;             // YYYY-MM-DD — the occurrence inside [from, to]
  dob: string;              // original YYYY-MM-DD (for age)
  turningAge: number;       // age reached on `date`
  isOwnChild: boolean;      // for subtle highlighting of the parent's child
};
```

### 5.2 Service (`CalendarService.birthdaysForParent`)

1. Resolve the parent's access with the existing `parentAccess(userId, childId)` → active `enrollments` (childId, classId, centerId), already used by `listForParent`. This is the authorization boundary.
2. Collect the **classIds** the parent's child(ren) belong to.
3. Query active classmates: `childEnrollment` where `enrollmentStatus = 'active'` and `classId in classIds`, including `child` (`firstName`, `lastName`, `dob`, `photoUrl`) and `class` (`id`, `name`). De-duplicate by `childId`.
4. For each classmate, compute every birthday **occurrence** in `[from, to]`: take `dob` month/day, for each year spanned by the range build the candidate date, keep those within range. `turningAge = occurrenceYear − dobYear`.
5. Mark `isOwnChild` when the child is one of the requesting parent's own children.
6. Sort by `date` ascending. Validate with a Zod schema and return.

Privacy: **whole class** (Decision D1) — a parent sees birthdays only for children actively enrolled in the **same class(es)** as their own child, never the whole center, never across classes. `dob` is reduced to month/day + age at the API boundary is acceptable, but the schema returns the real `dob`; if that is too much exposure, return only `turningAge` and drop `dob` (Decision D2).

### 5.3 Compose + wire

- Add `birthdays` to the `calendar` group in `orpc-contract.ts` and implement in `calendar.router.ts` → `calendar.service.ts`.
- Add `queryKeys.calendar.birthdays(input)` on mobile.

## 6. Data layer (mobile)

Add `packages/mobile/data/calendar.ts` (mirroring `data/attendance.ts` / `data/meals.ts`):

- `useParentCalendar(range: { from: string; to: string })` →
  - `eventsQuery` = `orpc.calendar.parentList({ childId, from, to })`, key `queryKeys.calendar.parentList(...)`.
  - `birthdaysQuery` = `orpc.calendar.birthdays({ childId, from, to })`, key `queryKeys.calendar.birthdays(...)`.
  - Scoped to `useCurrentChild()`; `enabled` only when a child id is present.
- Merge into one sorted, month-grouped view model:
  ```ts
  type ScheduleItem =
    | { kind: 'event'; date: string; event: CalendarEventSummary }
    | { kind: 'birthday'; date: string; birthday: BirthdayEntry };

  type MonthSection = { key: string; year: number; monthIndex: number; items: ScheduleItem[] };
  ```
  - Sort by `date`, then all-day/birthday before timed events on the same day (or by time — Decision D5).
  - Group consecutive items by `year-monthIndex` into `MonthSection[]` for a `SectionList`.
- Reuse `lib/date.ts` (`parseIsoDate`, `weekdayShort`, `formatMonthYear`, `formatTime`, `todayIsoDate`) — all Uzbekistan-time aware. Add a small `ageLabel`-style helper only if needed.

## 7. UI

Location: new `app/feature/calendar.tsx` (a real route file) **or** branch inside [`app/feature/[key].tsx`](../../packages/mobile/app/feature/[key].tsx) to render the calendar component for `key === 'calendar'` while other keys keep the placeholder. Prefer a dedicated component `components/calendar/parent-calendar.tsx` + row components, keeping the screen thin.

Layout (Kidsnote 일정표, adapted to the app's candy-pastel system):

- **Header:** `ScreenHeader` with the localised "Calendar" title and back.
- **Body:** a `SectionList` (not `ScrollView`) for month sections.
  - **Section header:** `YYYY MMMM` (e.g. "2026 July" / "2026-yil Iyul" / "Июль 2026") — sticky, muted, bold; matches the screenshot's `2026년 7월`.
  - **Event row:** left **date column** (large day number over weekday short, same treatment as the attendance row — see [`attendance-day-row.tsx`](../../packages/mobile/components/attendance/attendance-day-row.tsx)); middle title + optional time/location; trailing audience or type glyph. Time shows `HH:mm` or an "all day" chip. Cancelled → strikethrough + muted (or hidden, D4).
  - **Birthday row:** same left date column; middle `"{name}"` + a small "turns {n}" caption; **leading or trailing avatar** (`photoUrl`, fallback to a silhouette) and a 🎂 cake glyph on the right, mirroring the reference. The parent's own child gets a subtle accent (`isOwnChild`).
- **Empty state:** when both queries return nothing for the range, show `EmptyState` (`calendar-outline`) with copy explaining events appear once staff schedule them — distinct from "loading".
- **Loading:** `Loader` while pending.

Quality floor: `SectionList` virtualization, responsive rows, reduced-motion safe (no required animation), touch targets ≥ 40px for any tappable row, avatar images lazy with placeholder.

Visual consistency: reuse the date-column, pill, and candy tokens introduced for the attendance list so the two calendar surfaces feel like one family.

## 8. Decisions

- **D1 — Birthday privacy = whole class.** Confirmed by the client: parents see classmates' birthdays for children in the **same class(es)** as their own child. Authorization reuses `parentAccess` → `classIds`. Not center-wide, not cross-class.
- **D2 — DOB exposure.** Returning classmates' full `dob` to every class parent is more than strictly needed. **Recommendation:** return `date` (occurrence), `turningAge`, name and photo, but **omit raw `dob`** from the parent payload. Revisit if a real need appears.
- **D3 — List window.** The screen shows a range, not infinite scroll. **Recommendation:** default to a forward window (current month → +N months, e.g. 6) with a way to page back, matching the screenshot which runs forward from the current month. Final window size TBD.
- **D4 — Cancelled events.** Show de-emphasised (strikethrough + "cancelled" tag) rather than hiding, so parents understand a known event was called off. Confirm with client.
- **D5 — Same-day ordering.** Birthdays and all-day events sort before timed events on the same date; timed events by start time. Confirm.
- **D6 — Birthdays as a separate procedure** (not folded into `parentList`). Keeps the event CRUD/cache clean and birthdays cacheable independently; merge happens client-side.
- **D7 — Photo source.** Use `Child.photoUrl`. Children without a photo render the silhouette placeholder seen in the reference.

## 9. Implementation checklist

Backend (birthdays only):

1. `packages/shared/src/api/calendar.ts` — add `birthdayEntrySchema`, `calendarBirthdaysInputSchema`, `calendarBirthdaysResponseSchema`.
2. `packages/shared/src/api/orpc/calendar.contract.ts` — add `birthdays` procedure; compose into `orpc-contract.ts`.
3. `packages/api/src/calendar/calendar.service.ts` — `birthdaysForParent(userId, { childId, from, to })`; reuse `parentAccess`, compute occurrences, enforce whole-class scope.
4. `packages/api/src/calendar/calendar.router.ts` — wire the procedure.
5. Backend tests: scope (only same-class classmates), occurrence math (range spanning a year boundary, Feb 29 → Decision needed), age computation.

Mobile:

6. `packages/mobile/lib/query-keys.ts` — add `calendar.parentList(input)` and `calendar.birthdays(input)`.
7. `packages/mobile/data/calendar.ts` — `useParentCalendar(range)` merging events + birthdays into `MonthSection[]`.
8. `packages/mobile/components/calendar/parent-calendar.tsx` (+ `event-row`, `birthday-row`) — `SectionList` UI.
9. Route: render the calendar for `key === 'calendar'` (or a dedicated `app/feature/calendar.tsx`).
10. i18n: add calendar list labels (section month format reuses `formatMonthYear`, "all day", "turns {{age}}", "cancelled", empty state) to `packages/translations` `app`/`nav` (uz/ru/en).
11. Typecheck + lint; verify against real data (create an event on web, set a couple of classmates' DOB, confirm both appear and group correctly in UZ time).

## 10. Open questions

- Feb 29 birthdays in non-leap years — render on Feb 28 or Mar 1? (occurrence math edge case).
- List window: how far forward by default, and is backward paging needed for MVP?
- Should the parent's own child's birthday be visually distinct (accent), or treated identically to classmates'?
- Do we want event rows tappable to a detail sheet (description, location, mark-seen) in MVP, or display-only first?
- Confirm cancelled-event treatment (D4) and same-day ordering (D5).
