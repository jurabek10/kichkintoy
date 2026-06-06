# Medication Requests / Administration Reports Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/medications.ts`, add procedures to `packages/shared/src/api/orpc/medications.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `medications` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style `투약의뢰서` / medication request feature: parents submit medicine instructions and consent, then center staff confirm administration with a report.

## 1. Product Research Summary

Kidsnote's public medication guide describes a two-step flow:

- Parent opens **Medication Request** and creates a request.
- Required parent fields include medication date, symptoms, medication type/name, dosage, and medication time.
- Optional parent photo support is intentionally narrow: one photo only, no video, with a short photo description.
- Parent signature is required before sending the request.
- The request is delivered to the director and the child's class teacher.
- Parent can see whether the request is only sent or completed.
- After staff administer medicine, the bottom of the detail screen shows the center's medication report.
- The latest request can be loaded to make repeat requests faster.
- Parent can delete a submitted request only before the center completes the medication report.

Kichkintoy should copy the safety model and the communication pattern, but localize the UX for Uzbekistan and keep media private through MinIO signed URLs.

Sources researched:

- Kidsnote parent medication guide: `https://www.with-kidsnote.com/guide/parentsmedication/app`
- Kidsnote public website: `https://www.kidsnote.com/`
- Korean childcare operation guide examples that require Kidsnote medication request/report usage.

## 2. Scope

This spec defines medication requests from parent to center, plus teacher/director administration reports.

In scope:

- Parent creates a medication request for their linked child.
- Parent adds symptoms, medicine details, dosage, time, storage method, special note, and signature.
- Parent optionally uploads one medication photo through MinIO.
- Teacher/director sees today's medication requests.
- Teacher/director marks a request as administered or skipped.
- Parent sees request status and staff report.
- Notifications are sent when a request is submitted and when it is completed.
- Audit logs are written for create, cancel/delete, administer, and skip actions.

Out of scope for MVP:

- Doctor prescription verification.
- Recurring medicine schedules.
- Inventory of medicine stored at school.
- Multiple photos or video.
- AI medicine recognition.
- Push reminder alarms by time.
- Exportable legal PDF forms.

## 3. Vocabulary

- **Medication request:** parent-submitted consent and instruction for one child on one date.
- **Medication report:** staff completion record after administering or skipping medication.
- **Medication status:** current lifecycle state of the request.
- **Medication photo:** optional one private image uploaded by parent, usually a photo of the medicine package.
- **Parent signature:** typed signature in MVP; handwritten signature can be added later.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create request | No | No | No | Own child only |
| View parent request list | No | No | No | Own children only |
| View staff request list | All center children | Assigned class children | No | No |
| View request detail | Center requests | Assigned class requests | No | Own child only |
| Upload request photo | No | No | No | Own child only |
| Administer medicine | Yes | Assigned class children | No | No |
| Mark skipped | Yes | Assigned class children | No | No |
| Delete/cancel pending request | No | No | No | Own request before staff report |

Authorization rules:

- Parent access is based on `child_guardians.user_id` and the child's active enrollment.
- Teacher access is based on active `teacher_class_assignments`.
- Director/organization owner can manage all center medication requests.
- Parent cannot see requests for another child, class, or center.
- Staff cannot complete requests outside their center/class scope.
- Media download authorization follows the medication request object-level permission.

## 5. User Flows

### 5.1 Parent Creates Medication Request

1. Parent opens **Medication**.
2. Parent clicks **New request**.
3. Parent selects child.
4. Parent selects medication date.
5. Parent enters symptoms.
6. Parent fills medicine fields:
   - medicine name/type;
   - dosage;
   - medication time;
   - medication count/frequency;
   - storage method;
   - special note/instructions.
7. Parent optionally uploads one medicine photo.
8. Parent optionally adds a photo caption, max 50 characters.
9. Parent checks consent statement.
10. Parent types signature.
11. Parent submits request.
12. System notifies director and the assigned class teacher(s).

### 5.2 Staff Completes Medication Report

1. Teacher/director opens **Medication**.
2. Default list shows today's pending requests.
3. Staff opens a request.
4. Staff reviews parent instructions and photo.
5. Staff chooses:
   - **Administered**: record time, administered dose, and optional note.
   - **Skipped**: record reason and optional note.
6. System marks the request complete.
7. System notifies the parent.

### 5.3 Parent Checks Completion

1. Parent opens **Medication**.
2. List shows request status:
   - `pending`: sent to center, no report yet.
   - `administered`: medicine given, report available.
   - `skipped`: medicine not given, reason available.
   - `cancelled`: parent cancelled before staff completion.
3. Parent opens detail to see staff report.

### 5.4 Parent Cancels Pending Request

