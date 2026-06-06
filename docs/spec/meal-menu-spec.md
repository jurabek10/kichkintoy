# Meal Menu / Food Photos Spec

> **API note:** the app API is oRPC-only. Add reusable schemas to `packages/shared/src/api/meals.ts`, add procedures to `packages/shared/src/api/orpc/meals.contract.ts`, compose them into `packages/shared/src/api/orpc-contract.ts` under a `meals` group, and consume them from web via the typed `orpc` client plus TanStack Query. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **planned next feature**. This is Kichkintoy's Kidsnote-style `식단표` / meal-menu feature: staff post daily food menus with photos, and parents see the meals for their child's active center/class.

## 1. Scope

This spec defines the **Meal Menu / Food Photos** feature. It lets a director or teacher publish what children are served each day, optionally with a food photo and per-child eating status.

In scope:

- Director/teacher: create daily meal posts with date, meal type, audience, menu text, allergy note, and food photo.
- Director/teacher: record optional per-child eating status.
- Parent: view today's meals and meal history for linked children.
- MinIO media upload/download through signed URLs.
- Object-level permissions by center, class, teacher assignment, active enrollment, and guardian link.

Out of scope for MVP:

- Nutrition macros/calorie calculation.
- Government meal reporting.
- AI food recognition.
- Weekly/monthly menu template builder.
- Meal payments or cafeteria inventory.

## 2. Product Basis

Kidsnote publicly documents `식단표` as one of its basic menus/features, and its guide says centers can configure whether the food-menu feature is lunch-only or lunch plus snack. Kidsnote also describes daily report fields that include meal/eating status. Kichkintoy should start with the simple parent-visible meal menu and leave advanced nutrition for later.

For Kichkintoy, the MVP should feel like:

```text
Today
- Breakfast
- Lunch
- Snack
- Dinner

Each meal:
- food photo
- menu text
- allergy note
- class/center context
- optional child eating status
```

## 3. Vocabulary

- **Meal post:** one published/draft record for a date + meal type + audience.
- **Meal type:** `breakfast`, `lunch`, `snack`, `dinner`.
- **Audience:** `center` for all active classes in a center, or `class` for one or more classes.
- **Food photo:** one or more media assets uploaded through MinIO signed URLs.
- **Eating status:** optional per-child value: `ate_all`, `ate_most`, `ate_some`, `did_not_eat`.
- **Allergy note:** staff-visible and parent-visible note about allergens or substitutions.

## 4. Roles And Permissions

| Action | Director | Assigned teacher | Unassigned teacher | Parent |
|---|---|---|---|---|
| Create center-wide meal | Yes | No | No | No |
| Create class meal | Yes, any class | Yes, assigned classes | No | No |
| Upload food photo | Yes | Yes, assigned classes | No | No |
| Edit/delete meal | Yes | Author or assigned class teacher | No | No |
| Publish/unpublish meal | Yes | Author or assigned class teacher | No | No |
| Record eating status | Yes | Assigned class teacher | No | No |
| View staff meal list | Yes, center | Yes, assigned classes | No | No |
| View parent meal feed | No | No | No | Own children only |

Authorization rules:

- Director/organization owner can manage all classes in their center.
- Teacher can manage only active classes in `teacher_class_assignments`.
- Parent can view only meals for their linked children's active enrollments.
- Parent cannot fetch a meal for a class/center where they have no active child.
- All write actions must audit log.

## 5. User Flows

### 5.1 Staff Creates Daily Meal Post

1. Staff opens **Meals**.
2. Clicks **New meal**.
3. Chooses date.
4. Chooses meal type: breakfast, lunch, snack, dinner.
5. Chooses audience:
   - whole center, director only;
   - selected classes, director or assigned teacher.
6. Enters menu text.
7. Adds allergy note if needed.
8. Uploads food photo using MinIO signed upload URL.
9. Saves draft or publishes.

### 5.2 Staff Records Eating Status

For each child in the selected class audience, staff can optionally set:

```text
ate_all
ate_most
ate_some
did_not_eat
```

Notes:

- Status is optional; a meal can be published without per-child eating statuses.
- Eating statuses should be editable after publish.
- This data can later sync into daily reports as `daily_report_items.item_type = meal`.

### 5.3 Parent Views Meal Feed

