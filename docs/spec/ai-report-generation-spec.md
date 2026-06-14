# AI Report Generation Spec

> **API note:** the app API is oRPC-only. Add the new procedure to `packages/shared/src/api/orpc/reports.contract.ts` under `reportsContract`, wire the handler in `packages/api/src/orpc/routers/reports.router.ts`, and call it from the web via the typed `orpc` client. See [`../adding-a-feature.md`](../adding-a-feature.md).

> Status: **implemented**. All API, service, and frontend changes are complete.

## 1. Scope

This spec defines the **AI-assisted `teacherNote` generation** feature for the daily report composer. The goal is to eliminate the writing burden for teachers who manage 20–30 children per day: a teacher fills in structured observations (mood, meals, sleep, activities, class participation), clicks one button, and receives a natural, parent-friendly paragraph in their chosen language.

In scope:

- A single oRPC procedure `reports.generateNote` on the API side.
- A "Generate with AI" button in the `ReportComposer` component next to the `teacherNote` textarea.
- Output language follows the teacher's current app language (Uzbek or Russian).
- Generated text fills the `teacherNote` field as a draft — the teacher reads, edits if needed, and saves/publishes normally.
- Privacy-safe data minimization: no child names, no dates, no center/class names are ever sent to the external AI.

Out of scope:

- Generating `healthNote` — this field contains medical observations and is always written by the teacher manually.
- Auto-publishing without teacher review.
- Mobile UI (same API, different frontend later).
- Per-child bulk generation (future: one click generates all 30 reports for a class).
- Storing or logging generated text server-side.

---

## 2. Why This Feature

In Uzbek kindergartens, writing the daily report `teacherNote` is the biggest friction point. Writing a warm, individualized paragraph for each of 30 children takes 1–2 hours per day. Teachers either skip it, copy-paste identical text, or write one or two sentences. Parents then read the same generic text every day and stop opening reports — defeating the core product promise.

Natural language generation solves this differently from templates: the model varies sentence structure, word choice, and tone on every call even for identical inputs, so parents never read the same report twice. The teacher's role shifts from writer to reviewer — they spend 10 seconds per child instead of 2 minutes.

---

## 3. Privacy Model

### 3.1 Core Rule

**No personally identifiable information is sent to the external AI model.** The API strips all PII before making the upstream call.

| Data field | Sent to AI? | Reason |
|---|---|---|
| `mood` value | ✅ Yes | Non-identifying observation |
| `items` (meal, sleep, activity, etc.) — titles and values | ✅ Yes | Non-identifying observations |
| `classParticipation` — subject, level, interest | ✅ Yes | Non-identifying observations |
| `language` (uz / ru) | ✅ Yes | Required for output language |
| Child name | ❌ No | PII — substituted client-side after generation |
| Child date of birth / gender | ❌ No | PII |
| `healthNote` | ❌ No | Medical info — teacher writes this manually |
| Center / class name | ❌ No | Organizational PII |
| Report date | ❌ No | Not needed for generation |
| Teacher name / user ID | ❌ No | Not needed for generation |

### 3.2 Child Name Substitution

The AI prompt instructs the model to use the neutral placeholder **"the child"** (Uzbek: *"bola"*, Russian: *"ребёнок"*) throughout the generated text. The frontend then does a simple string replace of that placeholder with the real child's name before displaying it in the textarea. This substitution happens entirely in the browser — Google never processes the name.

### 3.3 Health Note

The `healthNote` textarea stays fully manual. The "Generate" button only generates `teacherNote` — it never touches the health note field.

### 3.4 AI Model

**Google Gemini 2.5 Flash** via the Gemini REST API (`generativelanguage.googleapis.com`). Selected because:
- Free tier: 1,500 requests/day, 15 requests/minute — sufficient for MVP.
- Best-in-class Uzbek and Russian output quality among free models.
- No library needed — one `fetch` call with `Authorization: Bearer` header.
- API key stored in `GEMINI_API_KEY` env var, server-side only, never exposed to the browser.

If the project grows beyond the free tier, swap `GeminiService` implementation without touching the contract or frontend.

---

## 4. User Experience

### 4.1 Where the Button Lives

Inside `ReportComposer`, below the `teacherNote` textarea:

