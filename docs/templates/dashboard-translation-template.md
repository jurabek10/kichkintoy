# Dashboard Translation Template

Use this template when making any dashboard folder fully translatable, for example:

```txt
packages/web/app/dashboard/calendar
```

The goal is to follow the same general pattern used in Docquery: keep app-specific i18n setup in the app, keep translation resources outside the app, load namespaces once, and use `useLayoutTranslation("<namespace>")` inside client components.

## 1. Pick The Namespace

Use the dashboard folder name as the namespace unless there is a strong reason not to.

Examples:

```txt
packages/web/app/dashboard/calendar      -> calendar
packages/web/app/dashboard/meals         -> meals
packages/web/app/dashboard/notices       -> notices
packages/web/app/dashboard/medications   -> medications
```

Do not put new dashboard copy in `common.json` unless it is truly reused across many pages.

## 2. Create Locale Files

Create the same namespace file in every language:

```txt
packages/translations/src/locales/uz/calendar.json
packages/translations/src/locales/en/calendar.json
packages/translations/src/locales/ru/calendar.json
```

Start with the same key structure in all three files.

Example:

```json
{
  "title": "Calendar",
  "description": "Plan center, class, and child-specific events.",
  "newEvent": "New event",
  "back": "Back to calendar",
  "loading": "Loading...",
  "noCenter": "Your account is not linked to a center yet.",
  "loadError": "Could not load calendar events.",
  "eventsOnDate": "Events on {{date}}",
  "upcoming": "Upcoming",
  "noEventsForDate": "No events for this date",
  "noUpcomingEvents": "No upcoming events",
  "composer": {
    "newTitle": "New event",
    "editTitle": "Edit event",
    "description": "Add center, class, or child-specific schedule information.",
    "title": "Title",
    "date": "Date",
    "startTime": "Start time",
    "endTime": "End time",
    "allDay": "All day",
    "audience": "Audience",
    "wholeCenter": "Whole center",
    "class": "Class",
    "child": "Child",
    "chooseClass": "Choose class",
    "chooseChild": "Choose child",
    "save": "Save event",
    "saving": "Saving..."
  },
  "validation": {
    "centerRequired": "Your account is not linked to a center.",
    "titleRequired": "Title is required.",
    "directorOnly": "Only directors can create center-wide events.",
    "classRequired": "Choose a class.",
    "childRequired": "Choose a child."
  },
  "toast": {
    "created": "Event created.",
    "updated": "Event updated.",
    "cancelled": "Event cancelled."
  }
}
```

Keep keys semantic. Prefer `composer.title` over `eventTitleLabel`, and `validation.titleRequired` over `titleError`.

## 3. Load The Namespace

Add the namespace to `layoutNamespaces` in:

```txt
packages/web/app/layout.tsx
```

Example:

```ts
const layoutNamespaces = [
  "common",
  "nav",
  "app",
  "reports",
  "classes",
  "attendance",
  "calendar"
];
```

This project currently uses a layout-level provider, so every namespace used with `useLayoutTranslation("<namespace>")` must be listed there.

## 4. Replace Hardcoded UI Copy

In each client component inside the dashboard folder, import the layout translation hook:

```ts
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
```

Then read the namespace:

```ts
const { t } = useLayoutTranslation("calendar");
```

Before:

```tsx
<CardTitle className="text-xl">Calendar</CardTitle>
<CardDescription>
  Plan center, class, and child-specific events.
</CardDescription>
```

After:

```tsx
<CardTitle className="text-xl">{t("title")}</CardTitle>
<CardDescription>{t("description")}</CardDescription>
```

With interpolation:

```tsx
<h2 className="text-base font-bold">
  {t("eventsOnDate", { date: selectedDate })}
</h2>
```

## 5. Translate Toasts, Validation, Empty States

Do not leave toasts, validation messages, alerts, placeholders, empty states, or button labels hardcoded.

Before:

```ts
toast.success(event ? "Event updated." : "Event created.");
if (!title.trim()) return setError("Title is required.");
```

After:

```ts
toast.success(event ? t("toast.updated") : t("toast.created"));
if (!title.trim()) return setError(t("validation.titleRequired"));
```

Before:

```tsx
<SelectValue placeholder="Choose class" />
```

After:

```tsx
<SelectValue placeholder={t("composer.chooseClass")} />
```

## 6. Translate Reusable Child Components

If the folder has components like:

```txt
_components/event-card.tsx
_components/calendar-month.tsx
_components/event-composer.tsx
_components/event-detail-screen.tsx
```

Each component can call:

```ts
const { t } = useLayoutTranslation("calendar");
```

