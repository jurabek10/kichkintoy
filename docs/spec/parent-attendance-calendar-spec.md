# Parent Attendance Calendar Spec

> **API note:** the app API is oRPC-only. The attendance backend already exists — this feature is **mobile-frontend only** and consumes the existing `attendance.parentList` procedure via the typed `orpc` client + TanStack Query. See [`attendance-book-spec.md`](./attendance-book-spec.md) for the underlying attendance model and [`../adding-a-feature.md`](../adding-a-feature.md) for conventions.

> Status: **planned**. Kidsnote-style monthly attendance calendar for parents on the mobile home page, replacing the current attendance summary card.

## 1. Product Research Summary

Kidsnote shows a parent a monthly attendance calendar (`출석부`): a month grid where each day cell carries a small status glyph (present ✓, excused absence △, absence ✗, etc.) and a legend below. The reference screenshot the client provided shows the calendar for the current month with each attended weekday checked, an absence marked, the current day highlighted, an "오늘" (Today) button, and prev/next month chevrons.

For Kichkintoy the parent already gets a one-line attendance summary on the home page ("X of Y days attended"). The client wants to upgrade that into the full Kidsnote-style calendar, with two additions beyond the Kidsnote reference:

1. Each day cell shows the child's **check-in and check-out time**, not just a status glyph.
2. **Absent** days are visually **highlighted**.

## 2. Scope

In scope (MVP):

- Monthly calendar on the mobile parent home page, defaulting to the current month.
- Per-day status glyph for the active child, derived from the attendance record.
- Per-day check-in / check-out time shown inside the cell when present.
- Absent days highlighted; today's cell highlighted.
- Month navigation: previous / next month, and a "Today" affordance to jump back.
- A legend mapping glyphs to statuses.
- Localised (uz / ru / en) labels and Uzbekistan-time rendering.

Out of scope (MVP):

- New backend procedures or schema changes (the existing API is sufficient — see §4).
- Parent self check-in / absence submission from the calendar (a separate `parentSubmitAbsence` flow already exists in the contract; not wired here).
- Multi-child switching UI (uses the current child, consistent with the rest of the home page).
- Extended Kidsnote statuses not in the current model: `병결` (sick leave), `사고` (accident), `입소` (admission), `퇴소` (withdrawal). See §8, Decision D1.
- A standalone full-screen attendance history screen (could be a follow-up).

## 3. Vocabulary

- **Attendance record:** one child's attendance row for one center date (see attendance-book-spec).
- **Day cell:** one calendar square for a single date.
- **Active child:** the child currently shown on the home page (`useCurrentChild`).
- **Attended:** any status in `{present, late, left_early, picked_up}`.
- **Today:** today's date in Uzbekistan time (`todayIsoDate()`).

## 4. API — already exists, no backend work required

The attendance backend is complete. This feature consumes:

**`attendance.parentList({ childId?, from?, to? })` → `AttendanceRecordSummary[]`**
(`packages/shared/src/api/orpc/attendance.contract.ts`, `AttendanceService.listForParent`)

- Returns every attendance record for the parent's child(ren) with `attendanceDate` in `[from, to]` (inclusive, date-only).
- Each record provides what the calendar needs:
  - `attendanceDate` — date-only `YYYY-MM-DD`.
  - `status` — one of `not_checked_in | present | absent | late | left_early | picked_up | excused`.
  - `checkedInAt` / `checkedOutAt` — nullable ISO timestamps.
  - `absenceReason`, `parentVisibleNote` — nullable strings (staff notes are hidden for parents).
- Only **days that have a record** are returned. Days with no record (weekends off, future days, pre-enrollment) are simply absent from the array and render as empty cells.
- Any range works, so previous/next month navigation just changes `from`/`to`; no API change needed.

The home page already calls this procedure today via `useAttendanceSummary` (`packages/mobile/data/parent.ts`) for the "X of Y" card, scoped to the current month. The query key factory already has `queryKeys.attendance.parentList(childId, from, to)`.

**Conclusion:** the API for the core feature **is already created**. The only thing that would require API/enum work is adding the extra Kidsnote statuses (Decision D1).

## 5. Status → visual mapping

The provided Kidsnote legend lists seven categories; the current model supports a subset. Proposed mapping for MVP:

| Legend (Kidsnote) | Glyph | Current API status | Cell treatment |
|---|---|---|---|
| 출석 / Present | ✓ | `present` | check glyph + check-in/out times |
| (late) | ✓ | `late` | check glyph (amber accent) + times |
| (left early) | ✓ | `left_early` | check glyph + times |
| (picked up) | ✓ | `picked_up` | check glyph + times |
| 인정 결석 / Excused | △ | `excused` | triangle glyph, soft highlight, absence reason on tap |
| 결석 / Absent | ✗ | `absent` | ✗ glyph, **red highlight** |
| — (no record) | — | `not_checked_in` / missing | empty cell |
| 병결 / 사고 / 입소 / 퇴소 | ◎ ○ / ★ | *not in model* | Decision D1 |

Notes:

