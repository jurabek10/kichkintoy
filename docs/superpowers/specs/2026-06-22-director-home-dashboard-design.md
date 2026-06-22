# Director Home Dashboard Design

## Goal

Build the first web version of the director home page as a whole-kindergarten management dashboard. The page should show the director the center's size, expected monthly income, paid and unpaid tuition status, class-level payment health, and the small list of decisions that need director action.

This is web-first. Mobile director home can reuse the same API later, but is out of scope for this spec.

## Product Principles

- The director home is not a teacher workspace. It should focus on management, money, staffing, and approvals.
- Uzbekistan MVP assumption: every child in one kindergarten pays the same monthly tuition amount.
- The dashboard should be useful even before full online payment collection exists.
- One API endpoint should return the page summary so the home page does not stitch together many separate queries.

## Current Context

- The web dashboard home currently shows static metric values and quick links.
- The database already has `Invoice` and `Payment` models.
- The class detail page currently shows payment as "Coming soon".
- There is no exposed director home summary API yet.

## Scope

### Included

- Add a director home summary API.
- Add shared response schemas/types for the director home payload.
- Replace the director web home content with real dashboard data.
- Show:
  - Total children
  - Total classes
  - Total teachers
  - Pending requests
  - Monthly expected amount
  - Paid amount
  - Unpaid amount
  - Unpaid children
  - Class overview with children, teacher, expected amount, paid count, unpaid count
  - Action needed cards
  - Quick action buttons

### Not Included

- Parent-facing payment screens.
- Payment provider integration.
- Full invoice management page.
- Per-class custom tuition pricing.
- Mobile director dashboard implementation.

## Tuition Model

For this MVP, each active enrolled child has the same monthly tuition amount.

The dashboard API should derive a `monthlyTuitionAmount`; the dashboard request should not accept an amount from the client.

Recommended first implementation:

- Add a constant fallback in the API, for example `DEFAULT_MONTHLY_TUITION_UZS`.
- The endpoint returns this amount in the payload as `monthlyTuitionAmount`.
- Later, move this value into center settings when a settings page exists.

Expected monthly amount:

```text
active enrolled children count * monthlyTuitionAmount
```

Class expected monthly amount:

```text
active enrolled children in class * monthlyTuitionAmount
```

## Payment Status Rules

Use current month boundaries in the center timezone, defaulting to `Asia/Tashkent`.

For each active enrolled child:

- If the child has an invoice for the current month and completed/successful payments cover the invoice amount, count as paid.
- If there is no current-month invoice, count as unpaid for dashboard purposes.
- If payments are partial, count paid amount toward totals but keep the child in unpaid count until fully paid.

Initial successful payment statuses:

- `paid`
- `success`
- `completed`

Initial paid invoice statuses:

- `paid`

Initial unpaid invoice statuses:

- missing invoice
- `issued`
- `pending`
- `overdue`
- partially paid invoice

If existing data uses different statuses, the implementation should centralize these status lists in one helper so the rules are easy to adjust.

## API Design

Add a new oRPC endpoint:

```ts
orpc.director.homeSummary({ centerId })
```

Access:

- `directorOnly`

Response shape:

```ts
type DirectorHomeSummary = {
  centerId: string;
  currency: "UZS";
  month: {
    periodStart: string;
    periodEnd: string;
    label: string;
  };
  totals: {
    children: number;
    classes: number;
    teachers: number;
    pendingRequests: number;
  };
  money: {
    monthlyTuitionAmount: number;
    expectedAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    paidChildren: number;
    unpaidChildren: number;
  };
  classes: Array<{
    id: string;
    name: string;
    childCount: number;
    teacherNames: string[];
    expectedAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    paidChildren: number;
    unpaidChildren: number;
  }>;
  actionsNeeded: {
    pendingParentRequests: number;
    pendingTeacherRequests: number;
    classesWithoutTeacher: number;
    unpaidChildren: number;
    missingDocuments: number;
  };
};
```

## Data Queries

The service should calculate from these existing models:

- Active classes: `Class.status = active`
- Active enrollments: `ChildEnrollment.centerId`, `enrollmentStatus = active`, active child
- Teachers: active teacher roles for the center, plus class assignments where needed
- Pending requests: `CenterJoinRequest.status = pending`
- Invoices: current month invoices for the center and enrolled children
- Payments: payments attached to current-month invoices
- Missing documents: student document submissions not accepted, or overdue requests/submissions where available

Missing documents can start as a simple count:

```text
student document submissions for center where status is not accepted
```

If due date data is easy to include, prefer overdue + submitted-but-not-accepted. If not, keep the first implementation simple and label it "missing/incomplete documents."

## Web UI Design

Replace only the director branch of `DashboardHome`.

### 1. Header

Title:

```text
Bog'cha boshqaruvi
```

Subtitle:

```text
Bugungi holat, oylik to'lovlar va direktor qarorini kutayotgan ishlar.
```

### 2. Main Statistic Cards

Cards:

- Total children
- Total classes
- Total teachers
- Pending requests
- Expected monthly payment
- Unpaid amount

Use UZS formatting, for example:

```text
12 000 000 so'm
```

### 3. Money Snapshot

Show one larger panel:

- Expected this month
- Paid
- Unpaid
- Unpaid children

The unpaid amount should be visually prominent.

### 4. Class Overview

Show a table or dense card list:

| Class | Children | Teachers | Expected | Paid | Unpaid |
| --- | ---: | --- | ---: | --- | --- |
| Kichik guruh | 18 | Malika opa | 18 000 000 so'm | 15 kids | 3 kids |

For classes without teachers, show a warning label.

### 5. Action Needed

Show only director decisions:

- Parent requests waiting
- Teacher requests waiting
- Classes without teacher
- Unpaid children
- Missing documents

Each item should link to the relevant page where possible.

### 6. Quick Actions

Buttons:

- Approve requests -> `/dashboard/requests`
- Add class -> `/dashboard/classes`
- Invite teacher -> `/dashboard/invitations`
- Invite parent -> `/dashboard/invitations`
- Send announcement -> `/dashboard/notices/new`
- Open payments -> disabled or hidden until a payments page exists

If payments page does not exist yet, show the button disabled with "Tez orada" text.

## Empty And Loading States

- Loading: use existing dashboard loader style.
- No classes: show a clear prompt to add the first class.
- No children: expected, paid, and unpaid amounts are zero.
- No invoice data: children still count as unpaid for the current month.
- API error: show an alert and keep quick action buttons visible.

## Translations

Add translation keys for English and Uzbek under the app/dashboard namespace currently used by `DashboardHome`.

Uzbek wording should use natural director/admin language:

- `Jami bolalar`
- `Jami guruhlar`
- `Jami o'qituvchilar`
- `Kutilayotgan to'lov`
- `To'langan`
- `To'lanmagan`
- `Qaror kutmoqda`
- `To'lov qilmagan bolalar`
- `Direktor qarorini kutmoqda`

## Testing

Backend:

- Unit test the summary service with:
  - no children
  - active children without invoices
  - fully paid invoices
  - partially paid invoices
  - classes without teachers
  - pending parent and teacher requests

Frontend:

- Component/render test if existing test setup supports it.
- Otherwise verify with TypeScript/build checks.
- Manual web check with a director session and realistic seeded data.

## Implementation Order

1. Add shared schemas/types for `DirectorHomeSummary`.
2. Add `director.homeSummary` to the oRPC contract.
3. Implement `DirectorService.getHomeSummary`.
4. Wire the endpoint in `director.router`.
5. Add web query key.
6. Replace director branch of `DashboardHome` with the new dashboard.
7. Add English and Uzbek translations.
8. Run typecheck/tests and manually inspect the dashboard.

## Product Value To Confirm

The exact default monthly tuition amount still needs a real number from the business. Until a center settings screen exists, implementation should use a clearly named API constant and make it easy to change without touching dashboard UI code.
