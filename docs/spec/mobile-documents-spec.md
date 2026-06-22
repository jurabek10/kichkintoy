# Mobile Student Documents Spec

> **API note:** the app API is oRPC-only and the documents backend **already exists** — schemas in `packages/shared/src/api/student-documents.ts`, contract in `packages/shared/src/api/orpc/student-documents.contract.ts`, service in `packages/api/src/student-documents/`. This feature is **mobile-frontend only**: it consumes the existing `studentDocuments.*` parent procedures via the typed `orpc` client + TanStack Query. The web implementation is in `packages/web/app/dashboard/documents/`; [`mobile-pickup-notices-spec.md`](./mobile-pickup-notices-spec.md) and [`mobile-medication-requests-spec.md`](./mobile-medication-requests-spec.md) are the closest mobile precedents. See [`../adding-a-feature.md`](../adding-a-feature.md) for conventions.

> Status: **planned**. The parent-facing student-documents (서류) flow on mobile: the center sends a parent a **form to complete for their child** (admission, medical/allergy, emergency contact, consent, file upload, or custom). The parent fills it in — across nine field types — **saves a draft** as they go, **submits**, and, if a teacher bounces it back, **fixes it and resubmits**. Staff create templates and review submissions on web (out of scope here). The mobile `Documents` tile currently routes to the generic placeholder ([`app/feature/[key].tsx`](../../packages/mobile/app/feature/%5Bkey%5D.tsx)); this spec replaces it with the real flow.

## 1. Product research summary

A kindergarten collects paperwork from parents: an admission form, a medical/allergy sheet, emergency contacts, consents, and supporting files. On web, staff build a **template** (an ordered list of typed fields), **send a request** to a center/class/child, and each targeted child gets a **submission** the parent completes. The parent answers the fields, attaches files, and submits; a teacher **accepts** it or returns it as **needs correction** with a note; the parent corrects and resubmits.

The hard, interesting part on mobile is the **dynamic form**: one screen must render nine field types well on a phone, save progress, and make institutional paperwork feel finishable rather than daunting. The web's field renderer is intentionally minimal (single/multi-choice, phone, and signature all fall through to a plain text box); mobile can render each type natively and is the better surface for this — most parents do this on their phone.

## 2. Scope

In scope (MVP, parent role, mobile):

- **List** — the parent's document submissions across their children, **grouped by what needs action**, with status.
- **Fill & submit** — a dynamic form rendering all nine field types, with a **save-draft** and a **submit**.
- **Correction loop** — a returned submission shows the teacher's note prominently and is editable again.
- **Files** — upload images/PDFs for `file` fields (reuses the signed-upload flow); view already-uploaded attachments.
- Localised (uz / ru / en), Uzbekistan-time rendering.

Out of scope (MVP):

- Staff sides — templates, sending requests, reviewing submissions (web only).
- The **child safety summary** (`childSafetySummary`) read view — defer (§10 D6).
- **Drawn** signatures — the backend stores signature fields as plain answer text (not attachments), so a typed name is used; a drawn upgrade needs backend work (§10 D4).
- New backend procedures or schema changes (the API is sufficient — §4).

## 3. Vocabulary

- **Request:** what staff send (a template + audience + due date). The parent never sees the request object directly, only its resulting submission.
- **Submission:** one child's instance of a request — the thing a parent opens and completes. The unit of the parent UI.
- **Field:** one typed input in the form (`short_text | long_text | phone | date | single_choice | multi_choice | checkbox | signature | file`).
- **Answers:** a `{ fieldKey → value }` map. File answers are arrays of media-asset ids; everything else is text / boolean / string-array.
- **Status:** `not_started | in_progress | submitted | needs_correction | accepted | closed`. Editable while `not_started | in_progress | needs_correction`.

## 4. API — already exists, no backend work required

Parent procedures, via the typed `orpc` client:

- **`studentDocuments.parentRequests({ childId?, status? }?)` → `SubmissionSummary[]`** — the parent's submissions across their children (requestTitle, childName, templateType, status, dueDate, correctionNote, attachmentCount).
- **`studentDocuments.parentSubmissionDetail({ submissionId })` → `SubmissionDetail`** — full record: `fields`, current `answers`, `attachments`, `instructions`, `correctionNote`, status.
- **`studentDocuments.parentSaveDraft({ submissionId, answers, attachmentMediaAssetIds? })` → `SubmissionDetail`** — persist progress (no required-field check).
- **`studentDocuments.parentSubmit({ submissionId, answers, attachmentMediaAssetIds? })` → `SubmissionDetail`** — submit; the server enforces required fields (`file` requires a non-empty media array; others must be non-empty / true).
- Media upload reuses **`media.createUploadUrl` / `media.completeUpload`** (purpose `"student_document"`); download via **`media.getDownloadUrl`**.

