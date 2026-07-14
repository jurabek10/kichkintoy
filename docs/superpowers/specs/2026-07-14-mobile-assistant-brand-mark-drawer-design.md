# Mobile Assistant Brand Mark and Drawer Refinement

## Goal

Refine the approved mobile AI assistant so its identity matches the web application and its history drawer uses vertical space more efficiently.

## Scope

- Replace the temporary letter-and-sparkle assistant mark with the candy-colored Kichkintoy K used by the web application.
- Use the new native mark everywhere the assistant identity appears: the chat header, history drawer header, empty state, and assistant message avatar.
- Reduce the space between the history drawer header and the first chat group.
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

## Dependencies

Add the Expo SDK 54-compatible `react-native-svg` dependency directly to the parent, teacher, and director mobile applications. The shared mobile package will declare it as a peer dependency because the shared assistant component is transpiled by each application.

## Verification

- Type-check the shared package and all three mobile applications.
- Run Expo lint for all three mobile applications.
- Produce a native Android export to confirm the SVG component bundles correctly.
- Verify the drawer still supports creating, opening, renaming, and deleting chats.
- Confirm the same brand mark appears at the specified 36-, 58-, and 30-pixel container sizes.

## Out of Scope

- Changes to chat APIs, persistence, prompts, permissions, or streaming behavior.
- Changes to the web brand mark.
- Changes to other mobile navigation or screens.
