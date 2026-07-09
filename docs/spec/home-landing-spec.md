# Home landing page (`packages/home`)

Kidsnote-style public marketing site for Kichkintoy, mirroring the layout and
feel of https://www.kidsnote.com/ but built on the Kichkintoy design language
(cream ground, teal primary, candy accents, Baloo 2 display + Inter body).

## Package

- `packages/home` — standalone Next.js app (same stack as `packages/web`:
  Next 16, React 19, Tailwind 3, i18next via `@kichkintoy/translations`).
- Dev port **3002** (`pnpm dev:home`), so it can run next to web (3000/3001).
- Login / Sign up buttons link to the web app: `NEXT_PUBLIC_APP_URL`
  (default `http://localhost:3000`) + `/login` / `/signup`.

## Page structure (kidsnote order)

1. **Navbar** — sticky; logo wordmark, anchor links (Features, Roles,
   Payments, Get started), language switcher (UZ/RU/EN), Login + Sign up.
2. **Hero** — "Bog'cha va oilani bog'laydi" headline, subtitle, CTAs, and the
   signature element: a full-height CSS phone mockup mirroring the real
   parent-app home screen (child header + bell, "Bugun" greeting banner,
   center card with the actual 2×4 shortcut grid and pager dots, today's
   report card with the mood/photos/updates stat row, 5-tab bar). Kidsnote
   style "in action" moments: a paper plane flies in and keeps gliding, the
   bell rings, the check-in tick pulses, floating notification cards
   (attendance ✓, new photos) and a typing chat bubble drift beside the phone.
3. **Stats band** — teal strip with honest product facts (3 roles, 3
   languages, 15+ modules, free for parents).
4. **Mission** — short narrative (kidsnote's origin-story section) inside a
   scroll-parallax icon field: the app's feature tiles (real mobile grid
   colors) scattered around the statement, each drifting at its own speed
   while scrolling (`components/parallax.tsx`; desktop only, reduced-motion
   disables it).
5. **Value props** — 4 cards: free for parents, web + mobile, uz/ru/en,
   Payme & Click payments.
6. **Features** — kidsnote's blue band: app-blue ground, big white 2-column
   cards for the 8 features (reports, albums, attendance, calendar, meals,
   medications, chat + AI, documents). Hover lifts the card, rotates the plus
   into a close and unfolds an extra `more` detail paragraph.
7. **Showcase** — kidsnote's alternating feature spotlights, five rows with
   hand-built CSS screens of the real mobile app as proof: AI chatroom
   (parent/teacher/director), daily reports, attendance calendar, albums,
   documents. Two-tone headline (dark kicker + domain-colored title), body,
   3 check bullets; phone sits in a white blob, sides flip each row.
8. **Roles** — parent / teacher / director cards with per-role bullets.
9. **Payments spotlight** — tuition invoices with Payme/Click, mock invoice
   card ("1.500.000 so'm", To'landi).
10. **Services swiper** — kidsnote's "How about these services?" band: dark
    ink ground, scroll-snap carousel of 14 white cards covering everything
    (AI, reports, attendance, albums, payments, documents, notices, calendar,
    meals, medications, pickups, notifications, 3 languages, web + mobile)
    with arrow controls and per-card anchor CTAs.
11. **Download / CTA** — start-free card + note about the three mobile apps.
12. **Footer** — ink background, links, contact, legal, copyright.

## Rules honored

- Every string in `home.json` (new namespace) for uz / ru / en.
- Scroll-reveal animations via IntersectionObserver; hero float/pop-in;
  `prefers-reduced-motion` disables all of it.
- Money as `1.500.000 so'm`, Uzbek-first copy.
