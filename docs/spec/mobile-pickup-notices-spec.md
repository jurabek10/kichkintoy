# Mobile Pickup Notices Spec

> **API note:** the app API is oRPC-only and the pickup backend **already exists** — schemas in `packages/shared/src/api/pickups.ts`, contract in `packages/shared/src/api/orpc/pickups.contract.ts`, service in `packages/api/src/pickups/`. This feature is **mobile-frontend only**: it consumes the existing `pickups.*` procedures via the typed `orpc` client + TanStack Query. The web implementation lives in `packages/web/app/dashboard/pickups/`, and [`mobile-medication-requests-spec.md`](./mobile-medication-requests-spec.md) is the closest mobile precedent — follow its conventions. See [`../adding-a-feature.md`](../adding-a-feature.md) for repo conventions.

> Status: **planned**. The parent-facing pickup-notice (하원 알림) flow on mobile: a parent tells the center **who** will collect their child, **when**, and their **relationship**; the parent can later **change** or **cancel** a notice; staff **acknowledge** it on web (out of scope here). The mobile `Pickups` bottom tab currently renders a placeholder ([`app/(tabs)/pickups.tsx`](../../packages/mobile/app/(tabs)/pickups.tsx)); this spec replaces it with the real flow.

## 1. Product Research Summary

Kidsnote-style apps let a parent send the center a short notice: who is picking the child up today, at what time, and how they're related to the child (mother / father / grandparent / other), with an optional note. Staff see the day's notices and acknowledge them. If plans change, the parent edits the notice (it flips to `changed`) or cancels it.

The web app already implements both sides ([`packages/web/app/dashboard/pickups/`](../../packages/web/app/dashboard/pickups/)). On mobile, pickups is a parent bottom tab but only shows an `EmptyState`. This spec builds the real parent flow into that tab plus two dedicated screens (new / detail).

Unlike the medication request, a pickup notice is **lightweight and editable**: no consent, no signature, no photo, no confirm-before-submit gate. It's a quick logistical heads-up, so the form is short and the parent can change it freely until the center acknowledges.

## 2. Scope

In scope (MVP, parent role, mobile):

- **List** — the parent's pickup notices for their child(ren), date-filtered (default today), newest first, with status.
- **New notice** — a short form (child, date, time, pickup-person name, relationship, optional note).
- **Detail** — a read view of one notice with its status and acknowledgement, plus parent actions.
- **Edit** — a parent can change a non-cancelled notice (`pickups.update`); the status flips to `changed`.
- **Cancel** — a parent can cancel a non-cancelled notice (with a confirm modal).
- Localised (uz / ru / en), Uzbekistan-time rendering.

Out of scope (MVP):

- Staff acknowledgement / staff list (web only — `pickups.acknowledge`, `pickups.staffList`).
- New backend procedures or schema changes (the API is sufficient — §4).
- Recurring / multi-day notices (the model is one notice per child per date).

## 3. Vocabulary

- **Notice:** one `PickupNotice` a parent submits for one child for one date.
- **Pickup person:** the named person collecting the child + their `relationship` to the child.
- **Status:** `submitted | acknowledged | changed | cancelled`. A parent edit moves `submitted`/`acknowledged` → `changed`; staff acknowledgement moves `submitted`/`changed` → `acknowledged`.
- **Active child:** the parent's selected child; the form defaults to it but the parent can switch among their children (`pickups.children`).

## 4. API — already exists, no backend work required

All consumed via the typed `orpc` client (parent-relevant procedures only):

- **`pickups.children({ centerId? })` → `{ children: PickupChild[] }`** — the children the parent may file for (id, name, centerId/name, classId/name). Drives the child picker.
- **`pickups.parentList({ childId?, date?, status? })` → `PickupNoticeSummary[]`** — the list.
- **`pickups.detail({ noticeId })` → `PickupNoticeDetail`** — full record incl. person, relationship, note, status, `acknowledgedBy`/`acknowledgedAt`.
- **`pickups.create(input)` → `PickupNoticeDetail`** — create. Input: `childId`, `pickupDate` (`YYYY-MM-DD`), `pickupTime` (`HH:MM`), `pickupPersonName` (1–100), `relationship` (`mother|father|grandparent|other`), optional `note` (≤500).
- **`pickups.update({ noticeId, body })` → `PickupNoticeDetail`** — edit; `body` is the create input minus `childId`, all-partial (at least one field).
- **`pickups.cancel({ noticeId })` → `PickupNoticeDetail`** — parent cancels a notice.
- *(staff only, out of scope:* `pickups.acknowledge`, `pickups.staffList`*)*

