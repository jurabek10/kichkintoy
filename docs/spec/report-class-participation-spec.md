# Daily Report Class Participation Spec

> **API note:** the app API is oRPC-only. Extend the existing reports schemas in `packages/shared/src/api/daily-reports.ts`, reports procedures in `packages/shared/src/api/orpc/reports.contract.ts`, and the NestJS reports service/router. Consume through the typed `orpc.reports.*` client with TanStack Query. Do not create a separate special-classes API surface for the MVP.

> Status: **planned next feature**. This replaces the separate special-classes workflow idea. Teachers should not write both a daily report and a special-class report for the same child/day.

## 1. Scope

This spec defines **Class Participation inside Daily Reports**. It lets a teacher record how a child participated in subject/activity classes such as English, Music, Math, Russian, Art, PE, or speech practice as part of the normal daily report.

The key product decision:

```text
Teacher writes one daily report per child per day.
Class/subject participation is one section inside that report.
```

In scope:

- Teacher adds one or more class participation rows to a daily report.
- Each row captures subject, participation level, strengths, practice needs, and optional home suggestion.
- Teacher can attach child-safe photos/videos to the same daily report.
- Parent sees class participation inside the published daily report.
- Parent sees report photos/videos through signed private download URLs only.
- Parent can comment/question through the existing daily report comments.
- Director can view reports as today, including participation rows, through the existing report permissions.
- The data remains structured enough for future monthly AI summaries and progress charts.

Out of scope for MVP:

- Separate special-class schedule management.
- Separate specialist-teacher app/account.
- Specialist payroll and attendance.
- Separate special-class media gallery.
- AI generation in the first implementation.
- PDF portfolio export in the first implementation.

## 2. Why This Belongs In Reports

Uzbek kindergarten teachers already write daily reports. If the app adds a second place for subject-class notes, the teacher must repeat work and the product becomes harder to use.

The daily report is already the parent communication surface. It already supports:

- per-child report date;
- teacher notes;
- structured report items;
- media attachments;
- publish/schedule/draft;
- parent read receipts;
- parent comments;
- notifications.

So class participation should reuse the report system.

## 3. Vocabulary

- **Daily report:** existing report for one child and one date.
- **Class participation item:** a `daily_report_items` row with `item_type = class_participation`.
- **Subject:** the class/activity name, for example `English`, `Music`, `Math`, `Russian`, `Art`, `PE`.
- **Participation level:** quick teacher assessment for that subject on that day.
- **Strength:** what the child did well.
- **Practice need:** what the child should improve.
- **Home suggestion:** optional parent-friendly suggestion.

## 4. Roles And Permissions

Permissions reuse the existing Daily Reports model.

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Add/edit class participation in report | Yes | Yes, assigned class only | No | No |
| Publish report with participation | Yes | Author only | No | No |
| View participation in published report | Yes | Yes, assigned class | No | Own child only |
| Comment/question | Yes | Yes, assigned class | No | Own child only |
| See participation summary later | Yes | Yes, assigned class | No | Own child only |

Rules:

- No new role is required for specialist teachers in MVP.
- The normal class teacher records the subject-class observation.
- Director is a manager/reviewer, not the default author for child participation notes.

## 5. Teacher Flow

### 5.1 Daily Report Composer

Inside the existing report composer, add a section:

```text
Class participation
```

The teacher can add multiple rows:

```text
Subject: English
Participation: good
Interest: high
Strengths: remembers colors and numbers
Needs practice: pronunciation
Home suggestion: repeat the color words at home
Teacher note: spoke confidently in group activity
```

Example with multiple subjects:

```text
English
- Participation: excellent
- Interest: high
- Strength: answers simple questions
- Practice: pronunciation

Music
- Participation: needs_support
- Interest: medium
- Strength: follows rhythm
- Practice: confidence singing with group

Math
- Participation: good
- Interest: high
- Strength: counting
- Practice: comparing more/less
```

### 5.2 Fast Input Requirements

The section must be fast enough for a busy teacher:

- Add row button.
- Subject dropdown with common subjects.
- Custom subject option.
- Participation segmented control or select.
- Interest select.
- Short text fields for strengths/practice.
- Optional home suggestion.
- Optional teacher note.
- Remove row button.
- Reusable placeholders that guide the teacher, not long instructions.