```
┌─────────────────────────────────────────┐
│  Teacher note                           │
│  ┌─────────────────────────────────┐   │
│  │  (textarea, 5 rows)             │   │
│  └─────────────────────────────────┘   │
│  [✨ Generate with AI]  ← new button   │
└─────────────────────────────────────────┘
```

The button is disabled when:
- No items have any filled value (nothing for AI to work with).
- A generation is already in progress.

### 4.2 Generation Flow

1. Teacher fills in mood and at least one item value.
2. Teacher clicks **"Generate with AI"**.
3. Button shows a spinner + "Generating…". Textarea becomes read-only.
4. Frontend calls `orpc.reports.generateNote` with only observation data (no names).
5. API calls Gemini, receives text containing the placeholder word.
6. Frontend replaces the placeholder with the real child name and puts the result into `teacherNote`.
7. Textarea becomes editable. Teacher reviews, edits if needed, saves/publishes normally.

### 4.3 Error Handling

- API failure: show a toast error, restore textarea to editable. Do not clear existing text.
- If teacher already wrote something in `teacherNote`: show a `window.confirm` before overwriting.

### 4.4 Language

Frontend reads `i18n.language` and passes `language: "uz" | "ru"`. Falls back to `"uz"` if language is `"en"`.

---

## 5. API Contract

### 5.1 New procedure: `reports.generateNote`

**Location:** `packages/shared/src/api/orpc/reports.contract.ts`
**Auth:** requires a valid session (teacher or director).

**Input schema** (in `packages/shared/src/api/daily-reports.ts`):

```ts
export const generateReportNoteInputSchema = z.object({
  language: z.enum(["uz", "ru"]),
  mood: z.string().trim().max(80).optional(),
  items: z.array(z.object({
    itemType: dailyReportItemTypeSchema,
    title: z.string().trim().max(80).optional(),
    value: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })).optional(),
  classParticipation: z.array(z.object({
    subject: z.string().trim().max(80),
    level: classParticipationLevelSchema,
    interest: classParticipationInterestSchema.optional(),
    strengths: z.string().trim().max(300).optional(),
    needsPractice: z.string().trim().max(300).optional(),
  })).optional(),
});
```

**Output:** `z.object({ teacherNote: z.string() })`

---

## 6. Server Implementation

### 6.1 GeminiService (`packages/api/src/reports/gemini.service.ts`)

NestJS `@Injectable()` service. Reads `GEMINI_API_KEY` from env on construction — throws `ServiceUnavailableException` if missing. One method: `generateTeacherNote(input)` that builds the prompt, calls Gemini REST API, and returns the trimmed text string.

### 6.2 Prompt Design

System instruction (in English for consistent model behavior):

```
You are a kindergarten teacher assistant. Write a warm, natural daily report
paragraph for a parent. Use simple, friendly language. Vary your sentence
structure and vocabulary each time so every report feels personal, not templated.
Write in {LANGUAGE}. Use "bola" (Uzbek) or "ребёнок" (Russian) as a placeholder
for the child's name — never invent a name. Output only the paragraph, no heading,
no bullets, no explanation.
```

User message: structured list of non-empty observations only.

**Temperature:** `0.9` — natural variation. **Max tokens:** `400` — 3–5 sentences.

### 6.3 Module wiring

- Add `GeminiService` to `ReportsModule` providers.
- Add `geminiService: GeminiService` to `ORPCDeps` type in `context.ts`.
- Resolve it in `router.ts` via `app.get(GeminiService, { strict: false })`.

---

## 7. Frontend Changes

| File | Change |
|---|---|
| `report-composer.tsx` | `childName` prop, `aiGenerating` state, `generateWithAI` fn, Generate button |
| `en/reports.json` | `composer.generateWithAI`, `composer.generating`, `composer.replaceNote` |
| `ru/reports.json` | Same keys in Russian |
| `uz/reports.json` | Same keys in Uzbek |

`ReportComposer` needs a new optional `childName` prop so the frontend can substitute the placeholder after generation. The parent page (`new/page.tsx`) passes it via a query param or child query.

---

## 8. Out of Scope

| Topic | Decision |
|---|---|
| Bulk generation (30 children at once) | Deferred — free tier is 15 RPM |
| Streaming response word-by-word | Deferred — oRPC streaming not yet wired |
| Health note generation | Never — medical observations must be human-written |
| Storing prompts/responses server-side | Not stored — returned to client only |