**Storage notes that shape the UI (from the service):** only `file` fields become attachments — their answer value is an **array of media-asset uuids**. `signature` is *not* media-bearing; its answer is a string. `checkbox` is a boolean; `multi_choice` is a string array of option values; everything else is a string. Required validation runs only on **submit**.

## 5. Routes & navigation

A dedicated route group (mirroring `app/medications`, `app/pickups`); no parent-side "new" (staff create requests):

- `app/documents/index.tsx` — list.
- `app/documents/[id].tsx` — submission detail + form.

Changes:

- Point the tile route in [`constants/data.ts`](../../packages/mobile/constants/data.ts) from `/feature/documents` to `/documents`, and drop `documents` from the `[key].tsx` placeholder `ICONS` map.
- Register the two screens in [`app/_layout.tsx`](../../packages/mobile/app/_layout.tsx) `Stack`.
- List row → `[id]`; submit/draft stays on the detail and refreshes in place.

## 6. Data layer (mobile)

Add `packages/mobile/data/documents.ts` (mirroring `data/pickups.ts`):

- `useParentDocuments()` → `parentRequests()`, mapped to a `DocumentSummary` view model and split into action-state groups (§7.1). Revalidate on mount/focus.
- `useDocumentSubmission(submissionId)` → `parentSubmissionDetail` mapped to `DocumentDetail` (fields, answers, attachments, status, correctionNote, instructions). `staleTime: 0` + `refetchOnMount: 'always'` so a returned correction shows promptly.
- `useSaveDocumentDraft(submissionId)` / `useSubmitDocument(submissionId)` → mutations; on success invalidate detail + list.
- Add `queryKeys.documents.{ parentList, detail(id) }` to [`lib/query-keys.ts`](../../packages/mobile/lib/query-keys.ts).
- **Generalise the upload helper:** [`lib/upload.ts`](../../packages/mobile/lib/upload.ts) hard-codes `purpose: 'medication'`. Add a `purpose` parameter (default keeps medication working) so documents can upload with `'student_document'`.

## 7. UI

Identity colour **mint** (`#DCF2E3` bg / `#46B06A` ink) — the feature's existing tile colour and the natural "completed / verified" tone for paperwork. Reuse the candy-pastel primitives already built (`ScreenHeader`, `Card`, `SelectField`, `FormField`/`FormDateField`, `ConfirmModal`, `SignaturePad`, `Loader`, `EmptyState`, `SignedImage`).

### 7.1 List (`/documents`) — grouped by action, not by date

Documents are **tasks, not a timeline**, so group by what the parent must do (this is the structural signature — order encodes urgency):

