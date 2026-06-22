# Mobile Medication Requests Spec

> **API note:** the app API is oRPC-only and the medication backend **already exists** — schemas in `packages/shared/src/api/medications.ts`, contract in `packages/shared/src/api/orpc/medications.contract.ts`, service in `packages/api/src/medications/`. This feature is **mobile-frontend only**: it consumes the existing `medications.*` procedures via the typed `orpc` client + TanStack Query. See [`medication-requests-spec.md`](./medication-requests-spec.md) for the full domain model and the web implementation, and [`../adding-a-feature.md`](../adding-a-feature.md) for conventions.

> Status: **planned**. The parent-facing medication request (`투약의뢰서`) flow on mobile: a parent lists their child's requests, fills a request form, **agrees to a consent**, and **confirms in a Yes/No modal before it's submitted**. Staff complete administration on web (out of scope here).

## 1. Product Research Summary

Kidsnote lets a parent submit a medication request to the center: what the medicine is, the dose, when to give it, and a consent that authorizes staff to administer it. Staff later mark it administered or skipped. The web app already implements both sides ([`medication-requests-spec.md`](./medication-requests-spec.md), `packages/web/app/dashboard/medications/`).

On mobile, the `Medications` shortcut currently routes to `/feature/medications`, which renders the generic placeholder in [`app/feature/[key].tsx`](../../packages/mobile/app/feature/%5Bkey%5D.tsx). This spec replaces that with the real parent flow.

The client asked for two things specifically, on top of porting the web form:

1. An **"I agree" consent** the parent must accept for a request they create.
2. A **confirmation modal before submit** — tapping Submit opens a modal that summarizes the request with **Yes / No**; only **Yes** actually submits. This is the native-app safeguard against accidental medical submissions.

The consent is already enforced by the API (`consent: true` + `parentSignature`); the confirmation modal is a new mobile UI safeguard layered in front of it.

## 2. Scope

In scope (MVP, parent role, mobile):

- **List** — the parent's medication requests for their child(ren), newest first, with status.
- **New request** — a form mirroring the web composer's fields, with a required consent and a confirm-before-submit modal.
- **Detail** — a read view of one request: what was requested, status, and staff outcome (administered / skipped) when present.
- **Cancel** — a parent can cancel their own `pending` request (with a confirm modal), matching web.
- Optional medicine **photo** upload (reuses the signed-upload flow).
- Localised (uz / ru / en), Uzbekistan-time rendering.

Out of scope (MVP):

- Staff administration/completion (web only).
- Editing a submitted request (the model is create + cancel; no update — consistent with web).
- New backend procedures or schema changes (the API is sufficient — §4).

## 3. Vocabulary

- **Request:** one `MedicationRequest` a parent submits for one child for one date.
- **Consent:** the parent's authorization to administer (`consent: true` + `parentSignature`), required by the API.
- **Confirm modal:** the mobile Yes/No dialog that summarizes the request before the create call runs.
- **Status:** `pending | administered | skipped | cancelled`.
- **Active child:** the parent's selected child (`useCurrentChild`); the form defaults to it but the parent can switch among their children (`medications.children`).

## 4. API — already exists, no backend work required

All consumed via the typed `orpc` client:

- **`medications.children({ centerId? })` → `{ children: MedicationChild[] }`** — the children the parent may request for (id, name, centerId, classId/name). Drives the child picker + center scoping for uploads.
- **`medications.parentList({ childId?, date?, status? })` → `MedicationRequestSummary[]`** — the list.
- **`medications.detail({ requestId })` → `MedicationRequestDetail`** — full record incl. instructions, storage, special note, signature, staff outcome.
- **`medications.create(input)` → `MedicationRequestDetail`** — create. Input already requires `consent: z.literal(true)` and `parentSignature` (min 1), plus `childId`, `requestedForDate`, `symptoms`, `medicineName`, `medicationType`, `dosage`, `medicationTime`; optional `medicationCount`, `storageMethod`, `instructions`, `specialNote`, `photoMediaAssetId`, `photoCaption`.
- **`medications.cancel({ requestId })` → `MedicationRequestDetail`** — parent cancels a pending request.
- Media upload reuses **`media.createUploadUrl` / `media.completeUpload`** (purpose `"medication"`), as the web composer does.

**Conclusion:** no contract/schema/service changes. The consent requirement is already in the contract — mobile just has to collect and send it.

## 5. Routes & navigation

Add a dedicated route group (mirroring `app/attendance`, `app/meals`):

- `app/medications/index.tsx` — list.
- `app/medications/new.tsx` — request form.
- `app/medications/[id].tsx` — detail.

Changes:

