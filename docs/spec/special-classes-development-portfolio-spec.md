# Special Classes / Development Portfolio Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/special-classes.ts`, add procedures to `packages/shared/src/api/orpc/special-classes.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `specialClasses` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's subject-based enrichment and child development portfolio feature. It covers recurring specialist lessons such as English, Music, Russian, Math, Art, Sport, Dance, and Chess, while keeping the workflow owned by the normal class teacher.

## 1. Product Summary

Uzbek kindergartens often invite specialist teachers on fixed weekly days:

- Monday / Wednesday: Music
- Tuesday / Thursday: English
- Friday: Dance, Sport, Russian, Math, Art, or Chess

The specialist teacher may not use the app. The normal class teacher sits in the room, observes the children, records short notes, uploads media, and shares useful progress information with parents.

The feature answers the parent's real question:

```text
What is my child interested in?
What is my child strong at?
Where does my child need gentle support?
How can I help at home?
```

This should become a structured alternative to sending class videos through Telegram. Media stays private in Kichkintoy, parent visibility is child-scoped, and progress is saved over time by subject.

## 2. Scope

This spec defines **Special Classes** and the related **Development Portfolio**.

In scope:

- Director creates special subjects.
- Director creates age-based skill rubrics for each subject.
- Director schedules recurring special classes.
- Director records specialist teacher profile and payroll rules.
- Normal class teacher records class session summary and media.
- Normal class teacher records per-child observations quickly.
- Parent sees child-specific special class feed.
- Parent can ask private questions/comments.
- Monthly progress chart per subject.
- AI-generated monthly parent summary as a staff-reviewed draft.
- PDF development portfolio export.
- Specialist teacher attendance/payroll tracking.
- Notifications for parent-visible reports and comments.

Out of scope for MVP:

- Specialist teacher app login.
- Live video streaming.
- Public media links.
- Automatic AI scoring from video/photo.
- Government preschool development reporting.
- Payment transfer integration for specialist payroll.
- Comparing children against each other.

## 3. Product Principles

### 3.1 Normal Teacher Owns The App Workflow

The specialist teacher does **not** need a user account for MVP.

The normal class teacher:

- opens today's special class session;
- writes a short class summary;
- uploads class media;
- marks child participation and progress;
- adds optional parent-visible notes;
- answers parent questions if needed.

This keeps the feature realistic for Uzbekistan kindergartens.

### 3.2 Fast Teacher Input

Teacher must not write long text for every child.

Use tap-first controls:

- Participation: `active`, `normal`, `shy`, `absent`
- Progress: `strong`, `improving`, `needs_support`
- Interest: `high`, `medium`, `low`
- Skill tags from rubric:
  - strong tags
  - needs-practice tags
- Optional note

The teacher should be able to complete a class in 2-5 minutes.

### 3.3 AI Is A Draft, Not Final Truth

AI summary must be staff-reviewed before parent visibility.

AI must:

- use only structured observations from the app;
- avoid diagnosis;
- avoid labels like "bad";
- avoid comparing with other children;
- explain interests, strengths, support areas, and home practice.

## 4. Vocabulary

- **Special subject:** English, Music, Russian, Math, Art, Sport, Dance, Chess, etc.
- **Specialist teacher:** external or part-time subject teacher. No app login in MVP.
- **Special class schedule:** recurring plan for subject + class + day/time.
- **Special class session:** one actual lesson occurrence.
- **Child observation:** per-child result for one session.
- **Skill rubric:** age/subject-specific skills teacher can tag.
- **Development portfolio:** child's monthly/term history across subjects.
- **AI summary:** generated parent-facing draft based on observations.
- **PDF portfolio:** exportable development report for parent/director records.

## 5. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create subjects | Yes | No | No | No |
| Create rubric | Yes | No | No | No |
| Create recurring schedule | Yes | No | No | No |
| Record specialist teacher profile | Yes | No | No | No |
| Record specialist attendance/payroll | Yes | Yes, assigned class/session | No | No |
| Create session report | Yes | Yes, assigned class | No | No |
| Upload session media | Yes | Yes, assigned class | No | No |
| Record child observations | Yes | Yes, assigned class | No | No |
| Publish session to parents | Yes | Yes, assigned class if center allows | No | No |
| View staff dashboard | Yes, center-wide | Assigned classes only | No | No |
| View child feed | No | No | No | Own child only |
| Comment/question | No | Can reply | No | Own child only |
| Generate AI summary | Yes | Yes, assigned class if allowed | No | No |
| Approve AI summary | Yes | Optional by center setting | No | No |
| Export PDF portfolio | Yes | Assigned class children | No | Own child only |

