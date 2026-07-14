# Mobile Assistant Brand Mark and Drawer Refinement

## Goal

Refine the approved mobile AI assistant so its identity matches the web application and its history drawer uses vertical space more efficiently.

## Scope

- Replace the temporary letter-and-sparkle assistant mark with the candy-colored Kichkintoy K used by the web application.
- Use the new native mark everywhere the assistant identity appears: the chat header, history drawer header, empty state, and assistant message avatar.
- Reduce the space between the history drawer header and the first chat group.
- Replace the iPhone system action and confirmation dialogs with a custom Kichkintoy chat-action sheet.
- Preserve all existing chat, history, rename, delete, streaming, localization, and role-specific behavior.

## Brand Mark

Create a reusable React Native vector component that reproduces the web `KichkintoyMark` geometry and colors:

- Sunshine-yellow vertical stem: `#FFC53D`
- Coral upper arm: `#FF7A66`
- Sky-blue lower arm: `#4DABF7`
- Two white dots in the vertical stem

The component will use `react-native-svg` so the mark remains crisp at every avatar size. It will stay inside the existing soft squircle avatar container at the current sizes: 36 pixels in both headers, 58 pixels in the empty state, and 30 pixels beside assistant messages. Accessible labels remain on the surrounding interactive control; the decorative vector itself is hidden from accessibility.

## Compact History Drawer

The drawer header will contain the brand/title block on the left and compact new-chat and close controls on the right. The current full-width new-chat button beneath the header will be removed.

The chat list will use 8 pixels of top padding below the header. The first date group will have no additional top margin. Subsequent date groups retain the existing 12-pixel top margin.

This keeps new-chat available while removing the large visual gap shown in the current mobile drawer.

## Custom Chat-Action Sheet

Tapping a thread's ellipsis opens one reusable modal bottom sheet with a dimmed backdrop, rounded top corners, safe-area padding, and the assistant's brand styling. The sheet supports three explicit states:

1. **Actions:** Shows the selected chat title plus icon-labelled Rename, Delete, and Cancel controls.
2. **Rename:** Shows a focused text input prefilled with the title, a primary Save control, and Cancel. Saving is disabled for an empty or unchanged title.
3. **Delete:** Shows the selected chat title, a concise irreversible-action warning, a coral destructive confirmation control, and Cancel.

Rename and Delete transition within the same sheet instead of opening another modal. The sheet closes when the user taps the backdrop, presses the platform back button, selects Cancel, or swipes the sheet downward by at least 60 pixels. It remains open and disables dismissal while a rename or delete mutation is pending.

Rename and delete failures render an inline localized error inside the sheet and keep the user's current state intact. New-chat failures render a dismissible in-app banner beneath the chat header. No `Alert.alert` or platform action sheet remains in the mobile assistant.

The sheet is implemented inside the shared assistant module so parent, teacher, and director applications receive identical behavior. It owns presentation state only and continues to call the existing rename and delete callbacks supplied by the assistant screen.

## Dependencies

Add the Expo SDK 54-compatible `react-native-svg` dependency directly to the parent, teacher, and director mobile applications. The shared mobile package will declare it as a peer dependency because the shared assistant component is transpiled by each application.

## Verification

- Type-check the shared package and all three mobile applications.
- Run Expo lint for all three mobile applications.
- Produce a native Android export to confirm the SVG component bundles correctly.
- Verify the drawer still supports creating, opening, renaming, and deleting chats.
- Confirm the same brand mark appears at the specified 36-, 58-, and 30-pixel container sizes.
- Confirm the action sheet opens, changes between all three states, dismisses through backdrop/back/swipe/cancel, and locks dismissal while saving.
- Confirm mutation failures appear in the custom UI without invoking an iOS or Android system alert.

## Out of Scope

- Changes to chat APIs, persistence, prompts, permissions, or streaming behavior.
- Changes to the web brand mark.
- Changes to other mobile navigation or screens.