- Update the feature tile route in [`constants/data.ts`](../../packages/mobile/constants/data.ts) from `/feature/medications` to `/medications`, and drop `medications` from the `[key].tsx` placeholder `ICONS` map.
- Register the three screens in [`app/_layout.tsx`](../../packages/mobile/app/_layout.tsx) `Stack` (header hidden globally; screens render their own header like the other detail screens).
- List → `new` via a header "+" / FAB; list row → `[id]`; `new` success → replace to `[id]`.

## 6. Data layer (mobile)

Add `packages/mobile/data/medications.ts` (mirroring `data/notices.ts` — query + mutation + mappers):

- `useMedicationChildren()` → `medications.children({})`.
- `useMedicationRequests()` → `medications.parentList({})`, mapped to a `MedicationSummary` view model (status, child name, medicine, date label, time). Sort newest first.
- `useMedicationRequest(requestId)` → `medications.detail({ requestId })` mapped to `MedicationDetail`.
- `useCreateMedicationRequest()` → mutation over `medications.create`; on success invalidate the list key and return the new id for navigation.
- `useCancelMedicationRequest(requestId)` → mutation over `medications.cancel`; optimistic status flip to `cancelled`, invalidate detail + list.
- Add `queryKeys.medications.{ children, parentList, detail(id) }` to [`lib/query-keys.ts`](../../packages/mobile/lib/query-keys.ts).
- Reuse `lib/date.ts` for date/time labels (Uzbekistan time).

## 7. UI

Reuse the app's candy-pastel system and the patterns already built (screen header, `Card`, `Pill`, `SelectField`, `Loader`, `EmptyState`). Medications has no feature colour yet — use a calm clinical accent within the existing tokens (proposed **sky** for identity, **coral** reserved for the cancel/destructive action and the consent emphasis). Decision D5.

### 7.1 List (`/medications`)

- `ScreenHeader` (title from `nav.items.medications`) with a trailing "+" that pushes `/medications/new`.
- Rows: child name + medicine name (title), date + time (caption), and a **status chip** (pending = sunshine, administered = mint, skipped = muted/pill, cancelled = muted strikethrough). Tappable → detail.
- `EmptyState` ("No requests yet" + how to add one) when empty; `Loader` while pending.

### 7.2 New request (`/medications/new`)

A scrollable form (`KeyboardAvoidingView` + `ScrollView`) with field primitives (build small `FormField`/`FormTextArea`/`FormDateField` or reuse `SelectField`):

- **Child** — `SelectField` over `medications.children`, defaulting to the active child; shows class beneath.
- **Date** — date field, defaults to today.
- **Symptoms** (textarea, required).
- **Medicine name**, **Type**, **Dosage**, **Time to give** (text, required).
- **Count / frequency**, **Storage method** (text, optional).
- **Instructions**, **Special note** (textarea, optional).
- **Photo** (optional) — pick from library, upload via signed URL (purpose `medication`), then optional caption.
- **Parent signature** (text, required) — the parent's full name, as on web.
- **Consent** — a checkbox row: an "I agree" control with the consent text (D2). Required; the Submit action is blocked until it's checked.
- A sticky **Submit** button at the bottom.

Inline validation mirrors the web composer (`childRequired`, `symptomsRequired`, `medicineNameRequired`, `medicationTypeRequired`, `dosageRequired`, `medicationTimeRequired`, `parentSignatureRequired`, `consentRequired`) — surface the first failing message near the top or by the field.

### 7.3 Confirm-before-submit modal (the headline safeguard)

Tapping **Submit** does **not** call the API directly. It first validates the form, then opens a confirmation modal:

- A React Native `Modal` (custom, not `Alert.alert`) so it can show a **summary**: child, date, medicine name, dosage, and time to give — the safety-critical fields — plus a one-line restatement that the parent consents to administration.
- Two actions: **No** (dismiss, return to the form unchanged) and **Yes, submit** (run the create mutation).
- While the mutation is pending, the **Yes** button shows a spinner and is disabled; **No** is disabled too, so the request can't be double-submitted.
- On **success**: dismiss the modal, then `router.replace('/medications/[id]')` to the new request's detail (so Back returns to the list, not the form), with a brief success confirmation.
- On **error**: keep the modal open (or dismiss and show the error on the form), show the API error message, and re-enable the buttons so the parent can retry.

Why a custom modal over `Alert.alert`: the parent is authorizing a medical action, so restating *what* they're about to submit (not just "Are you sure?") is the point of the safeguard. ASCII sketch:

```
┌─────────────────────────────┐
│  Submit this request?       │
│                             │
│  Child     Aziza            │
│  Date      8 Jun 2026       │
│  Medicine  Paracetamol      │
│  Dosage    5 ml             │
│  Time      After lunch      │
│                             │
│  You confirm the center may │
│  give this medicine.        │
│                             │
│   [  No  ]   [ Yes, submit ]│
└─────────────────────────────┘
```

