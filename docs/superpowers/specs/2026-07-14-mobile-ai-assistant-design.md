# Mobile AI Assistant Design

**Date:** 2026-07-14  
**Status:** Approved for implementation  
**Apps:** Parent (`packages/mobile`), teacher (`packages/teacher-mobile`), director (`packages/director-mobile`)

## Goal

Bring the existing web AI assistant to all three mobile apps with the same backend capabilities and conversation-management behavior, while using a native ChatGPT-style mobile interaction model. The assistant remains read-only and continues to use the authenticated user's server-scoped role and data access.

## Product Decisions

- Add the assistant as the center bottom tab in all three apps.
- Replace the Notices tab, not Albums. The resulting order is Home, Reports, AI, Albums, Pickup.
- Keep Notices available from the existing Home feature grid; its route and feature screens remain unchanged.
- Use a ChatGPT-style left history drawer opened from the chat header and by a supported edge-swipe gesture.
- Use `@assistant-ui/react-native` rather than embedding the web app or rebuilding all runtime behavior manually.
- Reuse the existing chat oRPC procedures and `POST /chat/stream` SSE endpoint. No backend schema or model changes are required for this mobile phase.
- Preserve the role-specific parent, teacher, and director prompt suggestions and assistant scope already implemented on web.
- Support the existing English, Uzbek, and Russian UI copy.

## Architecture

### Shared feature module

Add a focused assistant feature to `packages/mobile-shared` and export it as `@kichkintoy/mobile-shared/assistant`. It owns:

- assistant runtime setup;
- SSE parsing and the custom `ChatModelAdapter`;
- thread list loading and active-thread state;
- conversation UI, message bubbles, empty state, composer, and working states;
- the left history drawer;
- thread creation, selection, rename, and deletion flows;
- role-specific copy and starter-prompt selection.

The shared feature receives app-specific dependencies through typed props rather than importing each app's `@/` aliases. Required inputs are:

- role: `parent`, `teacher`, or `director`;
- current language;
- API base URL and async auth-token reader;
- typed chat operations for list, create, get, rename, and delete;
- optional completion callback for query invalidation.

This keeps the feature testable and prevents three nearly identical implementations.

### App integration

Each mobile app adds a thin `(tabs)/chat.tsx` route that supplies its role, oRPC client, authentication token reader, API URL, and translation state to the shared feature. Each tab layout replaces the existing Notices tab entry with Chat in the center position.

The existing `(tabs)/notices.tsx` route stays registered even though it is no longer declared as a visible tab. Home feature-grid links continue to navigate to it.

### Assistant runtime

Use `@assistant-ui/react-native` with a local/custom model adapter. The adapter sends only the newest user message, current thread ID, and normalized app language to the current SSE endpoint, matching the web adapter. It accumulates streamed deltas, exposes `thinking` before tool use and `searching` after a tool event, and notifies the thread list when a turn completes.

Persisted messages and thread metadata remain server-owned. TanStack Query coordinates active-thread loading, and `chat.getThread` seeds the assistant runtime, mirroring the proven web flow. Assistant-ui primitives own composer and message-run state; the app-owned layer owns remote thread CRUD and grouping.

## Mobile Interaction Design

### Bottom navigation

The tab order is:

1. Home
2. Reports
3. AI
4. Albums
5. Pickup

The AI tab uses a sparkle-style icon and the localized short label `AI`. It uses the existing active primary color and tab dimensions.

### Chat header

The header contains:

- a hamburger button on the left to open history;
- the Kichkintoy assistant mark and localized title;
- a single-line role-specific subtitle that truncates on narrow devices;
- a plus button on the right to create a new chat.

The header remains fixed while messages scroll.

### History drawer

The drawer slides from the left over a dimmed conversation and can be closed with the close button, backdrop tap, back gesture/button, or supported swipe. It contains:

- localized `Chats` heading;
- prominent `New chat` action;
- conversations grouped into Today, Yesterday, This week, This month, and Older;
- current-thread highlighting;
- an overflow action on every row.

The overflow action opens touch-friendly rename and delete choices. Rename uses a native prompt/modal with validation. Delete requires confirmation and cannot be triggered while its request is pending. Selecting a thread closes the drawer and loads that conversation.

### Empty conversation

A new thread shows the assistant mark, a role-specific title and description, and five starter prompts copied from the existing web assistant:

- parent: daily summary, development, events, notices, meals;
- teacher: absences, frequent absences, unwritten reports, medication, events;
- director: daily snapshot, unpaid tuition, absences, join requests, empty seats.

Starter prompts use the existing coral, mint, sky, sunshine, and grape domain colors. Tapping one fills and immediately sends it.

### Messages and composer

