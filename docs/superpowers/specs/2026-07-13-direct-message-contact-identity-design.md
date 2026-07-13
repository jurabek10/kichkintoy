# Direct-message contact identity and access design

## Goal

Make direct-message identities understandable and correctly localized while limiting a parent's new-message contacts to staff related to the parent's enrolled child.

## Scope

- Localize the guardian relationship in identities such as `Kichkintoy guruh · Azizbek · Ota — Sardor Samiyev`.
- Display a teacher's or director's avatar to an authorized parent.
- Show parents only teachers assigned to their child's active class and directors assigned to that center.
- Exclude organization owners and any separate manager concept from the parent contact list.
- Apply the behavior consistently on web and the parent, teacher, and director mobile applications.

## API representation

The API will stop embedding an English relationship label in `displayName`. Parent contacts and thread participants will retain the parent's name and include structured identity context:

- class name;
- child's first name;
- raw guardian relationship value.

Clients will construct the visible identity using the current locale. Known relationship values such as `dad`, `father`, `mom`, and `mother` will map to message-namespace translations. Unknown values will use a readable raw-value fallback.

Staff contacts will continue to use the staff member's name and avatar.

## Parent contact eligibility

For each active child enrollment at the selected center, the API will include teachers whose assignments:

- belong to the enrolled class;
- have started on or before the current date;
- have not ended, or end on or after the current date.

The API will also include active users with a `director` role assigned directly to the center. It will not include teachers from other classes or organization-level owners.

Existing threads remain accessible to their participants. The structured identity for an existing parent/staff thread will be resolved using the same active enrollment and assignment rules so thread lists, headers, and contact selection stay consistent.

## Avatar authorization

Private media remains protected by signed URLs. For a media asset referenced by a staff user's avatar, download permission will be granted to a parent only when either:

- the avatar belongs to a teacher actively assigned to one of the parent's child's active classes in that center; or
- the avatar belongs to an active director assigned directly to a center where the parent's child has an active enrollment.

This permission is limited to the exact user-avatar asset and does not expose unrelated media or unrelated staff avatars. Existing owner, director, teacher, guardian, album, report, document, and child-photo permissions remain unchanged.

## Client behavior

Web and mobile clients will use one identity-formatting helper per platform implementation. The helper will be used for contact search, contact rows, thread rows, conversation headers, and avatar initials. UUID-backed avatars will continue to resolve through the existing signed media endpoint, with legacy direct URLs and initials as fallbacks.

## Error handling

- A missing or inaccessible avatar falls back to initials without blocking messaging.
- A parent with no eligible staff receives the existing empty-contact state.
- Missing parent identity context falls back to the participant's normal display name.
- Duplicate contacts caused by multiple enrollments or assignments are deduplicated by user ID.

## Verification

- Unit tests cover current, future, and ended teacher assignments and exclusion of unrelated teachers and organization owners.
- Media tests cover authorized related-teacher/director avatars and rejection of unrelated staff avatars.
- Contract tests cover structured parent identity context.
- Typechecks run for shared, API, web, and all three mobile applications.
- Existing API tests must continue to pass.
