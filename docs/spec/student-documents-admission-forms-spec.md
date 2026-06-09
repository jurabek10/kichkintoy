# Student Documents / Admission Forms Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/student-documents.ts`, add procedures to `packages/shared/src/api/orpc/student-documents.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `studentDocuments` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style electronic documents / admission paperwork feature. Kidsnote presents e-Docu+ as the administrative layer after daily communication: safely collect child information, request required documents, track submissions, and print/export when the center needs paper records.

## 1. Product Research Summary

Kidsnote's public site describes an **e-Docu+** product for center administration:

- Admission document management for collecting child information.
- Safe storage and printing of submitted documents.
- Fast non-face-to-face document requests.
- Submission status tracking for required center documents.
- Observation / development records that can reuse report and album content.

For Kichkintoy, the first version should focus on the highest-value Uzbekistan kindergarten workflow: admission forms and child documents. This should not become a generic file dump. It should be a structured, permissioned document request system that keeps children's sensitive records private.

Sources researched:

- Kidsnote main site: `https://www.kidsnote.com/`
- Kidsnote English page: `https://www.kidsnote.com/en`
- Kidsnote Japan feature page: `https://www.kidsnote.com/jp/`
- Kidsnote FAQ menu list: `https://www.with-kidsnote.com/faq/teacher_08`

## 2. Scope

This spec defines the **Student Documents / Admission Forms** feature:

- Director creates reusable document templates.
- Director sends document requests to a center, class, or child.
- Parent fills required fields and uploads private document files/photos.
- Director reviews submissions, accepts them, or requests correction.
- Teacher can view limited child safety information for assigned classes.
- All document files use the existing MinIO signed upload/download flow.

In scope for MVP:

- Admission form request.
- Medical/allergy information form.
- Emergency contact form.
- Consent/agreement form.
- Passport/birth certificate/photo document upload request.
- Custom document request.
- Parent submission workflow.
- Director review workflow.
- Submission status dashboard.
- Secure file upload/download through MinIO.
- Audit logs and notifications.

Out of scope for MVP:

- Government e-signature integration.
- OCR / automatic document extraction.
- PDF form generation with exact printable templates.
- Multi-step legal document signing.
- Public share links.
- Online payment or tuition documents.
- Teacher staff document management.

## 3. Goals

- Replace paper admission collection with a structured app workflow.
- Give directors a clear dashboard of missing/submitted/reviewed documents.
- Make parent submission simple on mobile.
- Protect sensitive child documents from public URLs.
- Keep teachers limited to operational child safety info, not full private records.
- Build the base for future electronic documents, printable PDFs, and development records.

## 4. Vocabulary

- **Document template:** reusable definition created by director, for example "Admission Form" or "Medical Information".
- **Document request:** a template sent to a target audience with due date and instructions.
- **Document submission:** one parent's response for one child.
- **Field answer:** structured parent-entered value inside a submission.
- **Attachment:** private uploaded file/photo connected to a submission.
- **Review status:** director decision: accepted or needs correction.
- **Safety summary:** limited child info staff may need during daily operation, for example allergies and emergency contacts.

## 5. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create template | Yes | No | No | No |
| Edit template | Yes | No | No | No |
| Archive template | Yes | No | No | No |
| Send document request | Yes | No | No | No |
| View center request dashboard | Yes | No | No | No |
| View class submission status | Yes | Assigned class summary only | No | No |
| View full submission | Yes | No by default | No | Own child only |
| View safety summary | Yes | Assigned class children | No | Own child only |
| Submit document | No | No | No | Own child only |
| Upload document attachment | No | No | No | Own child only |
| Review submission | Yes | No | No | No |
| Request correction | Yes | No | No | No |
| Download attachment | Yes | Limited safety attachments only if enabled | No | Own child only |
| Delete request/template | Archive only | No | No | No |

Authorization rules:

- Director access is based on `user_roles` with `director` or `organization_owner` scoped to the center/organization.
- Teacher access is based on active `teacher_class_assignments`.
- Parent access is based on `child_guardians.user_id` and the child's active enrollment.
- Parent can never see another child's submission.
- Teacher cannot see full legal/admission uploads unless a future permission explicitly allows it.
- Every attachment download must re-check object-level permission before returning a signed MinIO URL.

## 6. MVP User Flows

### 6.1 Director Creates Template

