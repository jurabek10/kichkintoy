# Kichkintoy Uzbekistan: System and Database Design

## 1. Product Goal

Build Kichkintoy, a localized kindergarten communication and operations platform for Uzbekistan.

The product connects:

- Parents and guardians
- Teachers
- Directors and center administrators
- Kindergarten branches, classes, and children

The core promise is simple: parents can understand their child's day, teachers can report care activities quickly, and directors can manage communication, attendance, and payments in one place.

## 2. Core Product Model

Kichkintoy should organize the app around this hierarchy:

```text
User Account
  -> Child Profile
    -> Center Enrollment
      -> Class
        -> Modules
```

For Kichkintoy in Uzbekistan, use this structure as the core product model.

Important design rule:

Do not make a parent belong directly to only one kindergarten. A parent account is global. The parent may have multiple children, and each child may be enrolled in a different center/class over time.

## 3. User Roles

### Parent / Guardian

Main responsibilities:

- View child daily reports
- Read notices
- View albums/photos
- Check schedules
- View meal plans
- Submit medication requests
- Manage return-home / pickup information
- Check attendance
- Manage child profile
- Add child by searching center name or center number
- Manage personal info, phone, email, marketing consent

### Teacher

Main responsibilities:

- See assigned classes
- See children in those classes
- Create daily reports
- Upload album photos/videos
- Send notices
- Record attendance
- Record meals, sleep, mood, toilet, temperature, medication
- Check parent medication/return-home requests
- Communicate with parents

### Director / Center Admin

Main responsibilities:

- Manage center profile
- Manage branches/classes
- Invite teachers
- Approve parent/child join requests
- Assign children to classes
- Send center-wide notices
- View attendance
- Manage schedule/meal plan
- Manage payments
- View teacher activity

### Platform Super Admin

Main responsibilities:

- Manage all centers
- Verify kindergarten business accounts
- Manage payment provider settings
- Handle support and abuse reports
- Access sensitive data only through audited support workflows

## 4. Main App Surfaces

### Parent Account Screen

Kichkintoy account structure:

```text
Top:
- Parent account name / username
- My Info
- Add child

Child section:
- Child photo
- Child name
- DOB
- Moments
- Add
- Linked center/class card

Bottom:
- App Settings
- Recommend
- Log Out
```

Recommended Kichkintoy version:

```text
Parent Account
- My Info
- Add Child
- Children list
- App Settings
- Language
- Notifications
- Log Out
```

### Child Workspace

Kichkintoy child workspace modules:

```text
Report
Notice
Album
Schedule
MealPlan
Medication
ReturnHome
Attendance
```

Use these modules as the first child workspace structure.

### My Info

Kichkintoy account fields:

```text
Username
Name
Email
Mobile number
Log Out
Delete account
Marketing Consent
```

Uzbekistan-specific additions:

```text
Preferred language: Uzbek or Russian
SMS notification consent
```

### Add Child

Kichkintoy add-child flow:

```text
Add child
  -> Search Center
    -> Search by center name or number
```

Recommended backend flow:

```text
Parent searches center
Parent submits child join request
Director approves request
Child becomes linked to center/class
```

### Child Profile Setting

Kichkintoy child profile fields:

```text
Photo
Name
DOB
Gender
Nickname setting
```

## 5. High-Level System Architecture

Start with a modular monolith. It is cheaper and faster than microservices for the first version.

```text
Mobile Apps
- Parent app
- Teacher app
- Director/admin app

Web Apps
- Director dashboard
- Teacher dashboard
- Platform admin dashboard

Backend API
- Auth module
- User/profile module
- Center/class module
- Child/enrollment module
- Report module
- Notice module
- Album/media module
- Schedule module
- Meal plan module
- Medication module
- Return-home module
- Attendance module
- Messaging module
- Payment module
- Notification module
- Audit log module

Infrastructure
- PostgreSQL
- Redis
- Object storage
- Background workers
- Push notification provider
- SMS provider
- Payment providers
```

## 6. Final Tech Stack

### Repository

- pnpm workspace monorepo
- Shared TypeScript packages for schemas, API contracts, and reusable types

Recommended structure:

```text
docs/
  design/   Architecture and system design documents
  spec/     Product and API specs

packages/
  api/      NestJS backend
  web/      Next.js dashboard
  mobile/   React Native app
  shared/   Shared Zod schemas, constants, and TypeScript types
```