- User messages are right-aligned primary/coral bubbles.
- Assistant messages are left-aligned white cards with the Kichkintoy mark.
- Basic `**bold**` segments render with emphasis, matching the current web behavior.
- The message list scrolls to new content during streaming and exposes a jump-to-latest control when the user has scrolled away.
- The composer stays above the bottom tab bar and mobile keyboard through `KeyboardAvoidingView` and safe-area insets.
- The send button is disabled for empty input and while submission cannot start.
- The localized accuracy disclaimer appears below the composer without obstructing keyboard interaction.

## Data Flow

### Initial entry

1. Load the authenticated user's threads through `chat.listThreads`.
2. Select the newest thread if one exists.
3. If no thread exists, create one exactly once and select it.
4. Load the selected thread and seed its persisted messages into the assistant runtime.

### Sending a turn

1. The user sends text or taps a starter prompt.
2. The adapter reads the current remote thread ID and normalized `uz`, `ru`, or `en` language.
3. It posts to `/chat/stream` using the stored bearer token.
4. `delta` events append visible assistant text; `tool` changes the empty working state to `searching`; `error` ends the run with an inline error; `done` completes the turn.
5. On completion, invalidate thread-list data so server-generated titles and timestamps refresh.

### Switching and managing threads

- Selecting a drawer row changes the active thread and remounts or resets the runtime with that thread's persisted messages.
- Creating a thread selects it immediately and closes the drawer.
- Renaming invalidates the thread list on success.
- Deleting the active thread clears selection; the next thread is selected, or a new empty thread is created if none remain.

## Loading, Empty, and Error States

- Session or first thread load: centered three-dot Kichkintoy color loader.
- Thread switch: keep the surrounding header and tab shell stable while showing a conversation-area loader.
- Thinking: localized `Thinking…` with a restrained native activity indicator.
- Tool use before text: localized `Looking that up…`.
- Network/SSE failure: inline localized error and `Try again`; retain the user's message.
- Thread-list failure: drawer error with retry; keep an already loaded conversation usable.
- Create/rename/delete failure: localized alert using the normalized API error message.
- Empty input: no request.
- Malformed SSE frames: ignore individual malformed frames, matching web; fail only when the request or stream cannot continue.

## Accessibility and Native Behavior

- All icon-only buttons receive localized accessibility labels and button roles.
- Touch targets are at least 44 by 44 points.
- Text respects normal platform font scaling without clipping essential actions.
- Drawer focus and screen-reader order follow the visible hierarchy.
- Android hardware Back closes the drawer before navigating away.
- Reduced-motion settings remove decorative motion while preserving progress feedback.
- Safe-area insets cover notches, home indicators, and the tab bar.
- The composer remains usable with multiline input and both iOS and Android keyboards.

## Dependency and Platform Constraints

- Install the Expo-compatible release of `@assistant-ui/react-native` in all three mobile apps.
- Add only peer/runtime dependencies required by that release and compatible with Expo SDK 54.
- Follow the exact Expo SDK 54 documentation before changing Expo Router, gesture, keyboard, or animation setup.
- Do not add Assistant Cloud: Kichkintoy's existing database and endpoints remain the source of truth.
- Do not use a WebView.

## Testing and Verification

### Static checks

- Run TypeScript checks for `mobile-shared` and all three mobile apps.
- Run Expo lint for parent, teacher, and director apps.
- Confirm Metro resolves the new shared export and native assistant package in each app.

### Behavioral checks

For each role:

- AI appears in the center tab and Notices does not appear in the tab bar.
- Notices still opens from the Home shortcut grid.
- First entry selects or creates exactly one thread.
- Existing messages load in order.
- Streaming text, thinking state, and tool-searching state render correctly.
- Role-specific starter prompt sends the expected text.
- New chat, switch, rename, and delete work and persist after reload.
- Drawer closes through all native dismissal paths.
- English, Uzbek, and Russian UI strings render without missing keys.
- Authentication failure and offline/network failure produce actionable states.
- Composer remains visible with the keyboard on iOS and Android.

### Visual checks

Capture parent, teacher, and director assistant screens at a representative phone size in:

- empty conversation;
- active streamed conversation;
- open history drawer;
- rename and delete confirmation states;
- keyboard-open composer state.

Verify alignment with existing Kichkintoy mobile tokens rather than assistant-ui's default styling.

## Out of Scope

- New assistant backend tools, provider changes, or database migrations.
- Voice input/output, attachments, message editing, branching, or feedback controls.
- Proactive AI notifications or actions that mutate center data.
- Reworking the existing web assistant.
- Removing the Notices feature or route.

## Success Criteria

The parent, teacher, and director mobile apps each expose a native AI tab that can load and manage the same persisted conversations as web, stream grounded responses through the same backend, show the correct role-specific experience in all supported languages, and preserve Notices access from Home without crowding the bottom navigation.
