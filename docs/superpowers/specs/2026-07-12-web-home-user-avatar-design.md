# Web Home User Avatar Design

## Goal

Show the relevant profile photo beside the name in every role's web home-page
header. Preserve the existing initials fallback when no photo is available.

## Current behavior

- The dashboard shell already renders the signed-in user's private avatar with
  `CurrentUserAvatar`.
- The teacher home greeting shows the teacher's name without their photo.
- The director home header shows the director's name without their photo.
- The parent home is child-focused and already shows the selected child's photo
  and name.

## Design

Reuse `CurrentUserAvatar` in the teacher and director home headers. It reads the
cached `profile.get` response, resolves `avatarMediaAssetId` through the existing
private-media signed URL flow, and displays initials while no photo exists or the
photo is loading.

Keep the parent home header unchanged because it correctly represents the
selected child. Its existing `ChildAvatar` supports both private media assets and
legacy direct photo URLs.

### Teacher home

Place a 48px user avatar immediately before the greeting text. Keep the weekday
badge on the opposite side and preserve the existing responsive stacking.

### Director home

Place a 48px user avatar beside the block containing the center title and
director greeting. The avatar must remain visible against the dark console
header, using the existing avatar component's image and initials behavior.

## Data flow and errors

No API or schema changes are needed. Both new render locations use the existing
`profile.get` query and `media.getDownloadUrl` request. If no asset exists or the
download URL cannot be resolved, the UI continues to show initials rather than a
broken image.

## Verification

- Sign in as a teacher with a profile photo and confirm it appears beside the
  teacher greeting; confirm initials appear for an account without a photo.
- Sign in as a director and repeat the same checks.
- Sign in as a parent and confirm the selected child's existing photo and name
  remain unchanged.
- Run the web package typecheck.

## Out of scope

- Changing avatar upload or storage behavior.
- Replacing the parent child's avatar with the parent's avatar.
- Redesigning the shared dashboard shell or profile page.