Authorization rules:

- Director/organization owner can manage all special classes in their center.
- Teacher can manage only active assigned classes via `teacher_class_assignments`.
- Parent can only see data for linked children via `child_guardians`.
- Parent cannot see class-wide media unless the media is marked visible to their child.
- Every media download must re-check object-level permission before issuing signed MinIO URL.
- AI generation must never expose another child's information.

## 6. User Flows

### 6.1 Director Creates Subject

1. Director opens **Special Classes**.
2. Clicks **Subjects**.
3. Adds subject:
   - name: English
   - color/icon
   - active/inactive
   - description
4. Saves.

Suggested subjects:

- English
- Russian
- Music
- Math
- Art
- Dance
- Sport
- Chess
- Speech development
- Logic

### 6.2 Director Creates Skill Rubric

1. Director chooses subject.
2. Chooses age group:
   - 2-3
   - 3-4
   - 4-5
   - 5-6
   - 6-7
3. Adds skills.

Example English rubric age 4-5:

```text
- Understands simple greetings
- Recognizes colors
- Repeats short words
- Follows simple instructions
- Participates in songs
- Pronounces new words clearly
```

Example Music rubric age 4-5:

```text
- Follows rhythm
- Sings with group
- Remembers melody
- Uses instruments carefully
- Participates confidently
- Listens to music instructions
```

### 6.3 Director Creates Recurring Schedule

1. Director opens **Schedule** inside Special Classes.
2. Chooses:
   - subject
   - class
   - weekday
   - start time
   - end time
   - specialist teacher name
   - payroll rule
3. Saves recurring schedule.

Example:

```text
Music
Kichkintoy group
Every Monday and Wednesday
10:00-10:40
Specialist: Dilnoza opa
Pay: 150,000 UZS per session
```

### 6.4 Teacher Records Today's Session

1. Teacher opens **Special Classes**.
2. Sees today's sessions for assigned class.
3. Opens Music session.
4. Adds class summary:

```text
Today children practiced rhythm clapping and sang a spring song.
```

5. Uploads media through MinIO:
   - photo
   - short video
6. Selects parent visibility:
   - class media visible to all session children;
   - child-tagged media visible only to that child's parent;
   - staff-only media.
7. Records specialist attendance:
   - present
   - absent
   - substituted
   - cancelled
8. Records duration if different from schedule.

### 6.5 Teacher Records Child Observations

For each child:

```text
Participation: active / normal / shy / absent
Progress: strong / improving / needs_support
Interest: high / medium / low
Strong skills: rhythm, listening
Needs practice: singing confidence
Note: She followed rhythm well but was shy when singing.
```

Teacher can use bulk actions:

- Mark all present as `normal`
- Apply same class summary to all
- Quickly mark absent children
- Copy previous session observation as starting point

### 6.6 Parent Views Special Class Feed

Parent opens **Special Classes** or child portfolio.

Parent sees:

- subject
- date/time
- class name
- teacher/class summary
- child-specific observation
- photo/video if visible to their child
- strengths
- needs practice
- home practice suggestion if provided

Example:

```text
English
June 11, 2026

Today the group practiced colors and greetings.

Your child:
- Interest: high
- Progress: strong
- Strength: remembers colors quickly
- Needs practice: pronunciation of "yellow"

Home practice:
Point to colors at home and ask "What color is this?"
```

### 6.7 Parent Comments / Questions

Parent can ask a private question on their child's session report:

```text
Parent: Can we practice this song at home?
Teacher: Yes. Practice clapping slowly first, then sing together.
```

Rules:

- Parent comment is visible only to parent, assigned teacher, and director.
- Comments support text only in MVP.
- Teacher/director can close the thread.
- Notify teacher/director on new parent question.
- Notify parent on staff reply.

