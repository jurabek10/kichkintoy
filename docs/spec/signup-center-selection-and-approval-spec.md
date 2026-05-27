# Signup Center Selection And Director Approval Spec

## 1. Scope

This spec extends [`web-authentication-process-spec.md`](./web-authentication-process-spec.md) with two missing pieces in the signup experience:

- Letting a user link their account to a specific kindergarten center during signup.
- Requiring a director (or an authorized teacher) to approve parent and teacher join requests before the account becomes fully active inside that center.

It is modeled on the Kidsnote flow. The decisions in this spec were verified against Kidsnote's official guide pages (with-kidsnote.com), Kidsnote's business FAQ (kidsnote.biz), the Kidsnote terms of service, and Kidsnote's product blog. Where this spec deviates from Kidsnote, the deviation is called out explicitly.

In scope:

- A new "Center Selection" step inserted after role selection in web signup.
- Role-specific signup branches (director, teacher, parent).
- An invitation-acceptance branch that short-circuits the search step when the user was invited by SMS.
- A pending account state for accounts that exist but are not yet approved at any center.
- A director-side approval inbox for incoming join requests.
- A director-side invitation tool that lets a director invite a teacher or parent by phone number.
- Notifications to parents and teachers when their request is approved or rejected.

Out of scope:

- Mobile signup screens. Mobile signup is not changed by this work.
- Center creation by platform admins (handled separately under platform admin tools).
- Payments, daily reports, or anything past the linking/approval handshake.

## 2. Why This Step Exists

The product rule from [`kichkintoy-uzbekistan-system-design.md`](../design/kichkintoy-uzbekistan-system-design.md) §14:

> A parent should not be able to freely join any kindergarten. The center must approve the child.

Kidsnote enforces the same rule. A parent without an invitation can find any center and submit a join request, but the badge **승인대기중** ("Awaiting approval") stays on the account until the director or an assigned teacher approves it, and none of the center's features are visible until then.

This spec defines:

- How the user picks the right center during signup (search, or accept an invitation).
- How the system creates a pending link instead of a permanent membership.
- How the director (or an assigned teacher) sees, reviews, approves, or rejects that link.
- How the director sends SMS invitations to skip the approval step for known parents and teachers.

## 3. Vocabulary

- **Center**: a single kindergarten location. Identified by `Center.id` (UUID) and `Center.centerCode` (short human-readable code, unique). In Kidsnote terminology this is "원" (won).
- **Facility type**: the kind of center — `kindergarten`, `daycare`, or `academy`. Kidsnote calls these 유치원 / 어린이집 / 학원.
- **Join request**: a row in `center_join_requests`. Statuses: `pending`, `approved`, `rejected`, `cancelled`.
- **Invitation**: a row in `center_invitations` created by a director (or by a teacher with permission). It is addressed to a specific phone number and a specific class. The recipient gets an SMS and, after signing up, sees an invitation card on the role-selection screen that auto-fills the center and class.
- **Pending account**: a user whose account exists, can sign in, but has no approved `UserRole` or `ChildEnrollment` at any center yet. The UI surfaces this as the "Awaiting approval" state.
- **Approver**: a user authorized to approve join requests for a given center. Always includes any user with role `director` or `organization_owner` scoped to that center; optionally includes teachers who have been granted the approver permission flag (see §9.4).
- **Membership**: the combination of an approved `UserRole` (teacher/director) or an active `ChildEnrollment` + `ChildGuardian` (parent) at a given center.

## 4. End-To-End Flow Summary

Three roles. Two entry points for each non-director role (invited vs. self-search). One entry point for directors.