Teachers should not need to write long paragraphs for every subject.

### 5.3 Bulk Draft Workflow

The existing class report workflow should remain:

1. Teacher opens Reports.
2. Chooses class/date.
3. Bulk creates drafts for children.
4. Opens one child report.
5. Adds meal/sleep/health/class participation.
6. Publishes or saves draft.

No separate `/dashboard/special-classes` page is needed for MVP.

### 5.4 Photos And Videos

The teacher can attach photos/videos in the same report composer.

Rules:

- Use the existing MinIO signed upload/download system.
- Store objects privately; no public child media URLs.
- Upload purpose: `daily_report`.
- Images allowed: JPEG, PNG, WebP, HEIC/HEIF.
- Videos allowed: MP4, WebM, MOV/QuickTime.
- Image upload limit: 25MB per file.
- Video upload limit: 100MB per file for now.
- A report may have multiple media assets.
- Uploaded media should be linked with `media_links.entity_type = daily_report`.
- Parents only receive signed download URLs after report publication and only for their own child.
- Assigned teachers/directors can access report media for their class/center.

The UI should place the media section after class participation and before Save/Publish actions:

```text
Photos/videos
[Upload files]
uploaded-file-1.mp4
uploaded-file-2.jpg
```

## 6. Parent Flow

Parent opens the normal daily report detail and sees:

```text
Class participation

English
Participation: Good
Interest: High
Strengths: remembers colors and numbers
Needs practice: pronunciation
Home practice: repeat color words at home

Music
Participation: Needs support
Interest: Medium
Strengths: follows rhythm
Needs practice: singing confidence
```

Parent can ask questions using the existing report comments.

Do not create a separate parent special-classes feed for MVP.

Parent report detail should also show report media:

```text
Photos/videos
- image preview for photos
- video player for videos
```

The browser must load these with signed URLs generated by the API.

## 7. Data Model

### 7.1 MVP: Reuse `daily_report_items`

Add a new item type:

```text
class_participation
```

Store each subject row as one `daily_report_items` record:

```text
item_type = "class_participation"
title     = subject name, e.g. "English"
value     = participation level, e.g. "good"
note      = structured compact text or JSON string
```

Recommended `note` JSON shape:

```json
{
  "interest": "high",
  "strengths": "remembers colors and numbers",
  "needsPractice": "pronunciation",
  "homeSuggestion": "repeat color words at home",
  "teacherNote": "spoke confidently in group activity"
}
```

Why JSON in `note` for MVP:

- No new database table is required.
- Existing report create/update APIs already save report items.
- Future migration to a dedicated table is still possible.
- AI summaries can parse structured data from report items.

Validation must ensure this JSON is generated by our UI, not arbitrary user input from a textarea.

### 7.2 Participation Values

Use a small fixed enum:

```text
excellent
good
needs_support
not_observed
absent
```

Labels:

```text
excellent      Excellent
good           Good
needs_support  Needs support
not_observed   Not observed
absent         Absent
```

### 7.3 Interest Values

Use:

```text
high
medium
low
not_observed
```

### 7.4 Common Subjects

Default subject options:

```text
English
Russian
Uzbek
Math
Music
Art
PE
Speech
Reading
Logic
Dance
Other
```

Centers can customize subjects later. MVP can use a fixed list plus custom subject text.

## 8. Shared API Schemas

Update `packages/shared/src/api/daily-reports.ts`.

Add:

```ts
classParticipation
```

or directly add:

```ts
"class_participation"
```

to `dailyReportItemTypeValues`.

Add helper schemas:

```ts
classParticipationLevelSchema
classParticipationInterestSchema
classParticipationNoteSchema
classParticipationItemInputSchema
```

The existing `dailyReportItemInputSchema` can remain generic, but the UI should use typed helpers so class participation rows are not built with unsafe strings.

## 9. Backend Behavior

The reports service should continue to create/update reports with `items`.

Add server-side validation:

- If `itemType !== "class_participation"`, existing behavior remains.
- If `itemType === "class_participation"`:
  - `title` is required and max 80 chars.
  - `value` must be one of the participation values.
  - `note` must be valid JSON matching `classParticipationNoteSchema`.
  - Empty subject rows should be rejected or stripped before saving.