### 6.8 Monthly Progress Chart

Parent and staff can view monthly progress by subject.

For each child and month:

```text
English
Sessions: 8
Attendance: 7/8
Interest: high
Progress: strong
Top strengths: vocabulary, colors, listening
Needs practice: pronunciation

Music
Sessions: 7
Attendance: 7/7
Interest: medium
Progress: improving
Top strengths: listening, rhythm
Needs practice: singing confidence
```

Chart types:

- subject cards
- progress bar per subject
- session attendance count
- strongest skill tags
- needs-practice skill tags
- month-over-month trend later

### 6.9 AI Parent Summary

At month end, director or teacher clicks **Generate summary**.

Backend:

1. Aggregates structured observations.
2. Removes sensitive fields.
3. Sends only minimal anonymized facts to AI provider.
4. Stores generated draft.
5. Staff reviews/edits.
6. Staff approves.
7. Parent can view.

AI summary should say:

- child's strongest interests;
- subjects where child shows confidence;
- subjects where child is building confidence;
- simple home practice suggestions;
- warm tone;
- no diagnosis;
- no comparison with classmates.

Example:

```text
This month, your child showed strong interest in Math and English. He quickly understood counting activities and remembered new English color words well.

Music was more challenging. He listened carefully and joined rhythm activities, but he was shy when singing with the group.

At home, you can support his interest in Math with simple counting games. For Music, let him clap rhythm and sing together without pressure so he can build confidence slowly.
```

### 6.10 PDF Development Portfolio

Staff or parent can export a monthly/term PDF.

PDF includes:

- center name
- child name
- class name
- month/term
- subject summaries
- attendance per subject
- strongest interests
- needs-practice areas
- approved AI summary
- teacher recommendations
- selected media thumbnails if enabled later
- teacher/director signature area

MVP PDF should be generated server-side from HTML or a PDF renderer and stored as a private generated file. Parent downloads via signed URL.

### 6.11 Specialist Teacher Payroll / Attendance

Director uses this for payments.

For each session:

- specialist teacher name
- subject
- class
- scheduled duration
- actual duration
- attendance status:
  - present
  - absent
  - substituted
  - cancelled
- payroll status:
  - draft
  - approved
  - paid
- pay rule:
  - per session
  - per hour
  - monthly fixed
- amount

Monthly payroll report:

```text
Dilnoza opa - Music
Sessions completed: 8
Cancelled: 1
Total hours: 5h 20m
Total amount: 1,200,000 UZS
Status: approved
```

## 7. Data Model

### 7.1 `special_subjects`

```sql
CREATE TABLE special_subjects (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes:

```sql
CREATE INDEX special_subjects_center_status_idx
  ON special_subjects(center_id, status, name);