```text
Parent (invited by SMS)
  Step 1: Personal info + phone verification     (existing)
  Step 2: Account credentials                    (existing)
  Step 3: Role selection                         (existing)
          -> Banner appears at the bottom of the role-selection card:
             "You have an invitation from <Center> for class <Class>. [Accept]"
          -> Tapping Accept sets role = parent, center = <Center>, class = <Class>
             and skips the center-search step.
  Step 4: Child information                      (existing)
  Step 5: Child info confirmation modal          (existing)
  Step 6: Parent relationship type               (existing)
  Step 7: Submit -> account active immediately, child + enrollment created.

Parent (no invitation, self-search)
  Steps 1-3 as above. Role = parent.
  Step 4: Center search (Region -> District -> Name)   (new)
  Step 5: Class picker (choose from the center's classes) (new)
  Step 6: Child information                      (existing)
  Step 7: Child info confirmation modal          (existing)
  Step 8: Parent relationship type               (existing)
  Step 9: Submit -> account created in pending state, join request created.
  Step 10: Waiting-for-approval screen.
  Step 11: Director or assigned teacher approves -> parent gains access.

Teacher (invited by SMS)
  Steps 1-3 as above.
  Same banner accept pattern as the parent invited path; role = teacher,
  center + class taken from the invitation.
  Submit -> account active immediately, teacher_class_assignments row created.

Teacher (no invitation, self-search)
  Steps 1-3 as above. Role = teacher.
  Step 4: Center search (Region -> District -> Name)
  Submit -> account created in pending state, join request created (kind = teacher).
  Director or assigned teacher approves -> teacher gains access.

Director
  Steps 1-3 as above. Role = director.
  Step 4: Center search (Facility type -> Region -> District -> Name)
          -> If a result is found and selected, treat as "claim existing center":
             submit a join request with kind = director. An existing director at
             that center must approve.
          -> If no match (or the user clicks "Can't find your kindergarten?"),
             continue to Step 5.
  Step 5: Create a new center
          Inputs: facility type, organization (legal) name, kindergarten name,
                  region, district, address, center phone, default language.
  Step 6: Submit
          - "Claim existing" path: account in pending state until approved.
          - "Create new" path: account active immediately; the user becomes
            organization_owner of a new organization and director of the new center.
```

The "Region → District → Name" cascade comes directly from Kidsnote and is the single most reliable way to scope search in a country with many same-named kindergartens.

## 5. Step: Center Selection (Parent And Teacher, Self-Search Path)

### 5.1 Layout

Rounded card layout from the existing auth spec.

```text
Find your kindergarten

Region          [ Select region          v ]
District        [ Select district        v ]   (disabled until region picked)

Search          [ Search by kindergarten name        ] [ Search ]

[ Center result card  - selected ]
[ Center result card             ]
[ Center result card             ]

Can't find your kindergarten? Ask your director to send you an invitation,
or [ enter a direct center code ].

[ Back ]                                              [ Next ]
```

### 5.2 Region And District Dropdowns

- Region is a fixed list of Uzbekistan regions (Tashkent City, Tashkent Region, Samarkand, Bukhara, Andijan, etc.).
- District is loaded from the API based on the selected region.
- Both are required before name search returns results.
- Reason: Kidsnote uses province → district → name and this dramatically reduces false matches for common kindergarten names. It is also the dominant address structure in Uzbekistan.

### 5.3 Name Search

- Triggers on Enter, on Search button click, and (debounced) as the user types after the third character.
- Server returns up to 20 results scoped by region + district.
- Minimum 2 characters in the name field.

### 5.4 Direct Center Code (Fallback)

A small link "enter a direct center code" reveals a single input. If the user enters a valid `Center.centerCode`, the center is selected directly and the region/district dropdowns get pre-filled to match. This path is for users who already know the code (forwarded by their director). It is intentionally not the primary path because Kidsnote's experience shows that most users do not know the code, and surfacing it as primary leads to typos and frustration.

### 5.5 Result Card

Each card shows:

- Center name
- Facility type badge (Kindergarten / Daycare / Academy)
- District + first line of address
- Center phone (small)
- A Select button. The whole card is clickable.

The selected card is visually highlighted (border + check icon). Only one selection allowed.

### 5.6 Empty And Error States