### Mobile

- React Native
- TypeScript

### Web Dashboard

- Next.js
- TypeScript

### Backend

- NestJS
- TypeScript
- oRPC
- Zod
- Better Auth
- Prisma

### Database

- PostgreSQL

### Storage

- Cloudflare R2

### Queue / Cache

- Redis
- BullMQ

### Notifications

- Firebase Cloud Messaging for Android
- APNs for iOS
- Eskiz.uz for Uzbekistan-first SMS

### Payments

Uzbekistan integrations:

- Click
- Payme
- Uzum
- Bank transfer
- Cash tracking

## 7. Database Design

The schema below is designed for PostgreSQL.

## 7.1 Organizations, Centers, Branches

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  default_language TEXT NOT NULL DEFAULT 'uz',
  timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE centers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  center_code TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  region TEXT,
  district TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.2 Users, Roles, Profiles

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'uz',
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  center_id UUID REFERENCES centers(id),
  branch_id UUID REFERENCES branches(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teacher_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  employee_number TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Default roles:

```text
platform_admin
organization_owner
director
teacher
assistant_teacher
parent
accountant
support_agent
```

## 7.3 Consent and Account Settings

```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type TEXT NOT NULL,
  consented BOOLEAN NOT NULL,
  channel TEXT,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.4 Classes and Teacher Assignments

```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  age_group TEXT,
  academic_year TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teacher_class_assignments (
  id UUID PRIMARY KEY,
  teacher_user_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  assignment_role TEXT NOT NULL DEFAULT 'teacher',
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.5 Children, Guardians, Enrollments

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  dob DATE NOT NULL,
  gender TEXT,
  photo_url TEXT,
  allergies TEXT,
  medical_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE child_guardians (
  id UUID PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id),
  user_id UUID NOT NULL REFERENCES users(id),
  relationship TEXT NOT NULL,
  nickname_for_child TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  can_pickup BOOLEAN NOT NULL DEFAULT false,
  can_message BOOLEAN NOT NULL DEFAULT true,
  access_level TEXT NOT NULL DEFAULT 'full',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, user_id)
);

