# Web Authentication Process Spec

> **API note (updated 2026-05-31): the app API is oRPC-only.** The REST-style `METHOD /path` endpoints in this spec are conceptual — the live API is typed oRPC procedures in the shared contract ([`orpc-contract.ts`](../../packages/shared/src/api/orpc-contract.ts)), consumed on web via the typed `orpc` client + TanStack Query. Each maps to `orpc.<domain>.<procedure>`. See [`../adding-a-feature.md`](../adding-a-feature.md).

## 1. Scope

This spec defines the web-only authentication experience for Kichkintoy.

Mobile authentication is out of scope for this change. Existing mobile screens and flows should not be changed.

The web authentication experience includes:

- Login with username and password
- Multi-step signup
- Phone verification during signup
- Role selection for director, parent, or teacher
- Parent-only child profile creation
- Parent relationship type selection after child information is confirmed

The visual direction should be inspired by Kids Note: https://www.kidsnote.com/en

## 2. Product Goal

Create a friendly, trustworthy onboarding flow for kindergarten communication users in Uzbekistan.

The flow should feel simple for parents while still collecting enough information to create the correct account type and, for parents, the first child profile.

## 3. Design Direction

The web auth pages should follow the feeling of the Kids Note website:

- Clean white background with soft pastel accent colors
- Rounded cards and input fields
- Friendly childcare-focused illustrations or child/family imagery
- Strong primary CTA button
- Calm trust-building copy
- Lots of spacing
- Mobile-app inspired preview card or phone mockup on larger screens
- Simple top branding area with Kichkintoy logo/name

Recommended layout:

```text
Desktop:
Left side:
- Brand headline
- Short trust message
- Childcare/family illustration or app preview card

Right side:
- Auth card
- Step indicator
- Current form

Mobile/tablet:
- Single centered auth card
- Brand headline above the card
```

Recommended colors:

- Background: warm white or very light blue
- Primary CTA: soft green or blue
- Secondary/back button: white with border
- Error: red
- Success/verified state: green

## 4. Login Flow

Login is intentionally simple.

### Login Fields

- Username
- Password

### Login Actions

- Login
- Link to signup
- Optional "Forgot password" link if password recovery already exists

### Login Validation

- Username is required
- Password is required
- Show a generic error for invalid credentials:
  - "Username or password is incorrect."

## 5. Signup Flow Overview

Signup is a wizard with multiple pages.

```text
Step 1: Personal info and phone verification
Step 2: Account credentials
Step 3: Role selection
Step 4: Parent child info, only when role is parent
Step 5: Parent relationship type, only when role is parent
```

For director and teacher accounts, registration can complete after role selection unless the product later adds school/center invite requirements.

## 6. Signup Step 1: Personal Info And Phone Verification

### Fields

- Full name
- Phone number
- Verification code

### Actions

- Send Code button next to the phone number input
- Next button
- Back button

### UI Behavior

The phone input and Send Code button should be on the same row on desktop.

```text
[ Phone number input                  ] [ Send Code ]
```

On small screens, the Send Code button can stack below the phone input.

The verification code input appears below the name and phone fields.

### Validation

Before sending a code:

- Full name is not required for sending the code, but can remain visible
- Phone number is required
- Phone number must match the supported phone format

Before moving to the next step:

- Full name is required
- Phone number is required
- Verification code is required
- Verification code must be confirmed as valid

### Verification States

The UI should support these states:

- Idle: Send Code is available
- Sending: Send Code is disabled and shows loading
- Sent: Show helper text such as "Code sent to your phone."
- Countdown: Prevent immediate resend for a short period
- Verified: Show success state near the code input
- Error: Show error text for invalid or expired code

## 7. Signup Step 2: Account Credentials

### Fields

- Username
- Password
- Confirm password

### Actions

- Next button
- Back button

### Validation

- Username is required
- Username must be unique
- Password is required
- Password should meet the app password rules
- Confirm password is required
- Password and confirm password must match

Recommended password rules:

- Minimum 8 characters
- At least one letter
- At least one number

## 8. Signup Step 3: Role Selection

### Roles

- Director
- Parent
- Teacher

### UI

Use large selectable role cards instead of a basic dropdown.

Each card should include:

- Role title
- Short description
- Simple icon or illustration

Example copy:

- Director: "Manage your kindergarten, classes, teachers, and communication."
- Parent: "Follow your child's day and communicate with the kindergarten."
- Teacher: "Share reports, photos, notices, and attendance with families."

### Actions

- Next button
- Back button

### Behavior

- If role is Parent, Next opens the child information step.
- If role is Director, Next completes registration or moves to a future center setup step.
- If role is Teacher, Next completes registration or moves to a future invite/join step.