### 7.4 Detail (`/medications/[id]`)

- Coloured identity header (sky) with back.
- Status chip; a grouped facts card (child, date, medicine, type, dosage, time, count, storage); instructions / special note; the medicine photo if present; the parent signature; and, when staff have acted, the **outcome** (administered dose + staff note, or skipped reason + who/when).
- If `status === 'pending'`: a **Cancel request** action (coral) that opens its own Yes/No confirm modal before calling `medications.cancel`.

Quality floor: keyboard handling on the form, touch targets ≥ 44px, reduced-motion safe, error/empty states written as direction not mood.

## 8. Consent & confirmation — detail

- **Consent (data):** the API already requires `consent: true` and a non-empty `parentSignature`. Mobile collects both: the "I agree" checkbox sets `consent`, and the signature field sets `parentSignature`. Neither is optional; both are validated before the confirm modal opens.
- **Confirmation (UX):** purely a mobile front-end gate (§7.3). It does not change the payload — it only decides *when* `medications.create` runs. The same Yes/No pattern guards **Cancel** on the detail screen.
- The two are layered: a parent must (1) check consent, (2) pass validation, (3) tap Submit, (4) tap **Yes** in the modal — only then does the request go out.

## 9. i18n

- Mobile i18n does **not** yet load the `medications` namespace, but `packages/translations/src/locales/{uz,ru,en}/medications.json` already exist (used by web). Import them in [`packages/mobile/i18n/index.ts`](../../packages/mobile/i18n/index.ts) and add `medications` to `resources` + the `ns` array.
- Add a small set of **mobile-only keys** to `medications.json` (all three locales) for the confirm modal and list, e.g. `confirm.title`, `confirm.body`, `confirm.yes`, `confirm.no`, `confirm.fieldChild/Date/Medicine/Dosage/Time`, `cancelConfirm.*`, `list.empty`, reusing existing `composer.*` / `validation.*` / `detail.*` keys where they already exist.
- Ensure `nav.items.medications` exists for the header/tile (it already drives the shortcut label).

## 10. Decisions

- **D1 — Confirm modal is a custom RN `Modal`, not `Alert.alert`.** It must show the request summary, so it needs custom content. `Alert.alert` is reserved for trivial confirmations elsewhere.
- **D2 — Consent = checkbox + signature, reusing the API contract.** No new consent storage; we send `consent: true` and `parentSignature`. The checkbox gates Submit; the signature is a required text field (typed name, as on web).
- **D3 — Create + cancel only, no edit.** Matches the web/domain model.
- **D4 — Dedicated `app/medications/` routes**, tile route changed to `/medications`, placeholder entry removed. Consistent with attendance/meals.
- **D5 — Identity colour: sky for the feature, coral for destructive/consent emphasis.** Medications has no colour yet; pick a calm clinical one within existing tokens. Confirm with client.
- **D6 — Photo optional in MVP.** Supported (reuses media upload) but a parent can submit without it.
- **D7 — Signature is a typed name** (not a drawn signature pad) for MVP, matching web. A drawn-signature upgrade is a later option.

## 11. Implementation checklist

1. `lib/query-keys.ts` — add `medications.{ children, parentList, detail(id) }`.
2. `data/medications.ts` — children/list/detail queries, create + cancel mutations, view-model mappers.
3. Form primitives: `FormField`, `FormTextArea`, `FormDateField` (or reuse `SelectField`) under `components/ui/` or `components/medication/`.
4. `components/medication/confirm-submit-modal.tsx` — the Yes/No summary modal (reused shape for cancel).
5. `app/medications/index.tsx` — list + "+".
6. `app/medications/new.tsx` — form + consent + confirm modal + create.
7. `app/medications/[id].tsx` — detail + cancel (with confirm).
8. `constants/data.ts` route → `/medications`; remove `medications` from `[key].tsx` ICONS; register routes in `app/_layout.tsx`.
9. i18n: load the `medications` namespace in mobile; add the confirm-modal / list keys to `medications.json` (uz/ru/en).
10. Typecheck + lint; verify the full flow against real data (create → confirm Yes → detail; cancel → confirm; consent/validation blocking).

## 12. Open questions

- Confirm the feature identity colour (D5): sky, or something more clearly "medical" within the palette?
- Is the medicine photo expected in MVP, or deferred (D6)?
- Date field: reuse an existing mobile date control, or add a lightweight month/day picker? (No shared mobile `DatePicker` exists yet.)
- Should the confirm modal also appear for **cancel**, or is a simpler `Alert.alert` acceptable there?
- Typed signature vs drawn signature (D7) — keep typed for now?