1. Parent opens **Meals**.
2. Default view shows today's meals for all linked children.
3. Parent can filter by child or date.
4. Each card shows:
   - meal type
   - food photo
   - menu text
   - allergy note
   - child/class context
   - eating status if recorded for that child

## 6. Data Model

### 6.1 `meal_posts`

```sql
CREATE TABLE meal_posts (
  id UUID PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES centers(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL, -- breakfast | lunch | snack | dinner
  audience_type TEXT NOT NULL DEFAULT 'class', -- center | class
  menu_text TEXT NOT NULL,
  allergy_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_posts_center_date ON meal_posts(center_id, meal_date DESC);
CREATE INDEX idx_meal_posts_status ON meal_posts(status, published_at DESC);
```

### 6.2 `meal_post_classes`

Center-wide meals need no class rows. Class-targeted meals need one row per selected class.

```sql
CREATE TABLE meal_post_classes (
  id UUID PRIMARY KEY,
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, class_id)
);

CREATE INDEX idx_meal_post_classes_class ON meal_post_classes(class_id);
```

### 6.3 `meal_post_media`

Photos reuse existing `media_assets` and MinIO signed upload/download.

```sql
CREATE TABLE meal_post_media (
  id UUID PRIMARY KEY,
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, media_asset_id)
);

CREATE INDEX idx_meal_post_media_post ON meal_post_media(meal_post_id, position);
```

### 6.4 `meal_child_statuses`

```sql
CREATE TABLE meal_child_statuses (
  id UUID PRIMARY KEY,
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  status TEXT NOT NULL, -- ate_all | ate_most | ate_some | did_not_eat
  note TEXT,
  recorded_by_user_id UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, child_id)
);

CREATE INDEX idx_meal_child_statuses_child ON meal_child_statuses(child_id);
```

## 7. Shared Schemas

Create `packages/shared/src/api/meals.ts`.

Enums:

```ts
mealTypeSchema = z.enum(["breakfast", "lunch", "snack", "dinner"]);
mealAudienceTypeSchema = z.enum(["center", "class"]);
mealStatusSchema = z.enum(["draft", "published"]);
mealEatingStatusSchema = z.enum([
  "ate_all",
  "ate_most",
  "ate_some",
  "did_not_eat",
]);
```

Core schemas:

- `mealClassSchema`
- `mealChildSchema`
- `mealMediaSchema`
- `mealChildStatusSchema`
- `mealPostSummarySchema`
- `mealPostDetailSchema`
- `mealAudienceResponseSchema`

Input schemas:

- `createMealPostInputSchema`
- `updateMealPostInputSchema`
- `listStaffMealsInputSchema`
- `listParentMealsInputSchema`
- `setMealChildStatusesInputSchema`

Every oRPC procedure must have real output schemas. Do not use `z.unknown()`.

## 8. oRPC Contract

Create `packages/shared/src/api/orpc/meals.contract.ts`.

Suggested procedures:

```text
meals.audience
meals.staffList
meals.parentList
meals.detail
meals.create
meals.update
meals.publish
meals.unpublish
meals.delete
meals.setChildStatuses
```

Procedure rules:

- `audience`: director/teacher only, returns classes and children in scope.
- `staffList`: director/teacher only, scoped by center/classes.
- `parentList`: parent only, defaults to today's meals and can filter by child/date.
- `detail`: staff detail or parent-safe detail based on role.
- `create/update/publish/delete`: staff only.
- `setChildStatuses`: staff only, child IDs must belong to selected classes.

## 9. API Service Behavior

Create:

```text
packages/api/src/meals/meals.module.ts
packages/api/src/meals/meals.service.ts
packages/api/src/orpc/routers/meals.router.ts
```

Service responsibilities:

- Validate staff role and class scope before writing.
- Validate parent access before returning meals.
- Validate media assets belong to the same center.
- Store food photos by linking existing `media_assets` rows.
- Return media asset IDs only; web obtains signed download URLs through `orpc.media.getDownloadUrl`.
- Create audit logs for create, publish, update, delete, and child eating status changes.
- Notify parents when a meal is published.

## 10. MinIO Storage Rules

Reuse the existing media module:

```text
orpc.media.createUploadUrl
orpc.media.completeUpload
orpc.media.getDownloadUrl
```