## 9. Signup Step 4: Parent Child Information

This step appears only when the selected role is Parent.

### Fields

- Child class
- Child image
- Child name
- Date of birth
- Gender

### Actions

- Register button
- Back button

### Field Details

Child class:

- Text input or searchable class selector
- If class data is not available yet, use a text input for the first implementation

Child image:

- Optional upload
- Accept image files only
- Show preview after upload
- Allow remove/change image

Child name:

- Required text input

Date of birth:

- Required date input
- Must not be in the future

Gender:

- Required selection
- Suggested values:
  - Boy
  - Girl
  - Prefer not to say

### Validation

Before registration:

- Child name is required
- Date of birth is required
- Gender is required
- Child class is required if the product requires a class at signup
- Child image is optional unless the product later makes it required

## 10. Child Info Confirmation Modal

After the parent clicks Register on the child information step, show a modal summarizing the child information.

### Modal Content

- Child image preview, if provided
- Child name
- Date of birth
- Gender
- Child class

### Modal Actions

- Edit
- Confirm

### Behavior

- Edit closes the modal and returns to the child information form.
- Confirm moves to parent relationship type selection.

## 11. Signup Step 5: Parent Relationship Type

This step appears only after the parent confirms child information.

### Field

Parent relationship type

### Suggested Options

- Mom
- Dad
- Grandmother
- Grandfather
- Uncle
- Aunt
- Brother
- Sister
- Guardian
- Other

### Actions

- Complete Registration button
- Back button

### Validation

- Parent relationship type is required
- If Other is selected, show an optional text field for custom relationship label

## 12. Data Captured

### User Account

- Full name
- Phone number
- Phone verified status
- Username
- Password hash
- Role

### Parent Child Profile

Only for parent signup:

- Child class
- Child image URL or file reference
- Child name
- Date of birth
- Gender
- Parent relationship type
- Optional custom relationship label

## 13. API Expectations

The frontend should be able to call or integrate with endpoints equivalent to:

```text
POST /auth/send-code
POST /auth/verify-code
POST /auth/check-username
POST /auth/register
POST /auth/login
```

The exact endpoint names can follow the existing backend conventions.

### Register Payload Shape

```json
{
  "fullName": "string",
  "phoneNumber": "string",
  "phoneVerificationToken": "string",
  "username": "string",
  "password": "string",
  "role": "parent | teacher | director",
  "child": {
    "className": "string",
    "image": "file-or-url",
    "name": "string",
    "dateOfBirth": "YYYY-MM-DD",
    "gender": "boy | girl | prefer_not_to_say",
    "relationshipType": "mom | dad | grandmother | grandfather | uncle | aunt | brother | sister | guardian | other",
    "customRelationshipLabel": "string"
  }
}
```

For teacher and director accounts, `child` should be omitted.

## 14. Error Handling

Show errors close to the related field where possible.

Common errors:

- Phone number is invalid
- Verification code is incorrect
- Verification code has expired
- Username is already taken
- Passwords do not match
- Required field is missing
- Registration failed
- Login failed

Avoid exposing sensitive auth details in error messages.

## 15. Accessibility Requirements

- All inputs must have labels
- Buttons must have clear text
- Modal must trap focus while open
- Modal can be closed with Escape
- Form errors must be readable by screen readers
- Step indicator should not rely on color alone
- Keyboard users must be able to complete the whole flow

## 16. Acceptance Criteria

- Web login allows users to sign in with username and password.
- Web signup starts with full name, phone number, Send Code button, verification code input, Next, and Back.
- User cannot continue past Step 1 until the phone code is valid.
- Step 2 collects username, password, and confirm password.
- User cannot continue past Step 2 until passwords match and the username is valid.
- Step 3 allows selecting Director, Parent, or Teacher.
- Parent role continues to child information.
- Director and Teacher roles can complete registration without child information.
- Parent child information includes class, image, name, date of birth, and gender.
- Parent clicking Register opens a child info confirmation modal.
- Confirming the child info modal opens parent relationship type selection.
- Parent relationship type includes Mom, Dad, Uncle, Brother, Guardian, Other, and similar family roles.
- Completing parent relationship type finishes parent registration.
- The web auth UI follows the clean, rounded, friendly visual style inspired by Kids Note.
- Mobile app files and mobile auth behavior are not changed by this work.

## 17. Open Questions

- Should director signup require center creation immediately, or should it happen after first login?
- Should teacher signup require an invite code from a director?
- Which phone provider will send verification codes?
- Should child class be free text for MVP or selected from center-managed classes?
- Which languages should the first version support?