CREATE TABLE child_enrollments (
  id UUID PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  enrollment_status TEXT NOT NULL DEFAULT 'active',
  started_at DATE NOT NULL,
  ended_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE center_join_requests (
  id UUID PRIMARY KEY,
  parent_user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  requested_class_id UUID REFERENCES classes(id),
  child_name TEXT NOT NULL,
  child_dob DATE,
  child_gender TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.6 Daily Reports

Daily reports are one of the most important modules.

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  child_id UUID NOT NULL REFERENCES children(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  report_date DATE NOT NULL,
  mood TEXT,
  health_note TEXT,
  teacher_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, report_date)
);

CREATE TABLE daily_report_items (
  id UUID PRIMARY KEY,
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  title TEXT,
  value TEXT,
  note TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Item types:

```text
meal
sleep
toilet
mood
activity
temperature
medication
health
custom
```

## 7.7 Notices

```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notice_recipients (
  id UUID PRIMARY KEY,
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  read_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id, child_id)
);
```

Target types:

```text
center
class
child
selected_users
```

## 7.8 Albums and Media

```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  uploader_user_id UUID NOT NULL REFERENCES users(id),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INT,
  height INT,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE album_posts (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  body TEXT,
  target_type TEXT NOT NULL DEFAULT 'class',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_links (
  id UUID PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE album_post_children (
  id UUID PRIMARY KEY,
  album_post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (album_post_id, child_id)
);
```

Use `album_post_children` when parents should only see photos where their child is tagged.

## 7.9 Schedule

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.10 Meal Plan

```sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  menu_text TEXT NOT NULL,
  calories INT,
  allergens TEXT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Meal types:

```text
breakfast
lunch
snack
dinner
```

## 7.11 Medication Requests

```sql
CREATE TABLE medication_requests (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  child_id UUID NOT NULL REFERENCES children(id),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  instructions TEXT,
  requested_for_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  administered_by_user_id UUID REFERENCES users(id),
  administered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Statuses:

```text
pending
approved
rejected
administered
cancelled
```

## 7.12 Return Home / Pickup

```sql
CREATE TABLE return_home_requests (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  child_id UUID NOT NULL REFERENCES children(id),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  return_date DATE NOT NULL,
  pickup_method TEXT NOT NULL,
  pickup_person_name TEXT,
  pickup_person_phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  confirmed_by_user_id UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Pickup methods:

```text
parent
guardian
bus
walk
other
```

## 7.13 Attendance

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  child_id UUID NOT NULL REFERENCES children(id),
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_by_user_id UUID REFERENCES users(id),
  check_out_by_user_id UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, attendance_date)
);
```

Statuses:

```text
present
absent
sick
vacation
late
left_early
```

## 7.14 Messaging

```sql
CREATE TABLE conversation_threads (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  class_id UUID REFERENCES classes(id),
  child_id UUID REFERENCES children(id),
  thread_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Thread types:

```text
parent_teacher
parent_director
class_group
support
```

## 7.15 Payments

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  child_id UUID NOT NULL REFERENCES children(id),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  period_start DATE,
  period_end DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Providers:

```text
click
payme
uzum
cash
bank_transfer
```

## 7.16 Notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, token)
);
```

Channels:

```text
push
sms
in_app
```

## 7.17 Audit Logs

Children's data is sensitive. Add audit logging from the beginning.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  center_id UUID REFERENCES centers(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Examples:

```text
child.profile.updated
daily_report.published
notice.read
attendance.updated
payment.received
support.child_data.viewed
```

## 8. Permission Model

### Parent

Can:

- View linked children
- View reports/notices/albums for linked children
- Submit medication and return-home requests
- View own invoices/payments
- Edit allowed child profile fields

Cannot:

- See other children
- See teacher-only notes
- See other parents' phone numbers unless center allows it

### Teacher

Can:

- View assigned classes
- View children in assigned classes
- Create reports
- Record attendance
- Upload albums
- Send notices to assigned classes
- Review medication/return-home requests

Cannot:

- See center financial data by default
- See children outside assigned classes

### Director

Can:

- Manage center/classes/users
- Approve child join requests
- View all center children
- Send center-wide notices
- Manage payments
- View center analytics

### Platform Admin

Can:

- Manage platform-level settings
- Manage organizations
- Access support tools

Sensitive data access should always create audit logs.

## 9. API Design

Example app API routes exposed through oRPC/OpenAPI:

```text
POST   /auth/login
POST   /auth/otp/request
POST   /auth/otp/verify
POST   /auth/logout

GET    /me
PATCH  /me
DELETE /me

GET    /parent/children
POST   /parent/children
PATCH  /children/:childId

GET    /centers/search?q=
POST   /centers/:centerId/join-requests

GET    /children/:childId/workspace

GET    /children/:childId/reports
GET    /reports/:reportId
POST   /teacher/reports
PATCH  /teacher/reports/:reportId
POST   /teacher/reports/:reportId/publish

GET    /children/:childId/notices
POST   /teacher/notices
POST   /notices/:noticeId/read
POST   /notices/:noticeId/confirm

GET    /children/:childId/albums
POST   /teacher/albums

GET    /children/:childId/schedules
POST   /director/schedules

GET    /children/:childId/meal-plans
POST   /director/meal-plans

POST   /children/:childId/medication-requests
GET    /teacher/medication-requests
PATCH  /teacher/medication-requests/:id

POST   /children/:childId/return-home-requests
GET    /teacher/return-home-requests
PATCH  /teacher/return-home-requests/:id

GET    /children/:childId/attendance
POST   /teacher/attendance
PATCH  /teacher/attendance/:id

GET    /children/:childId/invoices
POST   /payments/:invoiceId/start
POST   /webhooks/payme
POST   /webhooks/click
```

## 10. Notification Events

Send notifications for:

```text
Daily report published
New notice
Notice requires confirmation
Album uploaded
Schedule changed
Meal plan posted
Medication request status changed
Return-home request confirmed
Attendance check-in
Attendance check-out
Invoice issued
Payment received
Join request approved/rejected
```

## 11. Uzbekistan Localization

### Languages

Support:

- Uzbek
- Russian

### Authentication

Prefer:

- Phone number login
- Better Auth for identity/session management
- Phone OTP sent through Eskiz.uz

### Payments

Support:

- Click
- Payme
- Uzum
- Cash
- Bank transfer

### Notifications

Support:

- Push notifications
- SMS

### Local Role Labels

Guardian relationship examples:

```text
Ona
Dada
Buvi
Bobo
Amaki
Tog'a
Opa
Aka
Guardian
```

## 12. MVP Scope

Build this first:

```text
1. Auth by phone number
2. Parent account and My Info
3. Center, class, teacher, child setup
4. Add child by searching center
5. Director approval of join request
6. Parent child workspace
7. Daily reports
8. Notices with read receipts
9. Albums/photos
10. Attendance
```

Build next:

```text
11. Meal plans
12. Medication requests
13. Return-home requests
14. Schedule
15. Payments
16. Messaging
17. Analytics
```

## 13. Suggested Development Phases

### Phase 1: Foundation

- Database schema
- Auth
- Users/roles
- Centers/classes
- Children/guardians/enrollments

### Phase 2: Parent and Teacher Core

- Parent home
- Child workspace
- Teacher class dashboard
- Daily reports
- Notices
- Albums

### Phase 3: Operations

- Attendance
- Meal plans
- Medication
- Return-home
- Schedule

### Phase 4: Business

- Payments
- Director dashboard
- Reports/analytics
- Audit logs
- Support tools

## 14. Important Product Decisions

### Multi-tenant Design

Every operational table should be scoped by `center_id` or `organization_id`.

### Child Privacy

Parents must only see their linked children. Album photos should use child tagging or class-level permission.

### Approval Flow

A parent should not be able to freely join any kindergarten. The center must approve the child.

### Auditability

Any sensitive child data access should be logged.

### Offline/Low Data

For Uzbekistan, support slow connections:

- Image compression
- Upload retry
- Draft reports
- Low-data mode

## 15. ERD Summary

```text
organizations
  -> centers
    -> branches
    -> classes
      -> teacher_class_assignments
      -> child_enrollments
      -> daily_reports
      -> notices
      -> album_posts
      -> attendance_records

users
  -> user_roles
  -> parent_profiles
  -> teacher_profiles
  -> child_guardians
  -> user_consents
  -> user_notification_settings
  -> device_tokens

children
  -> child_guardians
  -> child_enrollments
  -> daily_reports
  -> attendance_records
  -> medication_requests
  -> return_home_requests
  -> invoices

media_assets
  -> media_links

notices
  -> notice_recipients

album_posts
  -> media_links
  -> album_post_children

invoices
  -> payments
```

## 16. Recommended First Database Indexes

```sql
CREATE INDEX idx_centers_name ON centers USING gin (to_tsvector('simple', name));
CREATE INDEX idx_classes_center_id ON classes(center_id);
CREATE INDEX idx_child_guardians_user_id ON child_guardians(user_id);
CREATE INDEX idx_child_enrollments_child_id ON child_enrollments(child_id);
CREATE INDEX idx_child_enrollments_center_id ON child_enrollments(center_id);
CREATE INDEX idx_daily_reports_child_date ON daily_reports(child_id, report_date DESC);
CREATE INDEX idx_notices_center_published ON notices(center_id, published_at DESC);
CREATE INDEX idx_notice_recipients_user_id ON notice_recipients(user_id, read_at);
CREATE INDEX idx_album_posts_class_published ON album_posts(class_id, published_at DESC);
CREATE INDEX idx_attendance_child_date ON attendance_records(child_id, attendance_date DESC);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
CREATE INDEX idx_audit_logs_actor_time ON audit_logs(actor_user_id, created_at DESC);
```

## 17. Final Recommendation

The first version should focus on communication and trust, not on every possible kindergarten management feature.

Start with:

- Child profiles
- Center/class linking
- Daily reports
- Notices
- Albums
- Attendance

Then add:

- Meal plans
- Medication
- Return-home
- Payments
- Messaging

This gives Kichkintoy a strong local advantage through phone-first login, Uzbek/Russian localization, SMS support, and local payment integrations.

## 18. Final Technology Choices

Use this stack for the first production version:

```text
Backend:
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- oRPC
- Zod schemas
- OpenAPI generation
- Better Auth with Prisma adapter

Web:
- Next.js
- TypeScript

Mobile:
- React Native
- TypeScript

Storage:
- Cloudflare R2

App Push Notifications:
- Firebase Cloud Messaging
- APNs for iOS through Firebase/native credentials

SMS Notifications:
- Eskiz.uz for Uzbekistan-first SMS
```

## 19. API Strategy

Use oRPC first for the main app API, with Zod schemas and OpenAPI generation.

oRPC keeps TypeScript end-to-end developer experience while still allowing OpenAPI contracts. That matters if Kichkintoy later integrates with ads, payment providers, schools, partners, or external systems.

Recommended API structure:

```text
Primary API:
- oRPC
- JSON
- Zod
- OpenAPI
- Versioned paths: /api/v1

External partner API:
- Stable REST/OpenAPI endpoints
- Webhooks
- API keys

Internal async work:
- Redis queues
- Background workers
```

This avoids forced migration if the product succeeds. oRPC gives type safety for the Next.js and React Native apps, while OpenAPI and REST-style partner endpoints keep the door open for external contracts, ads, payment callbacks, government integrations, and webhooks.

Recommended route groups:

```text
/api/v1/auth
/api/v1/children
/api/v1/centers
/api/v1/reports
/api/v1/notices
/api/v1/albums
/api/v1/attendance
/api/v1/payments
/api/v1/notifications
```

## 20. Storage Strategy

Use Cloudflare R2.

Reasons:

- Has a free tier suitable for MVP
- S3-compatible API
- No egress fees
- Good security controls

Important backend rule:

Do not let mobile or web upload files through the NestJS server directly. Use signed upload URLs.

Recommended flow:

```text
1. Mobile app asks NestJS for upload URL
2. NestJS checks permission
3. NestJS creates signed R2 upload URL
4. Mobile uploads directly to R2
5. Mobile tells NestJS upload is complete
6. NestJS stores media metadata in PostgreSQL
```

This protects your backend from heavy file traffic and keeps uploads scalable.

## 21. Notification Strategy

Use two notification layers:

```text
Layer 1: In-app notification record
Layer 2: Delivery channel
```

Every important event should first create a row in the `notifications` table. Then a worker sends it through push or SMS.

Recommended delivery priority:

```text
Normal event:
1. Push notification
2. In-app notification

Important event:
1. Push notification
2. SMS fallback if user has not read it after a configured time

Critical event:
1. Push notification
2. SMS immediately
3. Optional phone call/manual follow-up by center
```

Examples:

```text
Daily report published:
- Push only

New notice:
- Push + in-app

Medication request confirmed:
- Push + optional SMS

Child checked out:
- Push + SMS if enabled

Payment overdue:
- Push first, SMS later
```

## 22. Redis Usage

Use Redis for:

- Queues
- Rate limiting
- OTP attempt limits
- Notification jobs
- SMS retry jobs
- Temporary session/cache data
- Idempotency keys for webhooks

Recommended NestJS packages:

```text
@nestjs/bullmq
bullmq
ioredis
```

## 23. Prisma Usage

Use Prisma for:

- Main PostgreSQL schema
- Type-safe database access
- Migrations
- Seed scripts

Keep complex reporting queries in SQL views or raw SQL when Prisma becomes awkward.

Important rule:

Do not hide business logic inside Prisma middleware. Keep business rules in NestJS services where they are easier to test.

## 24. oRPC and Auth Decision

### API Choice

Use oRPC for the main app API.

Recommended API strategy:

```text
Main app API:
- oRPC
- Zod
- OpenAPI

External partner API:
- Stable REST-style OpenAPI endpoints
- API keys
- Webhooks
- Versioned paths
```

This gives the developer experience of RPC without losing the business value of OpenAPI contracts.

### Auth Choice

Use Better Auth for the MVP.

Recommended auth setup:

```text
Auth:
- Better Auth
- Prisma adapter
- Phone number plugin
- Phone OTP
- Eskiz.uz SMS delivery
- Session/JWT strategy tested on web and React Native
```

Better Auth should only own login, session, and user identity. It should not become the whole product permission system.

Simple rule:

```text
Better Auth = who is logged in?
Kichkintoy database permissions = what can they access?
```

Keep product permissions in your own tables:

```text
user_roles
child_guardians
teacher_class_assignments
child_enrollments
```

Authorization should be implemented with custom NestJS guards and service-level permission checks using those tables.