1. Director opens **Documents**.
2. Clicks **New template**.
3. Chooses template type:
   - Admission form
   - Medical/allergy form
   - Emergency contact form
   - Consent form
   - File upload request
   - Custom
4. Enters title and parent-facing instructions.
5. Adds fields:
   - short text
   - long text
   - phone
   - date
   - single choice
   - multi choice
   - checkbox consent
   - file upload
6. Marks fields required/optional.
7. Saves as draft or active.

### 6.2 Director Sends Document Request

1. Director opens an active template.
2. Clicks **Send request**.
3. Chooses target:
   - Whole center
   - Selected class
   - Selected child
4. Sets due date.
5. Adds optional note.
6. Sends request.
7. System creates pending submission rows for matching active children.
8. Parents receive notification.

### 6.3 Parent Submits Documents

1. Parent opens **Documents**.
2. Parent sees required documents grouped by child.
3. Parent opens a request.
4. Parent fills form fields.
5. Parent uploads required files/photos using signed MinIO upload.
6. Parent submits.
7. Submission status becomes `submitted`.
8. Director receives notification.

### 6.4 Director Reviews Submission

1. Director opens **Documents** dashboard.
2. Filters by request, class, child, or status.
3. Opens submission detail.
4. Reviews answers and attachments.
5. Chooses:
   - **Accept**: status becomes `accepted`.
   - **Needs correction**: director writes correction note, status becomes `needs_correction`.
6. Parent receives notification.
7. Parent can resubmit corrected fields/attachments.

### 6.5 Teacher Views Safety Summary

1. Teacher opens assigned class.
2. Teacher opens child safety summary.
3. Teacher sees only operational fields:
   - allergies
   - medical cautions
   - emergency contacts
   - pickup restrictions if later connected
4. Teacher does not see passport/birth certificate uploads.

## 7. Document Types

MVP should seed these default templates per center or expose them as quick-start presets:

### 7.1 Admission Form

Recommended fields:

- Child full name
- Date of birth
- Gender
- Home address
- Parent/guardian names
- Parent phone numbers
- Emergency contact
- Previous kindergarten, optional
- Notes for center

### 7.2 Medical / Allergy Form

Recommended fields:

- Allergies
- Chronic conditions
- Medicine restrictions
- Food restrictions
- Doctor/clinic contact, optional
- Emergency medical consent checkbox

### 7.3 Emergency Contact Form

Recommended fields:

- Primary contact name/phone/relation
- Secondary contact name/phone/relation
- Authorized pickup persons
- People not authorized to pick up child

### 7.4 Consent Form

Recommended fields:

- Consent text
- Required checkbox
- Typed parent signature
- Submitted at timestamp

### 7.5 File Upload Request

Recommended fields:

- Document type
- Required upload slot
- Optional note

Examples:

- Birth certificate
- Parent passport/ID
- Child photo
- Medical certificate
- Vaccination record, if used by center

## 8. Status Model

### 8.1 Template Status

- `draft` - editable, not sendable.
- `active` - can be sent.
- `archived` - hidden from new requests, old submissions remain visible.

### 8.2 Request Status

- `draft` - created but not sent.
- `sent` - visible to parents.
- `closed` - no new submissions allowed.
- `archived` - hidden from ordinary lists.

### 8.3 Submission Status

- `not_started` - parent has not opened/submitted.
- `in_progress` - parent saved draft.
- `submitted` - parent submitted for review.
- `needs_correction` - director requested fixes.
- `accepted` - director accepted.
- `closed` - request closed without completion.

Status transitions:

```text
not_started -> in_progress -> submitted -> accepted
submitted -> needs_correction -> submitted
not_started/in_progress/submitted/needs_correction -> closed
```

Accepted submissions should not be editable by parent unless director reopens them.

## 9. Data Model

Use Prisma models with snake_case mapped table names to match the project style. Keep JSON field schemas validated with Zod at the API boundary.

### 9.1 `student_document_templates`

```sql
CREATE TABLE student_document_templates (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
```

Recommended indexes:

```sql
CREATE INDEX student_document_templates_center_status_idx
  ON student_document_templates(center_id, status);
```

### 9.2 `student_document_requests`

```sql
CREATE TABLE student_document_requests (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  template_id UUID NOT NULL REFERENCES student_document_templates(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL, -- center | class | child
  title TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Recommended indexes:

```sql
CREATE INDEX student_document_requests_center_status_due_idx
  ON student_document_requests(center_id, status, due_date);