- No region picked yet: empty list with a hint "Choose a region to start."
- No district picked: "Choose a district."
- No results after name search: "No kindergartens found in this district. Ask your director to send you an invitation."
- Inactive centers: shown disabled with tooltip "This center is not accepting new requests yet."
- Network error: "We could not load centers. Please try again."

### 5.7 Validation

A center must be selected before Next is enabled. The selected center's status must be `active`.

### 5.8 Behavior By Role

- **Parent**: continues to the class-picker step (§6).
- **Teacher**: skips the class picker. A teacher's class assignments are decided by the director after approval; nothing about classes is asked during teacher self-signup.

## 6. Step: Class Picker (Parent, Self-Search Path)

Once a parent has selected a center, they pick the class their child will (or already does) attend.

### 6.1 UI

```text
Which class is your child in?

[ Class card: "Quyoshcha (Age 3-4, Morning)" ]
[ Class card: "Yulduzcha (Age 4-5)"           ]
[ Class card: "Bilim (Age 5-6)"               ]

Not sure of the class? [ I don't know yet ]

[ Back ]                                          [ Next ]
```

- Loaded from `GET /centers/:centerId/classes` (only classes with status `active`).
- Cards show class name, age group, and academic year if present.
- "I don't know yet" sends the join request without a `requested_class_id`. The director picks the class at approval time.

This matches Kidsnote: the parent picks the class (반) from the center's list during signup, with a graceful fallback when they don't know.

### 6.2 Why Not Free Text

The first version of this spec used a free-text class field. Kidsnote does not — and for good reason: a free-text class name on a join request creates inconsistent class taxonomy inside the center and the director has to manually reconcile it on approval. Picking from the center's own classes also guarantees that on approval the system can create a real `ChildEnrollment` row pointing at a real `Class.id`.

## 7. Step: Center Setup (Director)

### 7.1 Single Search Flow

Directors do not see a "create vs join" choice up front. They run a single search and the system branches based on the result.

```text
Set up your kindergarten

Facility type   ( ) Kindergarten  ( ) Daycare  ( ) Academy
Region          [ Select region          v ]
District        [ Select district        v ]
Name            [ Search by kindergarten name        ] [ Search ]

[ Center result card ]
[ Center result card ]

Can't find your kindergarten?
[ Create a new one ]
```

### 7.2 If A Center Is Found And Selected (Claim Existing)

Submitting the form creates a `center_join_requests` row with `kind = director`, scoped to that center, status `pending`. An existing director (or organization owner) at that center receives this in their approval inbox and must approve. Until then the new director's account is in the pending state.

### 7.3 If No Result Or "Create A New One" Clicked

The director is taken to a Create Center form:

```text
Create your kindergarten

Facility type           [ pre-filled from search ]
Organization name       (legal entity)
Kindergarten name       (display name parents will search for)
Region                  [ pre-filled from search ]
District                [ pre-filled from search ]
Address
Center phone
Default language        ( ) Uzbek  ( ) Russian
```

On submit:

- Create an `organizations` row owned by the user.
- Create a `centers` row with a generated unique `center_code` (8 chars, e.g. `KIC-7HQ4`). Status starts as `active` so parents can find it immediately. Platform admins can later mark it `verified` for a trust badge.
- Create two `user_roles` rows: `organization_owner` scoped to the new organization, and `director` scoped to the new center.
- Mark the user as fully active.

### 7.4 One Center Per Account: Kidsnote's Rule, Our Adaptation

Kidsnote's stated policy: **"키즈노트는 원장님 아이디 하나당 하나의 원을 관리하실 수 있습니다"** ("Kidsnote lets each director account manage one center. For additional centers, a separate signup is required.").

For Kichkintoy in Uzbekistan we relax this rule because chain kindergartens with multiple branches are common locally. We allow:

- One `organization_owner` role per user is fine.
- That user can have `director` roles at multiple centers within their organization.
- A user who is a director at someone else's center cannot also be a director at an unrelated organization without that other organization owner's approval.

This is captured in §13 (data model) and §9 (approval inbox).

## 8. Invitations (Director → Teacher / Parent)