Publishing rules do not change.

Notifications do not change. A report with participation rows is still a normal daily report.

## 10. Web UI

### 10.1 Report Composer

Update:

```text
packages/web/app/dashboard/reports/_components/report-composer.tsx
```

Add a `ClassParticipationSection` component. Prefer a separate file if the composer becomes too long:

```text
packages/web/app/dashboard/reports/_components/class-participation-section.tsx
```

UI layout:

- Card title: `Class participation`
- Add subject button
- Each subject row as a compact card or table row
- Subject select/custom input
- Participation select
- Interest select
- Strengths input
- Needs practice input
- Home suggestion input
- Teacher note textarea, compact
- Delete icon button

Keep the report composer readable. Do not make one huge component file.

### 10.2 Report Detail

Update:

```text
packages/web/app/dashboard/reports/_components/report-detail-screen.tsx
```

Render `class_participation` items in their own section, separate from generic report items.

Suggested order:

1. Teacher note
2. Health note
3. Meal/sleep/mood/other items
4. Class participation
5. Photos
6. Comments

### 10.3 Staff Report Lists

No major change required. A report with participation rows should still count as a report with content.

Optional later:

- Badge: `3 subjects`
- Filter: `has class participation`

## 11. AI Summary Later

This feature is designed for future AI summaries, but AI should not block the MVP.

Future monthly AI input:

- all published report class participation items for a child in a month;
- grouped by subject;
- participation trends;
- interest trends;
- strengths/practice text.

Future parent summary output:

```text
This month, Ali showed strong interest in Math and English.
He confidently counted objects and answered simple English questions.
Music participation was lower; he followed rhythm but was shy when singing.
At home, short confidence-building singing games and color-word repetition may help.
```

AI must never invent medical/developmental diagnoses. It should summarize teacher-entered observations only.

## 12. PDF Portfolio Later

The PDF portfolio can be generated later from:

- daily reports;
- class participation rows;
- report photos;
- attendance;
- meal/eating patterns;
- teacher comments.

MVP only needs to keep class participation structured enough for that future export.

## 13. Implementation Steps

1. Add `class_participation` to shared daily report item type.
2. Add participation/interest/note schemas.
3. Add backend validation for class participation report items.
4. Add `ClassParticipationSection` to report composer.
5. Convert section rows into `DailyReportItemInput[]`.
6. Add report media upload section using `orpc.media.createUploadUrl` and `orpc.media.completeUpload`.
7. Allow daily-report videos up to 100MB in shared media validation and backend media validation.
8. Ensure `MediaService.canAccessMedia` authorizes `daily_report` media for assigned staff/director and guardians after publish.
9. Parse/render participation rows in report detail.
10. Render report media with signed download URLs in report detail.
11. Update report item labels in `packages/web/lib/format.ts`.
12. Run:

```bash
pnpm --filter @kichkintoy/shared build
pnpm --filter @kichkintoy/api build
pnpm --filter @kichkintoy/web build
```

## 14. Manual Testing

Teacher:

1. Log in as assigned teacher.
2. Open Reports.
3. Create or open a draft for one child.
4. Add class participation rows:
   - English: good/high
   - Music: needs support/medium
5. Upload one photo.
6. Upload one video under 100MB.
7. Save draft.
8. Reopen report and confirm rows/media remain.
9. Publish.

Parent:

1. Log in as parent for that child.
2. Open Reports.
3. Open the published report.
4. Confirm class participation section is visible.
5. Confirm photo/video media loads with signed URLs.
6. Add a comment/question.

Director:

1. Log in as director.
2. Open Reports.
3. Open the same report.
4. Confirm participation rows are visible.

Negative tests:

- Parent cannot edit participation.
- Unassigned teacher cannot view/edit another class report.
- Invalid participation value is rejected by shared/backend validation.
- Video over 100MB is rejected for daily reports.
- Parent cannot access draft report media.
- Draft reports are not visible to parents.

## 15. Success Criteria

- Teacher writes one report, not two.
- Class participation is visible to parents inside daily reports.
- Data is structured enough for later AI summaries.
- No separate special-classes dashboard/API/table exists in MVP.
- Existing reports notifications, comments, read receipts, and permissions continue working.