```

### 9.3 `student_document_request_classes`

```sql
CREATE TABLE student_document_request_classes (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES student_document_requests(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  UNIQUE(request_id, class_id)
);
```

### 9.4 `student_document_request_children`

```sql
CREATE TABLE student_document_request_children (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES student_document_requests(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  UNIQUE(request_id, child_id)
);
```

### 9.5 `student_document_submissions`

```sql
CREATE TABLE student_document_submissions (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES student_document_requests(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  child_id UUID NOT NULL REFERENCES children(id),
  submitted_by_user_id UUID REFERENCES users(id),
  reviewed_by_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'not_started',
  answers JSONB NOT NULL DEFAULT '{}',
  correction_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, child_id)
);
```

Recommended indexes:

```sql
CREATE INDEX student_document_submissions_center_status_idx
  ON student_document_submissions(center_id, status);

CREATE INDEX student_document_submissions_child_status_idx
  ON student_document_submissions(child_id, status);
```

### 9.6 `student_document_attachments`

```sql
CREATE TABLE student_document_attachments (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES student_document_submissions(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  field_key TEXT NOT NULL,
  original_filename TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Recommended indexes:

```sql
CREATE INDEX student_document_attachments_submission_idx
  ON student_document_attachments(submission_id, position);
```

## 10. Field Schema

Store template fields as JSONB, but validate with shared Zod schemas.

Example field:

```ts
type StudentDocumentField = {
  key: string;
  label: string;
  type:
    | "short_text"
    | "long_text"
    | "phone"
    | "date"
    | "single_choice"
    | "multi_choice"
    | "checkbox"
    | "signature"
    | "file";
  required: boolean;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  maxFiles?: number;
};
```

Rules:

- `key` must be stable and unique inside the template.
- `file` fields must use `media_assets`.
- `signature` is typed text in MVP.
- Parent answers must not include unknown field keys.
- Required fields must be present before submission.
- File answers require completed media assets.

## 11. Shared API Schemas

Create `packages/shared/src/api/student-documents.ts`.

Recommended exports:

- `studentDocumentTemplateTypeSchema`
- `studentDocumentTemplateStatusSchema`
- `studentDocumentRequestStatusSchema`
- `studentDocumentSubmissionStatusSchema`
- `studentDocumentTargetTypeSchema`
- `studentDocumentFieldSchema`
- `studentDocumentAnswerValueSchema`
- `studentDocumentTemplateSummarySchema`
- `studentDocumentRequestSummarySchema`
- `studentDocumentSubmissionSummarySchema`
- `studentDocumentSubmissionDetailSchema`
- `createStudentDocumentTemplateInputSchema`
- `updateStudentDocumentTemplateInputSchema`
- `sendStudentDocumentRequestInputSchema`
- `parentSaveStudentDocumentDraftInputSchema`
- `parentSubmitStudentDocumentInputSchema`
- `reviewStudentDocumentSubmissionInputSchema`

Avoid `z.unknown()`. Use strict unions for field types and answer values:

```ts
const studentDocumentAnswerValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
  z.array(uuidSchema),
  z.null(),
]);
```

For maps, use:

```ts
z.record(z.string().min(1), studentDocumentAnswerValueSchema)
```

## 12. oRPC Contract

Create `packages/shared/src/api/orpc/student-documents.contract.ts`.

Recommended procedures:

```ts
export const studentDocumentsContract = {
  staffTemplates: oc.input(staffTemplatesInputSchema).output(templateListSchema),
  createTemplate: oc.input(createTemplateInputSchema).output(templateDetailSchema),
  updateTemplate: oc.input(updateTemplateInputSchema).output(templateDetailSchema),
  archiveTemplate: oc.input(templateIdInputSchema).output(templateDetailSchema),

  staffRequests: oc.input(staffRequestsInputSchema).output(requestListSchema),
  requestDetail: oc.input(requestIdInputSchema).output(requestDetailSchema),
  sendRequest: oc.input(sendRequestInputSchema).output(requestDetailSchema),
  closeRequest: oc.input(closeRequestInputSchema).output(requestDetailSchema),

  staffSubmissions: oc.input(staffSubmissionsInputSchema).output(submissionListSchema),
  submissionDetail: oc.input(submissionIdInputSchema).output(submissionDetailSchema),
  reviewSubmission: oc.input(reviewSubmissionInputSchema).output(submissionDetailSchema),

  parentRequests: oc.input(parentRequestsInputSchema).output(parentRequestListSchema),
  parentSubmissionDetail: oc.input(submissionIdInputSchema).output(submissionDetailSchema),
  parentSaveDraft: oc.input(parentSaveDraftInputSchema).output(submissionDetailSchema),
  parentSubmit: oc.input(parentSubmitInputSchema).output(submissionDetailSchema),

  childSafetySummary: oc.input(childSafetySummaryInputSchema).output(childSafetySummarySchema),
};
```

## 13. Backend Service Rules

Create:

- `packages/api/src/student-documents/student-documents.module.ts`
- `packages/api/src/student-documents/student-documents.service.ts`
- `packages/api/src/orpc/routers/student-documents.router.ts`

Service responsibilities:

- Resolve director center scope.
- Resolve teacher assigned class scope.
- Resolve parent child scope.
- Validate target children when sending a request.
- Create missing submission rows on send.
- Validate answer payload against template fields.
- Validate media attachment ownership and completion.
- Generate signed MinIO download URLs only after permission check.
- Write audit logs for create/update/send/submit/review/download.
- Send notifications to parents and directors.

Do not trust client-provided `centerId`, `classIds`, `childIds`, or `mediaAssetIds` without checking ownership/scope.

## 14. MinIO Storage Rules

Reuse the existing media system:

- Parent requests upload URL through `media.createUploadUrl`.
- Parent uploads directly to MinIO.
- Parent calls `media.completeUpload`.
- Parent attaches completed `mediaAssetId` to document submission field.
- Staff/parent detail requests return attachment metadata and request signed download URLs when needed.

Storage object keys should include a private prefix:

```text
student-documents/{centerId}/{childId}/{submissionId}/{mediaAssetId}/{filename}
```

Security rules:

- No public bucket access.
- No permanent URLs in DB.
- Signed download URLs should be short-lived.
- Validate file size and MIME type.
- Allow images and PDFs for MVP:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/pdf`
- Default max file size: 10 MB.
- Default max files per field: 5.

## 15. Notifications

Notification types:

- `student_document.request_sent`
- `student_document.submitted`
- `student_document.accepted`
- `student_document.needs_correction`
- `student_document.due_soon`

Routing:

- Parent notification opens `/dashboard/documents/{submissionId}`.
- Director notification opens `/dashboard/documents/submissions/{submissionId}`.

Realtime query invalidation hints:

- `studentDocuments`
- `notifications`
- specific submission id when available.

## 16. Web Routes

Add dashboard navigation item:

- Label: `Documents`
- Icon: use a lucide icon such as `FileCheck2` or `FolderLock`.

Routes:

```text
/dashboard/documents
/dashboard/documents/templates
/dashboard/documents/templates/new
/dashboard/documents/templates/[templateId]
/dashboard/documents/requests/[requestId]
/dashboard/documents/submissions/[submissionId]
/dashboard/documents/[submissionId]
```

Role routing:

- Director:
  - default `/dashboard/documents` = dashboard of requests/submissions.
  - can manage templates and requests.
- Teacher:
  - default `/dashboard/documents` = assigned class safety summaries and status overview.
  - no template/request authoring in MVP.
- Parent:
  - default `/dashboard/documents` = documents required for own children.

## 17. Web UI Requirements

### 17.1 Director Dashboard

Must show:

- Open requests
- Due soon
- Missing submissions
- Needs correction
- Accepted count
- Class filter
- Child search

Use tables for status dashboards where scanning matters. `@tanstack/react-table` is preferred for director submission lists.

### 17.2 Parent Submission Form

Must be fast and simple:

- Child selector if parent has multiple children.
- Clear required markers.
- Save draft.
- Submit button.
- Upload progress state.
- Attachment preview.
- Correction note shown at top when status is `needs_correction`.

Avoid long text explanations inside the app. Labels and helper text should be short.

### 17.3 Teacher Safety Summary

Must be compact:

- Child name
- Class
- Allergies
- Medical cautions
- Emergency contacts
- Last updated

No legal/private attachments by default.

## 18. TanStack Query Keys

Add to `packages/web/lib/query-keys.ts`:

```ts
studentDocuments: {
  all: () => ["studentDocuments"] as const,
  templates: (input?) => ["studentDocuments", "templates", input ?? {}] as const,
  template: (templateId) => ["studentDocuments", "template", templateId] as const,
  requests: (input?) => ["studentDocuments", "requests", input ?? {}] as const,
  request: (requestId) => ["studentDocuments", "request", requestId] as const,
  submissions: (input?) => ["studentDocuments", "submissions", input ?? {}] as const,
  submission: (submissionId) => ["studentDocuments", "submission", submissionId] as const,
  parentRequests: (input?) => ["studentDocuments", "parentRequests", input ?? {}] as const,
  safetySummary: (childId) => ["studentDocuments", "safetySummary", childId] as const,
}
```

Invalidation rules:

- Create/update template: invalidate `templates`.
- Send request: invalidate `requests`, `submissions`, `parentRequests`, notifications.
- Parent draft submit: invalidate submission detail and parent requests.
- Review submission: invalidate submissions, submission detail, parent requests, notifications.

## 19. Audit Logs

Audit actions:

- `student_document.template_created`
- `student_document.template_updated`
- `student_document.template_archived`
- `student_document.request_sent`
- `student_document.request_closed`
- `student_document.submission_draft_saved`
- `student_document.submission_submitted`
- `student_document.submission_accepted`
- `student_document.submission_correction_requested`
- `student_document.attachment_downloaded`

Metadata should include:

- `center_id`
- `request_id`
- `submission_id`
- `child_id`
- `template_type`
- `status`

Do not store full answers or sensitive document content in audit metadata.

## 20. Privacy And Safety

This feature handles sensitive child records. Treat it as higher risk than albums/meals.

Required safeguards:

- No public URLs.
- Short-lived signed download URLs.
- Object-level authorization on every detail/download request.
- Audit every staff document download.
- Parent can only upload for own child.
- Teacher cannot download legal documents by default.
- Avoid logging field answers.
- Avoid sending document content in notifications.
- Use neutral error messages where a user might be probing another child's document.

Recommended later:

- Per-center document retention settings.
- Director-only export permission.
- Watermarked document preview.
- Download reason prompt for staff.

## 21. Acceptance Criteria

MVP is complete when:

- Director can create an active Admission Form template.
- Director can send it to one class.
- Parent can see the request for their child.
- Parent can save draft and submit answers.
- Parent can upload at least one PDF/image through MinIO.
- Director can see submitted/missing status by child.
- Director can open submission detail and accept it.
- Director can request correction with a note.
- Parent can correct and resubmit.
- Teacher can see child safety summary for assigned class only.
- Parent cannot access another child's submission.
- Teacher cannot access legal/private attachments.
- Signed download URL is returned only after permission check.
- Notifications are sent for request sent, submission submitted, accepted, and needs correction.
- Audit logs exist for send, submit, review, and download.

## 22. Manual Test Plan

### Director

1. Login as director.
2. Open Documents.
3. Create Medical/Allergy template.
4. Send to one class with due date.
5. Confirm dashboard shows pending/missing rows.
6. After parent submits, open submission.
7. Download attachment.
8. Accept submission.
9. Confirm audit log exists.

### Parent

1. Login as parent.
2. Open Documents.
3. Confirm request appears under correct child.
4. Fill required fields.
5. Upload image/PDF.
6. Save draft.
7. Reopen and confirm answers remain.
8. Submit.
9. Confirm status changes to submitted.
10. If correction requested, edit and resubmit.

### Teacher

1. Login as teacher.
2. Open Documents or class child profile.
3. Confirm safety summary is visible for assigned class child.
4. Confirm full submission/legal attachments are not visible.
5. Confirm unrelated class child is forbidden.

### Security

1. Parent tries another submission id: forbidden.
2. Teacher tries legal attachment download: forbidden.
3. Signed URL expires according to media settings.
4. Notification does not include sensitive answers.

## 23. Future Enhancements

- Printable PDF export.
- Digital parent signature drawing.
- OCR for passport/birth certificate.
- Automatic document expiry reminders.
- Vaccination and medical certificate expiry tracking.
- Development observation records connected to reports/albums.
- Center-specific required document checklist by age/class.
- Bulk reminders to parents with missing documents.
- Uzbek/Russian/Korean form translation support.