This replaces the invite-code system from v1 of this spec. Kidsnote uses phone-number invitations exclusively; the user does not type a code.

### 8.1 Director Sends An Invitation

From the director dashboard, the director taps Invite (eventually under a Center Settings → People area). The dialog asks:

- Invitee type: **Parent** or **Teacher**
- Class: dropdown of the center's active classes (optional for teachers, required for parents)
- Phone number: international format, validated
- For parent invitations only: optional child name pre-fill that appears on the parent's invitation card

On submit:

- Create a `center_invitations` row (see §13.2). Status = `pending`. Generates a `code` (short, single-use, used only as an internal handle — not shown to the user).
- Send an SMS via Eskiz to the phone number: "Kichkintoy: <Center> invited you. Open the app and sign up to accept. <short link>"
- Mark the invitation `sent_at`.

### 8.2 Invitee Receives The Invitation

The SMS link opens the signup web page on web (or deep-links to the mobile app on mobile). The link carries an opaque token.

When the invitee finishes Step 1 (phone verification) and Step 2 (credentials), and lands on Step 3 (role selection), the role-selection screen looks for any pending invitations matching their verified phone number. If any exist, an invitation card appears at the bottom of the role-selection card:

```text
You have been invited

[ logo ] Sunshine Kindergarten
        Role: Teacher
        Class: Quyoshcha
        Invited 2 hours ago

[ Decline ]    [ Accept invitation ]
```

Accepting:

- Marks the `center_invitations` row `accepted_at`.
- Sets the role on the in-progress signup to match the invitation (parent or teacher).
- Pre-fills `centerId` and (for parents) `classId`.
- Skips the center-search step (§5) and the class-picker step (§6).
- Routes parent invitees directly to the child information step.
- Routes teacher invitees directly to submit (no extra steps).
- On final submit: the account is created **active** (no pending state), and all approval-time side effects (UserRole / ChildEnrollment / TeacherClassAssignment) happen right away.

Declining:

- Marks the invitation `declined_at` so the director sees it on the dashboard.
- The user continues with normal self-search signup.

### 8.3 Multiple Invitations

If a user has more than one pending invitation (rare but possible: e.g. they have two children in two different kindergartens), all matching invitations are listed on the role-selection screen. The user picks one. Accepting one does not auto-decline the others — those stay open and the user can accept them later by adding another child / center after signup.

### 8.4 Invitation Lifecycle Rules

- Expires after 14 days. The director can resend (which extends the expiry) or revoke.
- Single-use: once `accepted_at` is set, the invitation cannot be reused.
- Invitations are matched by **verified phone number**, not by the user typing a code. This is the Kidsnote pattern and the right pattern: it makes the experience invisible to the user.

## 9. Director Approval Inbox

A new page on the director web dashboard. This spec defines the data and the trigger; the dashboard team will use this as the contract.

### 9.1 Page Location

`/dashboard/requests` inside the director dashboard.

### 9.2 List View

A table with columns:

- Request type (Parent / Teacher / Director)
- Name (user's full name)
- Phone (user's verified phone)
- Child name (for parent requests only)
- Requested class (for parent requests, if provided)
- Submitted at
- Status (pending / approved / rejected) — default filter is pending
- Actions: View, Approve, Reject

### 9.3 Detail View

Clicking a row opens a side panel with:

- For parent requests: requester info, child info (name, DOB, gender, photo, requested class, parent relationship type), and an optional message from the parent.
- For teacher requests: requester info and any optional note.
- For director (claim existing) requests: requester info and a clear "This person is asking to be added as a director" warning banner.

Approve action:

- Confirm modal: "Approve <Name>? They will gain access to <Center>."
- For parent requests with no `requested_class_id`, the approver must pick a class before confirming.
- On confirm:
  - Update `center_join_requests.status` to `approved`, set `reviewed_by_user_id` and `reviewed_at`.
  - For parent: create `children` row, create `child_guardians` row linking parent + child, create `child_enrollments` row scoped to the center and the chosen class, and ensure a `user_roles` row with role `parent` exists for the parent at the center.
  - For teacher: create `user_roles` row with role `teacher` scoped to the center. Class assignments are handled separately on the dashboard.
  - For director (claim existing): create `user_roles` row with role `director` scoped to the center.
  - Send notification to the requester (see §10).
  - Write an `audit_logs` row with action `join_request.approved`.

Reject action:

- Confirm modal with optional reason text input (max 500 chars).
- On confirm:
  - Update `center_join_requests.status` to `rejected`, set reviewer + timestamp, store reason in a new `reviewer_message` column (§13.2).
  - Send notification to the requester.
  - Write an `audit_logs` row with action `join_request.rejected`.

### 9.4 Who Can Approve

Kidsnote allows the director (원장님) or any teacher granted approval permission to act on join requests, via 원 설정 > 교사 관리. We follow the same model.

The default approvers for a center are:

- All users with role `director` or `organization_owner` scoped to that center's organization.

A director can additionally grant the `can_approve_members` flag to specific teachers from the dashboard. This is stored on the teacher's `user_roles` row (see §13.2). Teachers without that flag never see the approval inbox.

Director-kind requests (someone trying to claim an existing center as a director) can **only** be approved by an existing director or organization owner of that center, never by a teacher, regardless of the flag.

### 9.5 Audit Trail

Every approve and reject action writes an `audit_logs` row that includes:

- `actor_user_id` (the approver)
- `action` (`join_request.approved` or `join_request.rejected`)
- `entity_type` = `center_join_request`
- `entity_id` = the request id
- `metadata` = `{ kind, requester_user_id, center_id }`

## 10. Notifications

For each lifecycle event, create a `notifications` row and send through the appropriate channel.

| Event | Recipient | In-app | Push | SMS |
|---|---|---|---|---|
| Invitation sent | Invitee (by phone) | n/a (no account yet) | n/a | yes |
| Invitation accepted | Inviting director | yes | yes | no |
| Invitation declined | Inviting director | yes | no | no |
| Join request submitted | All approvers of the target center | yes | yes | no |
| Join request approved | Requester | yes | yes | yes |
| Join request rejected | Requester | yes | yes | yes |
| Join request cancelled by requester | All approvers of the target center | yes | no | no |

SMS copy examples (translate to Uzbek and Russian):

- Invitation: "Kichkintoy: <Center> invited you. Open the app to accept. <link>"
- Approved: "Kichkintoy: your request to join <Center> was approved. Open the app to see your child."
- Rejected: "Kichkintoy: your request to join <Center> was not approved. You can choose a different center in the app."

## 11. Pending Account State

After a parent or teacher (or director joining an existing center) completes signup via the self-search path, their account exists but they have no approved membership yet.

### 11.1 What Pending Users Can Do

- Log in.
- See a waiting-for-approval screen (§11.3).
- Edit their own personal info (name, phone with re-verification, avatar, language preference).
- Cancel their pending join request.
- Submit a new join request to a different center (cancels any earlier pending request).
- Log out.

### 11.2 What Pending Users Cannot Do

- See any child workspace, daily report, notice, album, schedule, meal plan, attendance, medication, or return-home data.
- Message anyone.
- View any other parent or teacher in the center.

### 11.3 Waiting Screen

After login, route pending users to a dedicated screen. This mirrors Kidsnote's "승인대기중" badge but as a full screen since web users do not have the same bottom-nav context as the Kidsnote mobile app.

```text
Awaiting director approval

Your request to join "<Center Name>" was sent on <date>.
The director will review it soon. We will notify you here and by SMS.

If you are not approved within 24 hours, try contacting the center directly:
<center phone>

[ Cancel request ]      [ Choose a different center ]
```

If the request was rejected, show:

```text
Your request was not approved

The director of "<Center Name>" did not approve this request.
Optional reason: "<reviewer message, if provided>"

[ Choose a different center ]
```

## 12. Validation And Error Handling

Add these errors to the auth error catalog:

- Region is required.
- District is required.
- Center is required.
- Center is not accepting new requests.
- You already have a pending request at this center.
- This invitation has expired.
- This invitation was already used.
- Director invitations can only be acted on by an existing director or organization owner.

Server-side rules:

- A user may have at most one `pending` `center_join_requests` row at a time. Submitting a new request automatically cancels any existing pending request (set `status = 'cancelled'`, `cancelled_at = now()`).
- A user may have multiple `approved` join requests over time across different centers (parents can have children at multiple centers).
- An invitation is matched by exact verified phone number. We do not show invitations to a user whose phone is unverified.

## 13. Data Model

### 13.1 Use Of Existing Tables

The existing schema already supports most of this flow. New behavior on existing tables:

- `center_join_requests`: now used for teacher and director requests too, not only parent requests. Add a `kind` column (`parent` | `teacher` | `director`).
- `user_roles`: a parent's `UserRole` row is created at approval time (or at invitation-accept time), not at signup time. Adds a `can_approve_members` flag for teacher rows.
- `children` / `child_guardians` / `child_enrollments`: the parent self-signup flow creates these only on director approval. Before approval, child information lives on the `center_join_requests` row.

### 13.2 New / Changed Columns

```sql
ALTER TABLE center_join_requests
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'parent',
  ADD COLUMN child_photo_url TEXT,
  ADD COLUMN parent_relationship TEXT,
  ADD COLUMN custom_relationship_label TEXT,
  ADD COLUMN reviewer_message TEXT,
  ADD COLUMN cancelled_at TIMESTAMPTZ;

ALTER TABLE center_join_requests
  ADD CONSTRAINT center_join_requests_kind_check
    CHECK (kind IN ('parent', 'teacher', 'director'));

ALTER TABLE user_roles
  ADD COLUMN can_approve_members BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE centers
  ADD COLUMN facility_type TEXT NOT NULL DEFAULT 'kindergarten';
-- facility_type CHECK constraint: ('kindergarten', 'daycare', 'academy')
```

Recommended additional index for the director inbox query:

```sql
CREATE INDEX idx_center_join_requests_center_status
  ON center_join_requests(center_id, status, created_at DESC);
```

### 13.3 New Table: `center_invitations`

```sql
CREATE TABLE center_invitations (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,                          -- 'parent' | 'teacher'
  class_id UUID REFERENCES classes(id),        -- required when kind = 'parent'
  phone TEXT NOT NULL,
  child_name_hint TEXT,                        -- optional, for parent invitations
  code TEXT UNIQUE NOT NULL,                   -- opaque token in SMS link
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES users(id),
  declined_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_center_invitations_phone_open
  ON center_invitations(phone)
  WHERE accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_center_invitations_center
  ON center_invitations(center_id, created_at DESC);
```

The partial index makes "find open invitations for this verified phone" cheap, which is the hot lookup performed every time someone hits the role-selection screen.

### 13.4 Approval Atomicity

All side effects of an approval (status update, role creation, child creation, enrollment, notification queueing, audit log) must run in a single Prisma transaction. If any step fails, the request stays `pending` and no membership is created. The same rule applies to invitation acceptance.

## 14. API Endpoints

Add these endpoints to the existing `/auth`, `/centers`, and director route groups.

### 14.1 Public (Signup)

```text
GET    /geo/regions
GET    /geo/regions/:regionId/districts

GET    /centers/search?regionId=&districtId=&q=&facilityType=
  Returns up to 20 centers matching the filters.
  Response: [{ id, name, centerCode, facilityType, region, district, address, phone, status }]

GET    /centers/by-code?code=
  Direct lookup by center_code. Returns the same shape with a single result or 404.

GET    /centers/:centerId/classes
  Returns active classes for the class-picker step.

GET    /auth/me/invitations
  Authenticated, called immediately after phone verification on the role-selection
  screen. Returns any pending invitations matching the verified phone number.

POST   /auth/me/invitations/:invitationId/accept
POST   /auth/me/invitations/:invitationId/decline

POST   /auth/register
  Existing endpoint. Payload extended (§14.3).

POST   /auth/me/join-requests
  Authenticated. Lets a pending user submit a new join request after signup.

DELETE /auth/me/join-requests/:requestId
  Authenticated. Cancels the user's own pending request.
```

### 14.2 Director

```text
GET    /director/centers/:centerId/join-requests?status=pending
POST   /director/centers/:centerId/join-requests/:requestId/approve
  body for parent kind without requested_class_id: { classId: 'uuid' }
POST   /director/centers/:centerId/join-requests/:requestId/reject
  body: { reason?: string (max 500) }

POST   /director/centers/:centerId/invitations
  body: { kind: 'parent' | 'teacher', phone, classId?, childNameHint? }
GET    /director/centers/:centerId/invitations
POST   /director/centers/:centerId/invitations/:invitationId/resend
DELETE /director/centers/:centerId/invitations/:invitationId   (revokes)

PATCH  /director/centers/:centerId/teachers/:userId
  body: { canApproveMembers: boolean }
```

### 14.3 Updated Register Payload Shape

```json
{
  "fullName": "string",
  "phoneNumber": "string",
  "phoneVerificationToken": "string",
  "username": "string",
  "password": "string",
  "role": "parent | teacher | director",

  "invitationId": "uuid",

  "centerSelection": {
    "centerId": "uuid",
    "classId": "uuid"
  },

  "directorSetup": {
    "mode": "claim_existing | create_new",
    "claimExisting": { "centerId": "uuid" },
    "createNew": {
      "facilityType": "kindergarten | daycare | academy",
      "organizationName": "string",
      "centerName": "string",
      "regionId": "uuid",
      "districtId": "uuid",
      "address": "string",
      "centerPhone": "string",
      "defaultLanguage": "uz | ru"
    }
  },

  "child": {
    "name": "string",
    "image": "url",
    "dateOfBirth": "YYYY-MM-DD",
    "gender": "boy | girl | prefer_not_to_say",
    "relationshipType": "mom | dad | grandmother | grandfather | uncle | aunt | brother | sister | guardian | other",
    "customRelationshipLabel": "string"
  }
}
```

Conditional shape rules:

- If `invitationId` is present, the server takes the role, center, and (for parents) class from the invitation. `centerSelection` is ignored if present.
- Otherwise `centerSelection.centerId` is required when `role` is `parent` or `teacher`. `centerSelection.classId` is required when `role` is `parent` and the parent picked a class; if the parent chose "I don't know yet", omit `classId`.
- `directorSetup` is required when `role` is `director`. Exactly one of `claimExisting` or `createNew` must be present, matching `mode`.
- `child` is required when `role` is `parent`. Existing rule from the auth spec.

### 14.4 Register Response

Add a `membership` field so the web client can route correctly:

```json
{
  "user": { "id": "uuid", "fullName": "string", "role": "parent" },
  "session": { "token": "string", "expiresAt": "iso8601" },
  "membership": {
    "status": "active | pending",
    "joinRequestId": "uuid | null",
    "centerId": "uuid | null",
    "centerName": "string | null"
  }
}
```

The web client routes:

- `membership.status === "active"` → child workspace / director dashboard / teacher dashboard.
- `membership.status === "pending"` → waiting-for-approval screen (§11.3).

## 15. Accessibility

In addition to the requirements from the existing auth spec:

- The region and district dropdowns must be keyboard-navigable and screen-reader-labeled.
- Center search results must support arrow-key navigation; Enter selects.
- Each result card needs a clear accessible name combining center name and facility type, e.g. `"Sunshine Kindergarten, Yunusobod, Tashkent City"`.
- The invitation card on the role-selection screen must announce itself when it appears.
- The waiting-for-approval screen must announce status changes to screen readers when refreshed after approval or rejection.
- The director inbox table must be navigable by keyboard with visible focus states on row actions.

## 16. Visual Direction

Continue the rounded-card, soft-pastel direction from the existing auth spec.

- Center cards: white background, soft border, subtle hover shadow, primary-color border when selected.
- Step indicator differs by path:
  - Invited parent: 4 steps total.
  - Self-search parent: 6 steps total.
  - Invited teacher: 3 steps total (no child info, no class).
  - Self-search teacher: 4 steps total.
  - Director (create new): 4 steps total.
  - Director (claim existing): 4 steps total + pending screen.
- The invitation card on the role-selection screen uses a soft accent fill to draw attention but does not block the user from ignoring it and picking a different role.
- Waiting screen uses a friendly illustration (paper plane or hourglass) instead of an error tone.

## 17. Acceptance Criteria

Invitation path:

- A user whose verified phone matches a pending, unexpired invitation sees that invitation as a card on the role-selection screen.
- Accepting the invitation skips center search and class picker, fills in the appropriate fields, and produces an immediately active account on submit.
- Declining the invitation lets the user continue with normal self-search signup and marks the invitation as declined on the director side.

Self-search signup:

- A parent cannot complete signup without selecting a center and a class (or explicitly choosing "I don't know yet").
- A teacher cannot complete signup without selecting a center.
- Region and district must be picked before name search returns results.

Director signup:

- A director can search for a center; if found, the request is treated as "claim existing" and goes to the existing director's inbox.
- A director can create a brand-new center if their search returns no results.
- Creating a new center activates the account immediately.

Pending state:

- A pending user is routed to the waiting-for-approval screen after login.
- A pending user cannot access any child workspace or center data.
- A pending user can cancel their request and submit a new one for a different center.

Approval:

- Directors and any teacher with `can_approve_members = true` see join requests for the centers they belong to.
- Director-kind requests can only be approved by a director or organization owner of that center, never by a teacher with the flag.
- Approving a parent request creates the child, the guardian link, the enrollment, and the parent role in one transaction.
- Approving a teacher request creates the teacher role; class assignments are out of scope here.
- Rejecting a request stores the optional reviewer message and notifies the requester.

Invitations:

- A director can invite a parent or teacher by phone number from the dashboard.
- An invited user gets an SMS via Eskiz with a sign-up link.
- Invitations expire after 14 days unless resent.
- Revoking an invitation prevents it from being accepted.

Data integrity:

- A user can have at most one pending join request at a time.
- Approval side effects all succeed or all fail (single transaction).
- Every approve and reject action writes an `audit_logs` row.

## 18. Deviations From Kidsnote (Intentional)

Where this spec does not exactly match Kidsnote, and why:

- **Multiple centers per director account.** Kidsnote states one center per director account. We allow a single user to be director at multiple centers within the same organization, because multi-branch chains are common in Uzbekistan. Cross-organization director roles still require approval from each organization's owner.
- **Center code as a fallback search.** Kidsnote does not surface center codes in the parent flow. We keep a small "enter a direct center code" link for users who already know the code, because the existing system design doc lists "center number" as a valid lookup. This is opt-in and not the primary path.
- **Teacher approver flag is explicit.** Kidsnote shows the approval inbox to any teacher granted access via 교사 관리. We model the same idea explicitly with a `can_approve_members` flag on `user_roles`.
- **Web-first.** This spec defines the web experience first. Mobile-app behavior will follow in a separate spec; the data model and API are designed so mobile can reuse them unchanged.

## 19. Open Questions

- For "claim existing center" director requests, should the approval be limited to organization owners (rather than any director), to prevent rogue directors from approving fake co-directors?
- When a parent registers a child with the same name and DOB as a child already enrolled at the center, should the director see a "possible duplicate" warning before approving?
- Should rejected requests be hidden from the requester after some time, or kept visible indefinitely as history?
- Do we want a director's "add a parent directly" flow (skip the SMS invitation entirely and just create the membership), or is the invitation always the right entry point?
- Should we also support a printable QR code for invitations (parents scan the code at the center), in addition to SMS?