- **Needs your attention** — `needs_correction`, `not_started`, `in_progress` (correction first; it's the loud one).
- **Submitted** — `submitted`, `accepted`, `closed`.

Each row: request title (bold), `childName · templateType`, a **status chip**, and — for `needs_correction` — a one-line coral note preview. `EmptyState` ("No documents to fill", invite to relax) when empty.

Status chips: `needs_correction` = coral (action), `not_started` = pill/muted, `in_progress` = sunshine, `submitted` = sky, `accepted` = mint + check, `closed` = pill/muted.

### 7.2 Submission detail & form (`/documents/[id]`) — the dynamic renderer

- Mint identity header (back), title, `childName · className`, a due-date pill, and the status chip.
- **Correction banner** (coral) when `correctionNote` is present — the teacher's note, stated plainly, at the very top.
- **Completion meter** (the signature element): "3 of 5 required done" with a slim mint progress bar that fills as required fields get a non-empty answer — turns a wall of fields into a finishable checklist. Each required field shows a small tick once satisfied.
- **Fields**, rendered by type (matrix below).
- A sticky footer with **Save draft** (secondary) and **Submit** (mint, primary). When not editable (`submitted | accepted | closed`) the form is read-only and the footer is replaced by a status line.

**Field renderer matrix** (`components/documents/field-editor.tsx`):

| Field type | Mobile control | Answer value |
|---|---|---|
| `short_text` | `FormField` | string |
| `long_text` | `FormField` multiline | string |
| `phone` | `FormField`, `keyboardType="phone-pad"` | string |
| `date` | date field (§10 D5) | `YYYY-MM-DD` string |
| `single_choice` | chip row / `SelectField` over `field.options` | option `value` string |
| `multi_choice` | multi-select chips | array of option `value`s |
| `checkbox` | checkbox row (label = `helpText` or `label`) | boolean |
| `signature` | typed-name `FormField` (§10 D4) | string |
| `file` | image/PDF picker → signed upload → thumbnails with remove | array of media uuids |

Each field shows its `label` (+ `*` when required) and `helpText`. `file` fields show existing `attachments` (filtered by `fieldKey`) via `SignedImage`/a file chip, plus newly uploaded ones; respect `maxFiles`.

### 7.3 Submit & correction flow

- **Save draft** persists `answers` and flips the status to `in_progress`; a brief "Saved" confirmation, stay on screen.
- **Submit** validates required fields client-side first (mirror the server: `file` needs ≥1 upload, others non-empty / checked), surfaces the first gap inline near the field, then calls `parentSubmit`. On success the form goes read-only with a "Submitted" state.
- A **needs_correction** submission is editable again; submitting clears the correction and returns it for review.

Quality floor: keyboard handling on a long form, touch targets ≥ 44px, autosave-friendly (don't lose typed answers on a background fetch — merge server answers under local edits), reduced-motion safe, errors written as direction.

## 8. i18n

- Mobile i18n does **not** yet load the `documents` namespace, but `packages/translations/src/locales/{uz,ru,en}/documents.json` already exist (used by web; they cover `status.*`, `templateType.*`, `detail.*`, `empty.*`, `fields.*`, `toast.*`). Import them in [`packages/mobile/i18n/index.ts`](../../packages/mobile/i18n/index.ts) and add `documents` to `resources` + the `ns` array.
- Add a small set of **mobile-only keys**: list group headers (`group.attention`, `group.submitted`), the completion meter (`detail.progress` = "{{done}} of {{total}} done"), field affordances (`field.addFile`, `field.choose`, `field.selectMany`, `field.signedHint`), and submit validation (`validation.required`, `validation.fileRequired`). Reuse existing `detail.*` / `status.*` / `templateType.*` keys.
- `nav.items.documents` already exists (drives the tile label).

## 9. Decisions

- **D1 — Parent fills only; no create.** Staff send requests; the parent screen is list + fill + submit + correct. Simpler route set than pickups (no `new`).
- **D2 — List grouped by action state, not date.** Documents are tasks; "Needs your attention" vs "Submitted" is the useful cut, with `needs_correction` surfaced first.
- **D3 — Native renderers for every field type.** Mobile renders all nine properly (choice chips, checkbox row, date field, file picker), going beyond the web's text-box fallback — this is where the work is.
- **D4 — Signature = typed full name.** The backend stores signature answers as text, not attachments; a drawn signature would be undownloadable without backend changes (same gap fixed for medications). Typed name for MVP; drawn signature is a later backend task.
- **D5 — A general date control is needed.** The existing `FormDateField` only spans today→+14 days; document dates (DOB, expiry) are arbitrary. Reuse a broader date picker or add a light month/year picker. Open question.
- **D6 — Defer the child safety summary** (`childSafetySummary`) read view; revisit after the core fill/submit flow ships.
- **D7 — Identity colour mint**, matching the existing tile and the "completed paperwork" tone; coral is reserved for the correction banner and the `needs_correction` chip.

## 10. Implementation checklist

1. `lib/query-keys.ts` — add `documents.{ parentList, detail(id) }`.
2. `lib/upload.ts` — add a `purpose` parameter (default `'medication'`); documents pass `'student_document'`.
3. `data/documents.ts` — list (+ action grouping) and detail queries, save-draft + submit mutations, view-model mappers, completion helper.
4. `components/documents/` — `DocumentStatusChip`, `CompletionMeter`, `FieldEditor` (the nine-type renderer), a file-field uploader, and a list row.
5. A general date control (D5).
6. `app/documents/index.tsx` — grouped list.
7. `app/documents/[id].tsx` — form, completion meter, correction banner, save-draft/submit, read-only state.
8. `constants/data.ts` tile route → `/documents`; remove `documents` from `[key].tsx` ICONS; register routes in `app/_layout.tsx`.
9. i18n: load the `documents` namespace; add the mobile-only keys to `documents.json` (uz/ru/en).
10. Typecheck + lint; verify the full flow against real data (fill each field type → save draft → submit; teacher returns it → correction banner → fix → resubmit; file upload + view).

## 11. Open questions

- Date control (D5): reuse a broader-range version of `FormDateField`, or add a dedicated month/year date picker?
- File fields: cap to images for MVP (reusing the medication image picker), or support PDF too via a document picker?
- Should `submitted`/`accepted` submissions stay visible in the list indefinitely, or collapse older "done" ones behind a toggle?
- Completion meter: count only required fields (proposed), or all fields?
- Signature (D4): keep typed-name for now, or is a drawn signature important enough to schedule the backend change that registers it as an attachment?
