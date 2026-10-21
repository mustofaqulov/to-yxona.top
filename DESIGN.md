# To‘yxona Top — design direction

## Product

A wedding venue discovery and booking interface for Uzbekistan, initially focused on Qarshi. Families need to compare location, capacity, total price, photographs, services and availability before choosing a venue. The current catalogue and booking flow use demonstration data.

## Visual direction

Warm, editorial and welcoming: ivory surfaces, deep olive actions, terracotta accents inspired by the supplied logo, and serif headings. Venue photography carries the visual identity. Search, comparison and booking controls remain the main actions.

- Background: `#f9f7f2`; surface: `#fffefa`.
- Primary action: `#354d3b`; white button text.
- Accent: `#ab573e`; text: `#293b30`.
- Dark background: soft charcoal `#181818`; dark surface: `#222222`.
- Headings: Georgia; interface text: Segoe UI / Arial.
- Theme variables, responsive layouts and shared control styles: `src/app/globals.css`.

## Shared components

`Navbar`, `Footer`, `HallCard`, `Select`, `DatePicker`, `Icon` and `AuthStory` provide consistent presentation across the home page, catalogue, venue details, authentication and profile screens. New editorial copy lives in `src/lib/design-copy.ts`, with Uzbek, English and Russian variants.

Cards show total prices, matching the budget filter and price sorting. Mobile catalogue filters collapse behind a button. Language and theme preferences are restored before being persisted. Reduced motion and visible keyboard focus are supported.

## Boundaries

This redesign does not turn demo authentication or booking into production services. Select and date controls use shared, themed portal panels with keyboard navigation, viewport positioning and outside-click dismissal. Venue photographs currently use the existing external image URLs, with a local fallback on catalogue cards.