For helper functions that are not React components, either:

1. Pass `t` into the helper.
2. Return stable data/status keys from the helper and translate in the component.

Good:

```ts
function eventStatusKey(status: CalendarEventStatus) {
  return status === "cancelled" ? "status.cancelled" : "status.scheduled";
}

<Badge>{t(eventStatusKey(event.status))}</Badge>
```

Avoid:

```ts
function eventStatusLabel(status: CalendarEventStatus) {
  return status === "cancelled" ? "Cancelled" : "Scheduled";
}
```

## 7. Keep Dynamic Data As Data

Do not translate names or user-generated content:

```tsx
{event.title}
{child.fullName}
{klass.name}
{event.locationText}
```

Do translate labels around that data:

```tsx
{t("reportsForDate", { date: formatDate(date) })}
{t("childrenCount", { count: klass.childCount })}
```

## 8. Plurals

Use i18next plural keys for counts.

English:

```json
{
  "eventCount_one": "{{count}} event",
  "eventCount_other": "{{count}} events"
}
```

Russian usually needs more forms:

```json
{
  "eventCount_one": "{{count}} событие",
  "eventCount_few": "{{count}} события",
  "eventCount_many": "{{count}} событий",
  "eventCount_other": "{{count}} события"
}
```

Uzbek often can use:

```json
{
  "eventCount_one": "{{count}} tadbir",
  "eventCount_other": "{{count}} tadbir"
}
```

Usage:

```tsx
{t("eventCount", { count: events.length })}
```

## 9. Date And Time Text

Prefer existing formatting helpers where available. If a component creates visible text such as `Today`, `All day`, or `1 day before`, move those labels into the namespace.

Example:

```ts
const reminderOptions = [
  { value: "none", key: "reminders.none" },
  { value: "60", key: "reminders.oneHour" },
  { value: "1440", key: "reminders.oneDay" },
  { value: "4320", key: "reminders.threeDays" },
] as const;
```

```tsx
{reminderOptions.map((option) => (
  <SelectItem key={option.value} value={option.value}>
    {t(option.key)}
  </SelectItem>
))}
```

## 10. Calendar Folder Checklist

For `packages/web/app/dashboard/calendar`, check every file:

```txt
page.tsx
new/page.tsx
[eventId]/page.tsx
_components/calendar-month.tsx
_components/event-card.tsx
_components/event-composer.tsx
_components/event-detail-screen.tsx
_components/parent-calendar.tsx
_components/staff-calendar.tsx
```

Every visible string should be either:

1. From `t("...")`.
2. User/content data from the API.
3. A route, HTML id, enum value, or technical value that is not displayed.

## 11. Key Parity Check

After adding namespace files, verify all languages have matching keys.

```bash
node - <<'NODE'
const fs = require("fs");
const path = require("path");
const root = "packages/translations/src/locales";
const langs = ["uz", "en", "ru"];
const namespace = "calendar";

function flatten(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const sets = Object.fromEntries(
  langs.map((lang) => {
    const file = path.join(root, lang, `${namespace}.json`);
    return [lang, new Set(flatten(JSON.parse(fs.readFileSync(file, "utf8"))))];
  }),
);
const all = [...new Set(langs.flatMap((lang) => [...sets[lang]]))].sort();
for (const lang of langs) {
  const missing = all.filter((key) => !sets[lang].has(key));
  if (missing.length) console.log(`${lang} missing:`, missing);
}
NODE
```

No output means the namespace key structure matches.

## 12. Verification Commands

Run these after translating a dashboard folder:

```bash
pnpm --filter @kichkintoy/translations typecheck
pnpm --filter @kichkintoy/web typecheck
pnpm --filter @kichkintoy/web build
```

Then manually test:

1. Open the dashboard page, for example `/dashboard/calendar`.
2. Switch to Uzbek.
3. Refresh the page.
4. Switch to Russian.
5. Check list page, detail page, create/edit page, empty states, validation errors, and toast messages.

## 13. Final Review Before Commit

Search for hardcoded English in the folder:

```bash
rg -n "\"[A-Z][^\"]*[a-z][^\"]*\"|'[A-Z][^']*[a-z][^']*'" packages/web/app/dashboard/calendar
```

This search will include some false positives such as route names, enum values, ids, and class names. Review the results and only translate visible UI copy.

Make sure these files are updated:

```txt
packages/translations/src/locales/uz/<namespace>.json
packages/translations/src/locales/en/<namespace>.json
packages/translations/src/locales/ru/<namespace>.json
packages/web/app/layout.tsx
packages/web/app/dashboard/<folder>/**
```