- "Show which day is come and not come" → attended statuses get the ✓ + times; `absent` gets the red highlight; missing/`not_checked_in` past weekdays render empty (the API does not synthesize "should have attended" rows).
- Late vs present can share the ✓ glyph with a colour accent so the cell still reads as "came".

## 6. Data layer (mobile)

Add to `packages/mobile/data/` an attendance calendar hook (e.g. `data/attendance.ts`, mirroring `data/meals.ts`):

- `useAttendanceCalendar(month: { year; monthIndex })` → `{ data: AttendanceDay[]; isPending }`.
  - Computes `from` = first of month, `to` = last of month (both `YYYY-MM-DD`), scoped to `useCurrentChild()`.
  - Calls `orpc.attendance.parentList({ childId, from, to })` with key `queryKeys.attendance.parentList(childId, from, to)`.
  - Maps records into a `Map<dateIso, AttendanceDay>` view model:
    ```ts
    type AttendanceDay = {
      date: string;            // YYYY-MM-DD
      status: AttendanceStatus;
      attended: boolean;
      checkInLabel: string;    // "" or "09:12" (UZ time via lib/date.formatTime)
      checkOutLabel: string;   // "" or "16:30"
      absenceReason: string | null;
    };
    ```
- The existing `useAttendanceSummary` can be kept (or re-derived from the same query) so the summary count and calendar share one cache entry.
- Build the calendar grid (weeks × 7) on the client from the selected month; look up each cell's `AttendanceDay` by ISO date. Reuse `lib/date.ts` (`todayIsoDate`, `parseIsoDate`, weekday helpers, `formatTime`) — all Uzbekistan-time aware.

## 7. UI

Location: replaces the current `AttendanceCard` slot on the home page (`components/home/attendance-card.tsx`, used in `app/(tabs)/index.tsx`). Implement as `components/home/attendance-calendar.tsx` (+ small subcomponents if needed), keeping the rest of the home feed unchanged.

Layout (matching the reference, adapted for times in cells):

- **Header:** `‹  YYYY \n MM  ›` centered, with a "Today" pill on the right that returns to the current month. Chevrons step month.
- **Weekday row:** localised short weekday labels (Mon–Sun or Sun–Sat per locale convention; reference starts Sunday).
- **Day grid:** 6 rows × 7 columns; leading/trailing days from adjacent months are dimmed and non-interactive.
- **Day cell** (the key deviation from Kidsnote — cells carry times):
  - Day number top-left.
  - Status glyph (✓ / △ / ✗) centered or top-right.
  - Check-in / check-out times as small text at the bottom, e.g. `09:12` / `16:30` stacked or `09:12–16:30`. Empty when not recorded.
  - Background: today = primary fill; `absent` = red/coral fill; `excused` = soft fill; attended = subtle/none.
  - Cells are tall enough to fit two time lines (taller than the Kidsnote reference).
- **Legend:** glyph + label row beneath the grid, plus the explanatory line ("Attendance is shown after the center checks attendance; excused absences for illness or emergencies count as attendance.") localised.
- Tapping a day with a record may open a small detail (status, times, absence reason). Optional for MVP.

Quality floor: responsive cell sizing, reduced-motion safe (no required animation), legible at small sizes, keyboard/focus N/A on RN but touch targets ≥ 40px where interactive.

## 8. Decisions

- **D1 — Extended statuses (병결/사고/입소/퇴소).** The reference legend includes sick leave, accident, admission, and withdrawal. The current `AttendanceStatus` enum does not. **Recommendation:** ship MVP with the existing statuses and render only ✓ / △ / ✗ + times. If the client wants the full legend, that is a **separate backend change**: extend `attendanceStatusValues` in `packages/shared/src/api/attendance.ts`, the staff marking flow, and migrations — out of scope here.
- **D2 — Times in cells.** The client explicitly wants check-in/out times per cell, which Kidsnote does not show. Cells will be taller than the reference to accommodate two time lines.
- **D3 — Week start.** Follow the reference (Sunday-first) unless localisation calls for Monday-first; pick one and keep `lib/date` weekday order consistent.
- **D4 — Empty past weekdays.** The API returns no row for days never recorded; these render empty (we do not infer "absent"). Only explicit `absent` records are highlighted red.

## 9. Implementation checklist

1. `data/attendance.ts` — `useAttendanceCalendar(month)` hook + `AttendanceDay` view model (no API change).
2. `components/home/attendance-calendar.tsx` — calendar UI (header, weekday row, grid, legend) with month state.
3. Swap `AttendanceCard` for the calendar in `app/(tabs)/index.tsx`; keep/retire `useAttendanceSummary` as needed.
4. i18n: add calendar labels (month nav, weekday short names already in `lib/date`, legend, footer note) to `packages/translations` `app`/attendance namespace (uz/ru/en).
5. Verify Uzbekistan-time rendering for `checkedInAt`/`checkedOutAt` via `lib/date.formatTime`.
6. Typecheck + lint; verify against real data in the app.

## 10. Open questions

- Should tapping a day open a detail sheet (status + reason + notes), or is the cell enough for MVP?
- Confirm week-start (Sunday vs Monday) and weekday label order per locale.
- Does the client want the extended Kidsnote statuses now (triggers the D1 backend change) or later?