**Conclusion:** no contract/schema/service changes. Mobile only collects and sends these fields.

## 5. Routes & navigation

Pickups is already a parent **tab**, so the list lives there; new/detail get a dedicated route group (mirroring `app/medications`):

- `app/(tabs)/pickups.tsx` — **list** (replace the current placeholder). Header "+" pushes `/pickups/new`.
- `app/pickups/new.tsx` — new-notice form.
- `app/pickups/[id].tsx` — detail + edit + cancel.

Changes:

- Register the two non-tab screens in [`app/_layout.tsx`](../../packages/mobile/app/_layout.tsx) `Stack` (header hidden globally; screens render their own header like the other detail screens).
- List row → `[id]`; `new` success → `router.replace('/pickups/[id]')` to the new notice (so Back returns to the tab, not the form).
- No change to `constants/data.ts` or `(tabs)/_layout.tsx` — the tab already exists (`walk` icon, `nav.items.pickups`).

## 6. Data layer (mobile)

Add `packages/mobile/data/pickups.ts` (mirroring `data/medications.ts` — queries + mutations + mappers):

- `usePickupChildren()` → `pickups.children({})`.
- `usePickupNotices(date)` → `pickups.parentList({ date })`, mapped to a `PickupSummary` view model (status, child name, person, relationship label, date/time labels). Sort newest first.
- `usePickupNotice(noticeId)` → `pickups.detail({ noticeId })` mapped to `PickupDetail`. **Freshness (mirror the medication fix):** `staleTime: 0` + `refetchOnMount: 'always'`, and `refetchInterval` while status is `submitted | changed` so a staff acknowledgement reaches the parent live; stop polling once `acknowledged | cancelled`.
- `useCreatePickupNotice()` → mutation over `pickups.create`; on success invalidate the list key and return the new id for navigation.
- `useUpdatePickupNotice(noticeId)` → mutation over `pickups.update`; invalidate detail + list on success.
- `useCancelPickupNotice(noticeId)` → mutation over `pickups.cancel`; optimistic status flip to `cancelled`, invalidate detail + list.
- Add `queryKeys.pickups.{ children, parentList(date?), detail(id) }` to [`lib/query-keys.ts`](../../packages/mobile/lib/query-keys.ts) (parentList keyed by date so date-filtering caches per day; mirror the web key shape).
- Reuse `lib/date.ts` for date/time labels (`formatLongDate`, `todayIsoDate`); pickup time is a plain `HH:MM` string.

## 7. UI

Reuse the app's candy-pastel system and the primitives already built for medications (screen header, `Card`, `SelectField`, `FormField`/`FormDateField`, `ConfirmModal`, `Loader`, `EmptyState`). Pickups has no feature colour yet — propose a friendly accent distinct from medication's coral (D5: **sky** or **grape**, within existing tokens). Status chip colours: `submitted` = sunshine, `acknowledged` = mint, `changed` = sky, `cancelled` = muted/strikethrough.

### 7.1 List (`app/(tabs)/pickups.tsx`)

