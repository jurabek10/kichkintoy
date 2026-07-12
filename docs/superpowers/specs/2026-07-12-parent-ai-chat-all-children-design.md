# Parent AI Chat Across All Children

## Goal

Allow a parent to ask the AI assistant about either or all of their guarded
children in the same conversation. The chat page must not depend on the child
selected elsewhere in the parent dashboard.

## Current behavior

The parent chat reads the globally selected child from `useSelectedChild`,
passes that child into thread creation and every streamed turn, and stores the
child on `ChatThread.childId`. The API then builds a single-child `ChatScope`.
Every parent chat tool implicitly operates on that one child.

This prevents a parent with siblings from asking about the other child or
comparing both children without first changing the global dashboard selection.

## User experience

- The AI assistant page is family-scoped for parents.
- The home-page child selector continues to scope the rest of the parent web
  experience, but it has no effect on chat.
- A parent may name one child and ask a question about that child.
- A parent may name two or more children and request a comparison or combined
  answer.
- If a question is child-specific but does not identify a child and the parent
  has multiple children, the assistant asks which child the parent means.
- If the parent has one child, the assistant may select that child without
  asking for clarification.
- Answers involving multiple children clearly label results by child name.

No new child selector is added to the chat UI. Natural-language identification
is the primary interaction.

## Web changes

`ChatApp` will stop reading `useSelectedChild` and will no longer send a
dashboard-selected `childId` when creating a parent thread or streaming a turn.
`ChatThread` and the chat adapter will no longer need parent child props for
family-scoped chat. Teacher and director behavior remains unchanged.

New parent threads are created with `childId = null`. Existing parent threads
retain any stored child ID in the database for backward compatibility, but the
parent turn builder will no longer use it to restrict the available children.

## Server scope and authorization

For each parent turn, `ChatToolsService.buildScope(userId)` loads all children
returned by `ProfileService.listChildren(userId)`. This guarded-child list is
the sole allowlist for chat tool access.

The scope contains the data the model needs to distinguish children:

```ts
type ParentChatChild = {
  id: string;
  firstName: string;
  name: string;
  dateOfBirth: string;
  className: string | null;
  centerId: string | null;
};

type ChatScope = {
  userId: string;
  children: ParentChatChild[];
};
```

Before executing a child-specific tool, the server resolves its required
`childId` against `scope.children`. A missing or non-guarded ID is rejected.
Existing downstream services retain their own guardian checks as defense in
depth. The model never receives or queries another family's children.

## Tool contract

Every child-specific parent tool receives a required `childId`:

- `getChildProfile`
- `getClassInfo`
- `getDailyReport`
- `listReports`
- `getDevelopmentSummary`
- `getAttendance`
- `getCalendarEvents`
- `getMeals`
- `getMedications`
- `getPickups`
- `getDocuments`
- `listAlbums`

`listNotices` accepts an optional `childId`: omit it for notices across the
parent's guarded children, or pass it for one child. `getCenterInfo` requires
`childId` because siblings may attend different centers.

The tool executor validates arguments before delegating to existing services.
The assistant may call a tool multiple times—once per child—to answer a sibling
comparison. This keeps each result explicitly scoped and avoids loading all
private child data for every question.

## System prompt

The parent system prompt lists every guarded child with full name and opaque ID.
It instructs the model to:

- map names in the parent's question to the matching allowed child ID;
- pass that ID to every child-specific tool;
- call tools separately for each named child when comparing siblings;
- ask a clarification question when multiple children exist and the intended
  child is not clear;
- automatically use the only child when the parent has exactly one;
- never guess between similarly named children;
- label combined results with child names;
- mirror the user's language as it does today.

## Thread compatibility

No database migration is required. `ChatThread.childId` remains nullable for
backward compatibility, but parent turn execution ignores it. Existing parent
threads immediately gain family scope. Thread history, titles, rename, delete,
pagination, and streaming formats are unchanged.

The create-thread and send-message schemas retain their optional `childId`
fields for compatibility, but the parent web client stops sending them and the
parent service ignores them when building turn scope. Removing these legacy
fields is outside this change.

## Error handling

- No guarded children: the assistant explains that no linked child is
  available; child-specific tool execution is rejected.
- Missing `childId` for a child-specific tool: return a structured tool error
  telling the model to identify or clarify the child.
- Forged or stale `childId`: reject it before calling a domain service.
- Duplicate or ambiguous child names: the prompt requires clarification rather
  than guessing.
- One child at a different center: tools use that child's own center and class,
  not a family-wide default center.

## Verification

### API/tool tests

- `buildScope` returns every child guarded by the parent.
- A valid child ID executes against the requested child.
- Another parent's child ID is rejected.
- A missing child ID produces a clarification-oriented tool error.
- Two tool calls for two guarded children return separately scoped data.
- Existing downstream guardian authorization remains effective.

### Chat behavior

- With two children, ask about the first by name and verify only that child's
  data is used.
- Ask about the second without changing the home selector and verify the second
  child's data is used.
- Ask for an attendance or development comparison and verify both children are
  queried and labeled.
- Ask "How was my child today?" and verify the assistant asks which child.
- With one guarded child, ask the same ambiguous question and verify the only
  child is used automatically.
- Open an existing child-pinned thread and verify it can answer about a sibling.
- Verify teacher and director chats are unchanged.
- Run shared, API, and web typechecks plus relevant chat tests.

## Out of scope

- Changing how the global parent child selector scopes non-chat pages.
- Adding a visual child selector to the chat page.
- Letting parents access children they do not guard.
- Combining or exposing raw data for all children on every turn.
- Database migration or removal of the legacy nullable thread `childId` field.