```

### 7.2 `specialist_teachers`

No app login required.

```sql
CREATE TABLE specialist_teachers (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.3 `special_class_schedules`

```sql
CREATE TABLE special_class_schedules (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES special_subjects(id),
  specialist_teacher_id UUID REFERENCES specialist_teachers(id),
  weekday INT NOT NULL, -- 1 Monday ... 7 Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | archived
  payroll_type TEXT NOT NULL DEFAULT 'per_session',
  payroll_amount INTEGER NOT NULL DEFAULT 0, -- minor unit UZS integer
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.4 `special_class_sessions`

```sql
CREATE TABLE special_class_sessions (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES special_subjects(id),
  schedule_id UUID REFERENCES special_class_schedules(id),
  specialist_teacher_id UUID REFERENCES specialist_teachers(id),
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  class_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | cancelled
  specialist_attendance_status TEXT NOT NULL DEFAULT 'present',
  payroll_status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | paid
  payroll_amount INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  updated_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes:

```sql
CREATE INDEX special_class_sessions_center_date_idx
  ON special_class_sessions(center_id, session_date DESC);

CREATE INDEX special_class_sessions_class_date_idx
  ON special_class_sessions(class_id, session_date DESC);
```

### 7.5 `special_class_session_media`

Reuse `media_assets` with `purpose = 'special_class'`.

```sql
CREATE TABLE special_class_session_media (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES special_class_sessions(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  visibility TEXT NOT NULL DEFAULT 'session_children',
  field_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, media_asset_id)
);
```

Visibility:

- `staff_only`
- `session_children`
- `tagged_children`

### 7.6 `special_class_media_children`

```sql
CREATE TABLE special_class_media_children (
  id UUID PRIMARY KEY,
  session_media_id UUID NOT NULL REFERENCES special_class_session_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_media_id, child_id)
);
```

### 7.7 `special_class_child_observations`

```sql
CREATE TABLE special_class_child_observations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES special_class_sessions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  participation TEXT NOT NULL DEFAULT 'normal',
  progress_level TEXT NOT NULL DEFAULT 'improving',
  interest_level TEXT NOT NULL DEFAULT 'medium',
  strong_skill_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  needs_practice_skill_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_note TEXT,
  home_practice TEXT,
  visible_to_parent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, child_id)
);
```

Values:

```text
participation: active | normal | shy | absent
progress_level: strong | improving | needs_support
interest_level: high | medium | low
```

### 7.8 `special_subject_rubrics`

```sql
CREATE TABLE special_subject_rubrics (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  subject_id UUID NOT NULL REFERENCES special_subjects(id),
  age_group TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  skill_label TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, age_group, skill_key)
);
```

### 7.9 `special_class_comments`

```sql
CREATE TABLE special_class_comments (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES special_class_sessions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'parent_teacher',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 7.10 `monthly_development_summaries`

```sql
CREATE TABLE monthly_development_summaries (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  child_id UUID NOT NULL REFERENCES children(id),
  month TEXT NOT NULL, -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'draft', -- draft | staff_review | approved | hidden
  structured_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary_text TEXT,
  staff_edited_summary_text TEXT,
  approved_summary_text TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  generated_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, month)
);
```

### 7.11 `development_portfolio_exports`

```sql
CREATE TABLE development_portfolio_exports (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  child_id UUID NOT NULL REFERENCES children(id),
  month TEXT,
  term_label TEXT,
  media_asset_id UUID REFERENCES media_assets(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | ready | failed
  generated_by_user_id UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 8. Shared API Schemas

Create `packages/shared/src/api/special-classes.ts`.

Enums:

```ts
specialSubjectStatus = "active" | "archived";
scheduleStatus = "active" | "paused" | "archived";
sessionStatus = "draft" | "published" | "cancelled";
participation = "active" | "normal" | "shy" | "absent";
progressLevel = "strong" | "improving" | "needs_support";
interestLevel = "high" | "medium" | "low";
specialistAttendanceStatus = "present" | "absent" | "substituted" | "cancelled";
payrollType = "per_session" | "per_hour" | "monthly_fixed";
payrollStatus = "draft" | "approved" | "paid";
portfolioSummaryStatus = "draft" | "staff_review" | "approved" | "hidden";
```

Important schemas:

- `specialSubjectSchema`
- `specialistTeacherSchema`
- `specialClassScheduleSchema`
- `specialClassSessionSummarySchema`
- `specialClassSessionDetailSchema`
- `specialClassChildObservationSchema`
- `specialSubjectRubricSchema`
- `parentSpecialClassFeedItemSchema`
- `monthlySubjectProgressSchema`
- `monthlyDevelopmentSummarySchema`
- `portfolioExportSchema`

Validation:

- `month` must match `YYYY-MM`.
- `weekday` must be integer 1-7.
- Times must be valid `HH:mm`.
- Skill keys must be short slug strings.
- Media asset IDs must be UUIDs.
- AI summary input must be structured, not arbitrary private text dump.

## 9. oRPC Contract

Create `packages/shared/src/api/orpc/special-classes.contract.ts`.

Recommended procedures:

```ts
specialClasses.subjects(input) -> SpecialSubject[]
specialClasses.createSubject(input) -> SpecialSubject
specialClasses.updateSubject(input) -> SpecialSubject
specialClasses.archiveSubject(input) -> { ok: true }

specialClasses.specialists(input) -> SpecialistTeacher[]
specialClasses.createSpecialist(input) -> SpecialistTeacher
specialClasses.updateSpecialist(input) -> SpecialistTeacher
specialClasses.archiveSpecialist(input) -> { ok: true }

specialClasses.rubrics(input) -> SpecialSubjectRubric[]
specialClasses.upsertRubric(input) -> SpecialSubjectRubric[]

specialClasses.schedules(input) -> SpecialClassSchedule[]
specialClasses.createSchedule(input) -> SpecialClassSchedule
specialClasses.updateSchedule(input) -> SpecialClassSchedule
specialClasses.archiveSchedule(input) -> { ok: true }

specialClasses.staffSessions(input) -> SpecialClassSessionSummary[]
specialClasses.sessionDetail(input) -> SpecialClassSessionDetail
specialClasses.createSession(input) -> SpecialClassSessionDetail
specialClasses.updateSession(input) -> SpecialClassSessionDetail
specialClasses.publishSession(input) -> SpecialClassSessionDetail
specialClasses.cancelSession(input) -> SpecialClassSessionDetail

specialClasses.upsertChildObservations(input) -> SpecialClassSessionDetail
specialClasses.attachMedia(input) -> SpecialClassSessionDetail

specialClasses.parentFeed(input) -> ParentSpecialClassFeedItem[]
specialClasses.parentSessionDetail(input) -> ParentSpecialClassFeedItem

specialClasses.comments(input) -> SpecialClassComment[]
specialClasses.addComment(input) -> SpecialClassComment
specialClasses.deleteComment(input) -> { ok: true }

specialClasses.monthlyProgress(input) -> MonthlySubjectProgress[]
specialClasses.generateAiSummary(input) -> MonthlyDevelopmentSummary
specialClasses.updateSummaryDraft(input) -> MonthlyDevelopmentSummary
specialClasses.approveSummary(input) -> MonthlyDevelopmentSummary

specialClasses.createPdfPortfolio(input) -> PortfolioExport
specialClasses.portfolioDownloadUrl(input) -> { downloadUrl: string; expiresAt: string }

specialClasses.payrollReport(input) -> PayrollReport
specialClasses.updateSessionPayroll(input) -> SpecialClassSessionSummary
```

## 10. Backend Services

Recommended structure:

```text
packages/api/src/special-classes/
  special-classes.module.ts
  special-classes.service.ts
  special-classes-authz.ts
  portfolio-summary.service.ts
  portfolio-pdf.service.ts
  specialist-payroll.service.ts
```

AI:

```text
packages/api/src/ai/
  ai.module.ts
  ai.service.ts
  ai.types.ts
  providers/
    mock-ai.provider.ts
    gemini.provider.ts
    openrouter.provider.ts
```

PDF:

```text
packages/api/src/pdf/
  pdf.module.ts
  pdf.service.ts
```

## 11. AI Integration

### 11.1 Environment

```env
AI_SUMMARY_ENABLED=false
AI_PROVIDER=none
AI_MODEL=
AI_API_KEY=
AI_TIMEOUT_MS=15000
AI_MONTHLY_SUMMARY_MAX_INPUT_CHARS=12000
```

Allowed providers:

```text
none
mock
gemini
openrouter
```

Default must be `none` or `mock` for local development.

### 11.2 Provider Recommendation

For early development:

- `mock`: deterministic local summary for tests.
- `gemini`: useful MVP option because Google AI Studio/Gemini API has a developer free tier.
- `openrouter`: useful for experiments, but free models can change.

Production privacy warning:

- Do not send sensitive child PII unless the center has consent and the provider/privacy setup is approved.
- Prefer anonymized structured data.
- Store generated summary as draft until staff approves.

### 11.3 AI Input Shape

Do **not** send child full name, parent phone, photos, medical data, or private family context.

Send:

```json
{
  "childAlias": "the child",
  "month": "2026-06",
  "language": "uz",
  "subjects": [
    {
      "name": "Math",
      "sessions": 8,
      "attended": 8,
      "interest": { "high": 6, "medium": 2, "low": 0 },
      "progress": { "strong": 6, "improving": 2, "needs_support": 0 },
      "strongSkills": ["counting", "memory"],
      "needsPracticeSkills": ["writing numbers"],
      "teacherNotes": [
        "Solved counting activities quickly.",
        "Enjoyed number matching game."
      ]
    },
    {
      "name": "Music",
      "sessions": 7,
      "attended": 7,
      "interest": { "high": 1, "medium": 4, "low": 2 },
      "progress": { "strong": 1, "improving": 3, "needs_support": 3 },
      "strongSkills": ["listening"],
      "needsPracticeSkills": ["singing confidence", "rhythm"],
      "teacherNotes": [
        "Listened carefully but was shy when singing."
      ]
    }
  ]
}
```

### 11.4 AI Prompt

System:

```text
You write warm monthly kindergarten development summaries for parents.
Use only the provided structured observations.
Do not diagnose.
Do not compare with other children.
Do not say the child is bad.
Use gentle phrases such as "needs practice", "needs support", or "is building confidence".
Mention the child's strongest interests.
Mention areas that need support.
Give 2-3 simple home practice suggestions.
Write in Uzbek unless another language is requested.
```

User:

```text
Create a monthly parent summary from this JSON.
Return concise plain text with:
1. Overall observation
2. Strong interests
3. Areas to support
4. Home practice suggestions
```

### 11.5 AI Output Rules

- Max 1800 characters for parent UI.
- No markdown in MVP.
- No medical/psychological labels.
- No classmate comparison.
- If data is insufficient, say there is not enough observation yet.
- Staff can edit before approval.

## 12. PDF Portfolio

### 12.1 Generation

Server-side flow:

1. Staff/parent requests PDF.
2. Backend verifies access.
3. Backend gathers approved monthly summary and progress data.
4. Backend renders PDF.
5. Backend stores generated PDF as private `media_assets` purpose `development_portfolio`.
6. Download uses signed URL.

### 12.2 PDF Sections

- Cover:
  - center name
  - child name
  - class name
  - month/term
- Monthly AI/staff summary
- Subject cards:
  - attendance count
  - interest level
  - progress level
  - strengths
  - needs practice
  - home practice
- Selected teacher notes
- Optional media thumbnails later
- Signature/footer

## 13. Media Storage

Add `mediaPurposeValues`:

```text
special_class
development_portfolio
```

Allowed upload types:

- `special_class`: image/video
- `development_portfolio`: PDF generated by backend only

Security:

- No public URLs.
- Parent media access is by child relation and media visibility.
- Staff media access is by director/assigned teacher permission.
- PDF download re-checks permission every time.

## 14. Notifications

Notification events:

```text
special_class.session_published
special_class.comment.created
special_class.summary_ready_for_review
special_class.summary_approved
special_class.pdf_ready
special_class.payroll_approved
```

Recipients:

- Parent receives published session for own child.
- Parent receives staff reply to comment.
- Teacher/director receives parent comment.
- Director receives payroll/summary review items.

Realtime invalidation groups:

```text
specialClasses
notifications
media
```

## 15. Web UI

Recommended routes:

```text
packages/web/app/dashboard/special-classes/page.tsx
packages/web/app/dashboard/special-classes/new/page.tsx
packages/web/app/dashboard/special-classes/[sessionId]/page.tsx
packages/web/app/dashboard/special-classes/subjects/page.tsx
packages/web/app/dashboard/special-classes/schedule/page.tsx
packages/web/app/dashboard/special-classes/payroll/page.tsx
packages/web/app/dashboard/portfolio/[childId]/page.tsx
```

### 15.1 Director Screen

Tabs:

- Today
- Schedule
- Subjects
- Rubrics
- Portfolio
- Payroll

### 15.2 Teacher Screen

Default:

- Today's special classes
- This week's sessions
- Quick session composer
- Child observation grid

Teacher should see no complex admin setup by default.

### 15.3 Parent Screen

Default:

- Child special class feed
- Monthly subject progress
- Approved summary
- Download PDF
- Ask teacher

## 16. TanStack Query Keys

Add to `packages/web/lib/query-keys.ts`:

```ts
specialClasses: {
  all: () => ["specialClasses"] as const,
  subjects: (centerId) => ["specialClasses", "subjects", centerId] as const,
  specialists: (centerId) => ["specialClasses", "specialists", centerId] as const,
  schedules: (input) => ["specialClasses", "schedules", input] as const,
  staffSessions: (input) => ["specialClasses", "staffSessions", input] as const,
  session: (sessionId) => ["specialClasses", "session", sessionId] as const,
  parentFeed: (input) => ["specialClasses", "parentFeed", input] as const,
  monthlyProgress: (input) => ["specialClasses", "monthlyProgress", input] as const,
  summary: (childId, month) => ["specialClasses", "summary", childId, month] as const,
  payroll: (input) => ["specialClasses", "payroll", input] as const,
}
```

## 17. Audit Logs

Log:

- `special_subject.created`
- `special_subject.updated`
- `special_schedule.created`
- `special_session.created`
- `special_session.published`
- `special_session.cancelled`
- `special_observation.updated`
- `special_comment.created`
- `special_summary.generated`
- `special_summary.approved`
- `special_pdf.generated`
- `special_payroll.approved`
- `special_payroll.paid`

## 18. Safety And Privacy

Hard rules:

- Parent sees only own child data.
- Parent cannot see other child observations.
- Class videos/photos should be visible only to parents whose child is included in that session.
- Tagged media can be restricted to one child.
- AI receives anonymized structured data only.
- AI summary is staff-reviewed before parent visibility.
- PDF is private and signed-download only.
- Payroll is staff-only.

## 19. MVP Implementation Order

1. Shared schemas and oRPC contract.
2. Prisma tables for subjects, schedules, sessions, observations, comments.
3. Backend authorization and session CRUD.
4. Staff special class session composer.
5. Parent feed.
6. Media upload/download for special class sessions.
7. Monthly progress aggregation.
8. AI summary with `mock` provider first.
9. Gemini/OpenRouter provider behind env flag.
10. Staff review/approval for AI summary.
11. PDF export.
12. Payroll attendance/report.
13. Rubric management UI.

## 20. Acceptance Criteria

### Staff Session

- Director can create English and Music subjects.
- Director can schedule English every Tuesday/Thursday for a class.
- Teacher sees today's assigned special class.
- Teacher can publish a session with summary, media, and child observations.
- Teacher can mark a child strong in Math and needs support in Music.

### Parent Feed

- Parent sees only their child's special class session.
- Parent sees strengths and needs-practice notes.
- Parent does not see unrelated children.
- Parent can ask a private question.
- Teacher can reply.

### Monthly Progress

- Parent sees per-subject monthly progress.
- Progress reflects actual observations and attendance.
- Missing data shows "not enough observations yet".

### AI Summary

- Staff can generate AI summary for a child/month.
- AI input does not include child full name, parent phone, photos, or medical data.
- Summary is draft until staff approves.
- Parent sees only approved summary.
- Staff can edit AI output before approval.

### PDF

- Staff can create PDF portfolio.
- Parent can download own child's PDF.
- Other parents cannot access the signed URL or underlying export.

### Payroll

- Director can see monthly specialist payroll.
- Teacher can record specialist attendance for assigned session.
- Parent cannot see payroll.

## 21. Manual Test Plan

### Director

1. Login as director.
2. Create subjects: English, Music.
3. Create rubric for English age 4-5.
4. Create specialist teacher: Dilnoza opa.
5. Schedule Music Monday/Wednesday.
6. Open payroll screen and confirm scheduled sessions appear.

### Teacher

1. Login as assigned teacher.
2. Open Special Classes.
3. Open today's Music session.
4. Add class summary.
5. Upload photo/video.
6. Mark one child:
   - participation: active
   - progress: strong
   - interest: high
   - strong skills: rhythm
7. Mark another child:
   - participation: shy
   - progress: needs support
   - interest: medium
   - needs practice: singing confidence
8. Publish session.

### Parent

1. Login as parent.
2. Open Special Classes.
3. Confirm only own child's session appears.
4. Open monthly progress.
5. Add question.
6. Confirm teacher reply appears.
7. Download approved PDF portfolio.

### AI

1. Generate monthly summary.
2. Confirm output mentions strongest interests.
3. Confirm weaker subject uses gentle language.
4. Edit summary.
5. Approve summary.
6. Login as parent and confirm approved summary appears.