1. Parent opens a pending request.
2. Parent clicks **Cancel request**.
3. System asks for confirmation.
4. Request becomes `cancelled`.

Rules:

- Only parent-owned pending requests can be cancelled.
- Once staff records `administered` or `skipped`, cancellation is blocked.

### 5.5 Load Latest Request Later

Not required in MVP UI, but schema should not block it.

Future flow:

1. Parent opens new request.
2. If previous medication request exists for the child, show **Load latest**.
3. Copy medicine fields, instructions, storage method, and note.
4. Do not copy old date or old signature automatically.

## 6. Data Model

The existing `medication_requests` model can be extended instead of creating a separate table.

Add or verify fields:

```text
medication_requests
- id uuid pk
- center_id uuid
- class_id uuid nullable
- child_id uuid
- parent_user_id uuid
- requested_for_date date
- symptoms text
- medicine_name text
- medication_type text
- dosage text
- medication_time text
- medication_count text nullable
- storage_method text nullable
- instructions text nullable
- special_note text nullable
- photo_media_asset_id uuid nullable
- photo_caption text nullable
- parent_signature text
- status text default pending
- reviewed_by_user_id uuid nullable
- reviewed_at timestamptz nullable
- administered_by_user_id uuid nullable
- administered_at timestamptz nullable
- administered_dose text nullable
- staff_note text nullable
- skipped_reason text nullable
- created_at timestamptz
- updated_at timestamptz
```

Recommended indexes:

```text
@@index([centerId, requestedForDate])
@@index([classId, requestedForDate])
@@index([childId, requestedForDate])
@@index([parentUserId, requestedForDate])
@@index([status, requestedForDate])
```

Status values:

```text
pending
administered
skipped
cancelled
```

## 7. Media And MinIO

Medication photos are sensitive because they can expose child health information. They must never be public.

Rules:

- Reuse current MinIO signed upload/download flow.
- Add media purpose: `medication`.
- Parent can upload only for a child they guard.
- MVP allows exactly one request photo.
- Image only:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/heic`
  - `image/heif`
- No video for medication requests.
- Download URL is generated only if the user can view the medication request.
- Staff and parent see the image through signed URL refresh, same as albums/meals.

## 8. oRPC Contract

Add `medications` contract group.

Procedures:

```text
medications.children(input: { centerId? }) -> MedicationAudienceResponse
medications.parentList(input?: { childId?, date?, status? }) -> MedicationRequestSummary[]
medications.staffList(input: { centerId, date?, status? }) -> MedicationRequestSummary[]
medications.detail(input: { requestId }) -> MedicationRequestDetail
medications.create(input: CreateMedicationRequestInput) -> MedicationRequestDetail
medications.cancel(input: { requestId }) -> MedicationRequestDetail
medications.complete(input: { requestId, body: CompleteMedicationRequestInput }) -> MedicationRequestDetail
medications.latestForChild(input: { childId }) -> MedicationRequestDetail | null
```

MVP can skip `latestForChild` UI, but the procedure is useful and small if easy.

## 9. Shared Schemas

Create `packages/shared/src/api/medications.ts`.

Core enums:

```ts
medicationStatusValues = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
]
```

Create input schemas:

- `createMedicationRequestInputSchema`
- `completeMedicationRequestInputSchema`
- `medicationListInputSchema`
- `medicationDetailInputSchema`

Create output schemas:

- `medicationChildSchema`
- `medicationMediaSchema`
- `medicationRequestSummarySchema`
- `medicationRequestDetailSchema`
- `medicationListResponseSchema`
- `medicationAudienceResponseSchema`

Validation rules:

- `symptoms`, `medicineName`, `medicationType`, `dosage`, `medicationTime`, `parentSignature` are required.
- `photoCaption` max length: 50.
- `photoMediaAssetId` optional but must belong to center and uploader.
- `consent` must be `true`.
- `complete.status` must be only `administered` or `skipped`.
- `skipped` requires `skippedReason`.
- `administered` should default `administeredAt` to now when omitted.

## 10. Backend Service Rules

Create:

```text
packages/api/src/medications/medications.module.ts
packages/api/src/medications/medications.service.ts
packages/api/src/orpc/routers/medications.router.ts
```

Service responsibilities:

- Resolve parent child access.
- Resolve staff center/class access.
- Find active enrollment for child.
- Create request with center/class snapshot from active enrollment.
- Validate optional photo asset ownership and purpose.
- Notify center staff on create.
- Notify parent on completion.
- Audit all mutations.
- Return parsed shared response schemas.

Create audit actions:

```text
medication_request.created
medication_request.cancelled
medication_request.administered
medication_request.skipped
```

Notification types:

```text
medication_request.created
medication_request.administered
medication_request.skipped
```

## 11. Frontend Routes

Add dashboard routes:

```text
packages/web/app/dashboard/medications/page.tsx
packages/web/app/dashboard/medications/new/page.tsx
packages/web/app/dashboard/medications/[requestId]/page.tsx
```

Add components:

```text
packages/web/app/dashboard/medications/_components/parent-medications.tsx
packages/web/app/dashboard/medications/_components/staff-medications.tsx
packages/web/app/dashboard/medications/_components/medication-card.tsx
packages/web/app/dashboard/medications/_components/medication-composer.tsx
packages/web/app/dashboard/medications/_components/medication-detail-screen.tsx
packages/web/app/dashboard/medications/_components/signed-medication-image.tsx
```

Add dashboard navigation:

- Director: `Medication`
- Teacher: `Medication`
- Parent: `Medication`

## 12. UI Requirements

### Parent List

Default:

- Today's requests.
- Child filter if parent has multiple children.
- Status badge.
- Medicine name.
- Medication time.
- Child/class.

Actions:

- New request.
- Open detail.

### Parent Composer

Fields:

- Child selector.
- Date.
- Symptoms.
- Medicine name/type.
- Dosage.
- Medication time.
- Count/frequency.
- Storage method.
- Instructions.
- Special note.
- One photo upload.
- Photo caption, only enabled when photo exists.
- Consent checkbox.
- Parent signature.

Submit button text:

```text
Send request
```

### Staff List

Default:

- Today's pending requests.
- Date filter.
- Status filter.
- Card grouped visually by child/class.

Actions:

- Open detail.

### Detail Screen

Parent request section:

- Child/class.
- Date/time.
- Symptoms.
- Medicine details.
- Photo.
- Signature.
- Created time.

Staff report section:

- Pending state: staff action controls.
- Administered state: administered time, dose, staff, note.
- Skipped state: skipped reason, staff, note.

Staff action controls:

- Status segmented control: administered/skipped.
- Administered time.
- Administered dose.
- Staff note.
- Skipped reason.

## 13. Security And Safety

Medication data is health-adjacent data. Treat it as sensitive.

Requirements:

- All list/detail routes must be object-authorized.
- Parent cannot enumerate request IDs outside their children.
- Staff cannot enumerate center/class outside assignment.
- Media download checks must use medication request permissions.
- No public MinIO bucket access.
- No medication data in logs.
- Audit all mutations.
- Use generic not-found/forbidden behavior where possible to reduce ID probing.
- Parent cancellation blocked after staff report.
- Completion blocked for cancelled requests.

## 14. Notifications

On create:

- Notify center director(s).
- Notify assigned class teacher(s).

Message:

```text
New medication request
{childName} has a medication request for {requestedForDate}.
```

On administered:

```text
Medication administered
{childName}'s medication was administered.
```

On skipped:

```text
Medication skipped
{childName}'s medication was not administered. Please check the note.
```

## 15. Acceptance Criteria

- Parent can create a medication request for an active linked child.
- Parent cannot create for another child.
- Parent can upload exactly one medication photo via MinIO.
- Parent can view their submitted request.
- Staff can see today's request for assigned class/center.
- Unassigned teacher cannot see or complete request.
- Director can see and complete all center requests.
- Staff can mark request administered.
- Staff can mark request skipped with reason.
- Parent sees staff report after completion.
- Parent can cancel pending request.
- Parent cannot cancel after completion.
- Download URL for medication photo works only for authorized users.
- Shared schemas contain no `z.unknown()` for request/response data.
- TanStack Query keys are specific and invalidated on create/cancel/complete.

## 16. E2E Test Plan

Use local Postgres + MinIO + API + web.

Happy path:

1. Parent logs in.
2. Parent opens Medication.
3. Parent creates request with photo and signature.
4. Teacher/director logs in.
5. Staff opens Medication.
6. Staff sees request.
7. Staff marks administered.
8. Parent logs in.
9. Parent sees administered report.

Permission path:

1. Parent A creates request for Child A.
2. Parent B cannot fetch request detail.
3. Unassigned teacher cannot fetch request detail.
4. Authorized parent/staff can fetch signed download URL.
5. Unauthorized user cannot fetch signed download URL.

Cancellation path:

1. Parent creates request.
2. Parent cancels before report.
3. Staff no longer sees it as pending.
4. Parent cannot cancel a completed request.

## 17. Implementation Order

1. Update spec and design docs.
2. Add shared schemas and oRPC contract.
3. Extend Prisma model/migration.
4. Add API module/service/router.
5. Add media authorization for medication photos.
6. Add query keys and format labels.
7. Add dashboard routes/components.
8. Run Prisma generate/migrate.
9. Run typecheck/build.
10. Run browser E2E with MinIO upload/download.