- `ScreenHeader` (title from `nav.items.pickups`) with a trailing "+" that pushes `/pickups/new`.
- A compact **date selector** in the header area (default today) driving `parentList({ date })`, reusing the `FormDateField`/date control. (D6: a date filter is nice-to-have; if deferred, the list shows all of the parent's notices newest-first.)
- Rows: child name + pickup-person name (title), date + time (caption), and a **status chip**. Tappable → detail.
- `EmptyState` (`empty.parentTitle` / `empty.parentBody`) when empty; `Loader` while pending.

### 7.2 New notice (`app/pickups/new.tsx`)

A scrollable form (`KeyboardAvoidingView` + `ScrollView`) reusing the medication form primitives:

- **Child** — `SelectField` over `pickups.children`, defaulting to the active child; shows class beneath.
- **Date** — `FormDateField`, defaults to today.
- **Time** — a time field, default `17:30` (matches web). No shared mobile time control exists yet (D7).
- **Pickup person name** — text, required (1–100).
- **Relationship** — `SelectField` over the four enum values, default `mother`, labels from `relationship.*`.
- **Note** — textarea, optional (≤500).
- A sticky **Send notice** button at the bottom (`composer.sendNotice`).

Inline validation mirrors the web composer (`childRequired`, `dateRequired`, `timeRequired`, `personRequired`) — surface the first failing message near the top.

Unlike medications, **no confirm-before-submit modal**: a pickup notice is low-stakes and editable, so Submit calls `create` directly.

### 7.3 Detail (`app/pickups/[id].tsx`)

- Coloured identity header (feature colour) with back.
- Status chip; a grouped facts card (child, class, date, time, pickup person, relationship, note); acknowledgement block (`acknowledgedBy` + `acknowledgedAt`, or "Not acknowledged yet").
- If `status !== 'cancelled'`: a **Change** action that reveals the same form fields pre-filled (inline edit, mirroring web's edit card) with a **Save changes** button calling `update`; and a **Cancel notice** action (destructive) that opens a Yes/No `ConfirmModal` before calling `cancel`.
- Editing is reused via a shared `PickupForm` component so `new` and the detail's edit mode share field markup and validation.

Quality floor: keyboard handling on the form, touch targets ≥ 44px, reduced-motion safe, error/empty states written as direction not mood.

## 8. i18n

- Mobile i18n does **not** yet load the `pickups` namespace, but `packages/translations/src/locales/{uz,ru,en}/pickups.json` already exist (used by web, and they already cover composer / detail / status / relationship / validation / empty). Import them in [`packages/mobile/i18n/index.ts`](../../packages/mobile/i18n/index.ts) and add `pickups` to `resources` + the `ns` array.
- Add a small set of **mobile-only keys** only where the mobile UI needs wording the web keys don't cover (e.g. a list-screen `newNotice` FAB label already exists; `detail.cancelConfirm` already exists for the cancel modal). Prefer reusing existing keys.
- `nav.items.pickups` already exists (drives the tab label).

## 9. Decisions

- **D1 — No confirm-before-submit modal.** A pickup notice is low-stakes and freely editable, unlike a medication request; Submit calls `create` directly. The Yes/No `ConfirmModal` is reused only for **cancel**.
- **D2 — Edit reuses the composer form.** A shared `PickupForm` component backs both `new` and the detail edit mode (web does inline edit on detail; mobile mirrors it).
- **D3 — Create + update + cancel** (parent can edit, unlike medications). Acknowledgement is staff-only and out of scope.
- **D4 — List lives in the existing `(tabs)/pickups.tsx`; new/detail in a dedicated `app/pickups/` group.** No tab/tile/nav changes needed.
- **D5 — Identity colour: pick a friendly accent distinct from medication's coral** (proposed sky or grape), within existing tokens. Confirm with client.
- **D6 — Date filter on the list**, defaulting to today (matches web). Acceptable to defer to "all notices, newest first" for MVP if a date control adds friction.
- **D7 — Time input**: no shared mobile time picker exists. Options — add `@react-native-community/datetimepicker` (native wheel), or a lightweight custom HH:MM picker. Default `17:30`.

## 10. Implementation checklist

1. `lib/query-keys.ts` — add `pickups.{ children, parentList(date?), detail(id) }`.
2. `data/pickups.ts` — children/list/detail queries, create + update + cancel mutations, view-model mappers, detail freshness (staleTime 0 + refetch + poll-while-pending).
3. `components/pickup/` — `PickupForm` (shared by new + edit), `PickupStatusChip`, list row. Reuse medication `ConfirmModal`, `FormField`, `FormDateField`, `SelectField`.
4. A time input (D7).
5. `app/(tabs)/pickups.tsx` — replace placeholder with the list + date selector + "+".
6. `app/pickups/new.tsx` — form + create → replace to detail.
7. `app/pickups/[id].tsx` — detail + inline edit (update) + cancel (with confirm).
8. Register the two routes in `app/_layout.tsx`.
9. i18n: load the `pickups` namespace in mobile; add any mobile-only keys to `pickups.json` (uz/ru/en).
10. Typecheck + lint; verify the full flow against real data (create → detail; edit → `changed`; cancel → confirm; staff acknowledge on web → status updates live on mobile detail).

## 11. Open questions

- Feature identity colour (D5): sky, grape, or something else within the palette?
- Date filter on the list (D6): keep the per-day filter, or just show all notices newest-first for MVP?
- Time input (D7): add `@react-native-community/datetimepicker`, or build a lightweight HH:MM picker?
- Edit UX: inline edit on the detail screen (proposed, mirrors web), or a separate `pickups/[id]/edit` screen?