Food photo flow:

1. Staff selects a photo.
2. Web calls `orpc.media.createUploadUrl({ purpose: "meal", ... })`.
3. Web uploads directly to MinIO using PUT signed URL.
4. Web calls `orpc.media.completeUpload`.
5. Web passes `mediaAssetIds` to `orpc.meals.create`.
6. Meal detail returns media IDs.
7. Web calls `orpc.media.getDownloadUrl` before rendering images.

Rules:

- Bucket remains private.
- Do not return public MinIO URLs from meal APIs.
- Signed download URLs should be short-lived.
- Parent media download authorization must check child/class access.

## 11. Web UI

Routes:

```text
packages/web/app/dashboard/meals/page.tsx
packages/web/app/dashboard/meals/new/page.tsx
packages/web/app/dashboard/meals/[mealId]/page.tsx
```

Components:

```text
packages/web/app/dashboard/meals/_components/staff-meals.tsx
packages/web/app/dashboard/meals/_components/parent-meals.tsx
packages/web/app/dashboard/meals/_components/meal-composer.tsx
packages/web/app/dashboard/meals/_components/meal-detail-screen.tsx
packages/web/app/dashboard/meals/_components/meal-card.tsx
packages/web/app/dashboard/meals/_components/signed-meal-image.tsx
packages/web/app/dashboard/meals/_components/child-eating-status-editor.tsx
```

Navigation:

- Add **Meals** to `DashboardShell`.
- Show for director, teacher, and parent.

TanStack Query keys:

```ts
meals: {
  all: () => ["meals"] as const,
  audience: (centerId: string) => ["meals", "audience", centerId] as const,
  staffList: (input) => ["meals", "staff", input] as const,
  parentList: (input) => ["meals", "parent", input] as const,
  detail: (mealId: string) => ["meals", "detail", mealId] as const,
}
```

## 12. UX Requirements

Staff list:

- Filter by date, class, meal type, status.
- Cards show meal type, date, classes/center, photo thumbnail, menu text, allergy note, status.

Composer:

- Date picker / date input.
- Meal type selector.
- Audience selector.
- Class multi-select when audience is class.
- Menu text textarea.
- Allergy note textarea.
- Food photo upload.
- Save draft and publish buttons.

Child eating status editor:

- Show roster children for the selected audience.
- Compact segmented control per child:
  - All
  - Most
  - Some
  - None
- Optional note per child can be a later enhancement; API supports it.

Parent feed:

- Defaults to today's meals.
- Filter by child and date.
- Shows eating status for each child when available.

## 13. Privacy And Safety

Required:

- Parent meal list must be filtered server-side.
- Parent meal detail must reject direct fetch for unrelated classes/children.
- Parent image download must use `orpc.media.getDownloadUrl` after server-side authorization.
- Meal photos must not be public URLs.
- All staff writes must be audited.
- Teacher writes must be limited to assigned classes.
- Child eating statuses must only be recorded for children in the meal audience.

## 14. Acceptance Tests

MVP is complete when:

- Director can create and publish a center-wide meal.
- Director can create and publish a class meal.
- Teacher can create a meal only for assigned classes.
- Teacher cannot create a meal for unassigned classes.
- Staff can upload a food photo through MinIO signed URLs.
- Parent sees today's meals for their child's active class.
- Parent does not see meals for unrelated classes.
- Parent sees food photo through signed download URL.
- Staff can record child eating status.
- Parent sees their own child's eating status.
- Parent cannot see another child's eating status.
- All oRPC outputs are strongly typed.
- Shared/API/Web typechecks pass.

## 15. Implementation Order

1. Add shared schemas and oRPC contract.
2. Add Prisma models and migration.
3. Add API service/module/router and root router composition.
4. Add media download authorization for meal media.
5. Add query keys and labels.
6. Add staff meal list and composer.
7. Add food photo upload using existing MinIO media procedures.
8. Add child eating status editor.
9. Add parent meal feed and detail screen.
10. Run permission tests and build checks.

## 16. Later Enhancements

- Weekly/monthly meal planner.
- Copy/paste menus across days.
- Center setting: lunch only vs lunch + snack.
- Nutrition/allergen templates.
- Parent allergy acknowledgement.
- Daily report integration for meal statuses.
- AI-assisted food photo recognition.
