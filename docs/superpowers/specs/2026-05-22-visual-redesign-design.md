# Visual redesign — Warm Editorial direction

**Date:** 2026-05-22
**Owner:** stephen@tryastraea.com
**Scope:** Scope 2 — full visual restyle + Foursquare photo integration. No layout reorganization; no new product features.
**Status:** Design approved, awaiting implementation plan.

## Goal

The meal planner currently works but feels generic — default system fonts, plain panels, default browser buttons, default OSM tiles. This redesign gives it a coherent editorial identity that suits its purpose (planning meals for a vacation), without changing any behavior or adding any features.

Success criteria:

- App looks intentional and "designed" — visible identity in fonts, color, and component shapes
- All current functionality preserved; all 62 existing tests still pass
- No new runtime dependencies beyond Google Fonts and Foursquare's photos endpoint
- Photos add visual weight without blocking the UI when they're missing or slow
- Ships as 7 independently-mergeable steps so each step can be QA'd in isolation

Non-goals:

- Trip naming / multi-day itineraries / printable view — out of scope
- New search filters or ranking changes — out of scope
- Refactor of state, persistence, or sharing — out of scope

## Visual direction

**Personality:** Warm Editorial — references Eater, Bon Appétit, NYT Cooking. Magazine-like, foodie, sun-drenched.

**Palette:** Terracotta + Olive on a Cream/Linen base.

| Token | Hex | Role |
|---|---|---|
| Bone | `#faf6ee` | App background |
| Linen | `#f4ecdf` | Panel background |
| Cream | `#fffaf0` | Card / input surface |
| Sand | `#e6d6b8` | Borders / dividers |
| Terracotta | `#c2410c` | Primary accent / pins / CTA |
| Olive | `#4a5d23` | Secondary / category labels / saved pins |
| Espresso | `#2a1f17` | Body text |
| Stone | `#8a7563` | Muted text |

Contrast verified: Espresso-on-Linen and Terracotta-on-Cream both pass WCAG AA.

**Typography:** Fraunces (variable serif, italic for display) + Inter (sans-serif body). Both loaded from Google Fonts; minimal weights to keep payload small.

Type ramp:

| Step | Font | Size / line | Usage |
|---|---|---|---|
| Display 1 | Fraunces italic 600, `opsz: 144`, `SOFT: 100` | 40/44, `-0.015em` | Hero, dialog titles |
| Display 2 | Fraunces italic 600, `opsz: 96` | 26/29 | Tab section heads |
| Heading | Fraunces 600 | 18/22 | Restaurant names in popups |
| Body | Inter 400 | 14/21 | UI text, descriptions |
| Small | Inter 400 | 12/17 | Meta, helper text |
| Label | Inter 500, uppercase, `0.12em` | 11/15 | Categories, buttons, tabs |

**Spacing:** 4px grid — `4 / 8 / 12 / 16 / 24 / 32 / 48`.

**Radii:** `sm 4 / md 6 / lg 10 / xl 14`. Buttons & inputs use 6; cards use 10; panel shell uses 14.

**Shadow:** Single warm shadow scale `0 12px 32px rgba(42,31,23,0.12)` for elevated panels, `0 8px 24px rgba(42,31,23,0.12)` for popups, `0 16px 48px rgba(42,31,23,0.18)` for modals.

## Map & pins

**Tile layer.** Replace OSM default with CartoDB Positron:

```
https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
```

No API key required. Attribution string: `© OpenStreetMap contributors © CARTO`. Single line change in `MapView.tsx`.

**Pins.** Custom `L.divIcon` rendered as a terracotta teardrop (28×28, `border-radius: 50% 50% 50% 0`, rotated `-45deg`) with a 3px Cream stroke and a soft shadow. Variants:

- Default (search result): terracotta fill, no label
- Saved: olive fill, no label
- Itinerary: terracotta fill with a numbered label (the sequence within its meal slot). Itinerary state takes precedence over saved state for pin appearance — a place that's both saved and in the itinerary renders as the numbered terracotta pin.
- Hover/active: slight scale-up, accent ring

Pin contents are pure CSS — no SVG sprites to ship.

**User-location dot.** 8px solid olive + 16px translucent olive ring. Reads as "you" without competing with terracotta pins.

**Popup.** Restyle `.leaflet-popup-content-wrapper`:

- Cream surface, `radius: 10`, `0 8px 24px rgba(42,31,23,0.12)` shadow
- Restaurant name in Fraunces 16 italic
- Category in olive uppercase Label
- Photo strip (first Foursquare photo, ~60px tall) above the actions when present; gracefully absent when not
- Actions: `Save` (terracotta solid), `+ Itinerary` (ghost), `Google Maps` (text link)

**Zoom control.** Restyle the default `+/-` to Cream background, Sand border, Espresso glyphs, 6px radius, no harsh shadow.

**Attribution control.** Cream-tinted background, Stone text, Inter 10px — so it sits in the corner without breaking the editorial feel.

## Panel shell & navigation

**Shape.** Keep the existing responsive behavior (sidebar on desktop, bottom sheet on mobile). Surface and chrome change.

**Desktop sidebar.**

- Width `380px` (up from 360 — give cards room to breathe)
- Linen background, `radius: 14`, single soft shadow `0 12px 32px rgba(42,31,23,0.12)`
- 1px Sand border
- Internal padding `20px` (top + horizontal)

**Header strip (new).** Above the tab strip:

- Trip name on the left, Fraunces italic 18, hardcoded as *"Your trip"* for this redesign (making it editable is a separate feature)
- Share icon button on the right, replacing the floating blue Share button currently in the top-right of the map

**Tabs.** Search · Saved · Itinerary

- Inter 11, uppercase, `0.12em` letter-spacing
- Inactive: Stone color
- Active: Espresso color, 1.5px Terracotta underline
- Counts inline (`Saved · 2`) in Stone smaller

**Bottom sheet (mobile).** Same Linen + 14px top radii, with a 4×36px Sand grab handle centered at the top to signal draggability.

**Floating action buttons.** Audit current floaters and remove or rehome:

- Share button → header strip (above)
- The blue circular `?` info FAB in the bottom-left (visible in current screenshot): verify what it does during implementation. If vestigial, drop it. If it serves a real purpose, restyle as a small Cream circle with a terracotta `?` glyph.

## Search, Saved, Itinerary content

**Restaurant card (Search + Saved).** Horizontal layout:

- 88px-wide photo on the left
- Body on the right with: name (Fraunces 600 / 15), category (olive uppercase Label / 10), distance (Stone / 11 — Search only), action row (compact uppercase pills)
- Photo fades in when loaded
- Photo fallback: Linen→Sand gradient with the first letter of the restaurant set in Fraunces italic at ~20px Stone color — looks intentional, never broken
- Action variants:
  - Solid (terracotta): primary action (`Save` on search results)
  - Ghost (1px Espresso border, transparent): secondary (`+ Itinerary`, `Remove`)
  - Text link (terracotta underline, no border): tertiary (`Maps`)

**Search tab.** Search input and location bar at the top with new editorial styling:

- Cream-filled input, Sand 1px border, 6px radius, Inter 13
- "Use my location" as a Ghost button to the right of the location input
- Result list below with restaurant cards

**Saved tab.** Adds a magazine-style section heading at the top:

- Fraunces italic 22 (*"Saved spots"*) on the left
- Count in Stone uppercase Label on the right (*"3 places"*)
- Cards below

**Itinerary tab.** Each meal slot (Breakfast / Lunch / Dinner / Snacks) becomes a Cream card with `radius: 10`:

- Heading row: meal name in Fraunces italic 16; item count in Stone uppercase Label on the right (*"2 spots"*) or *"empty"* in italic when empty
- Items: olive numbered badge (22×22 circle, Fraunces italic, 11) + 36×36 thumbnail + name + category + reorder/remove icon buttons
- Empty slots show a Stone italic hint instead of a hard "Empty" — softer, on-brand

## Photo integration

**Source.** Foursquare's `/places/{fsq_id}/photos` endpoint. Same `Bearer` auth and `X-Places-Api-Version: 2025-06-17` header as the existing `/places/search` call. Returns a list of photos with `prefix` + `suffix` URLs to be joined with a size (e.g., `300x300`).

**Fetch pattern.** Lazy per card:

- New API route `api/photos.ts` (or extension of `api/places.ts`) accepting `fsq_id`, returning `{ photoUrl: string | null }` (first photo at 300×300)
- Client uses `IntersectionObserver` to trigger fetch when a card enters the viewport
- In-memory cache keyed by `fsq_id` to dedupe re-renders and tab switches
- Saved + Itinerary places persist their `photoUrl` in localStorage along with the rest of the place data — no refetch after save

**Type changes.** Extend `Place` in `src/types.ts` with `photoUrl?: string` (optional, never required). Existing reducer logic and tests are unchanged because the field is additive.

**Failure handling.** Photo fetch errors (404, 401, timeout) are swallowed silently — the card falls back to the letter placeholder. Photos are never load-bearing for app function.

**Performance.** Only the photos for cards currently in the viewport are requested. List virtualization is not required at the current scale (20-result lists).

## Dialogs and polish

**Share dialog.**

- Modal centered, Cream surface, `radius: 14`, `0 16px 48px rgba(42,31,23,0.18)` shadow
- Backdrop: `rgba(42,31,23,0.45)`
- Title: Fraunces italic (*"Share your trip"*)
- URL in a Cream-filled readonly textarea, `JetBrains Mono 11`, 1px Sand border, 6px radius
- Buttons: `Copy link` (terracotta solid), `Close` (ghost)

**Add-to-itinerary popover.**

- Same Cream surface and spacing as the share dialog
- Title in Fraunces italic (*"Add &lt;name&gt; to…"*)
- 2×2 grid of meal-slot choices as Ghost buttons (Inter uppercase 11, 1px Espresso border, Linen on hover)
- Cancel below as a text link in Stone

**Toast.**

- Desktop: bottom-center. Mobile: top-center (so it doesn't hide behind the bottom sheet).
- Espresso background, Cream text, `radius: 10`, soft shadow, Inter 13
- 200ms slide-up / fade-in

**Click-to-set-search-center marker.** Replace whatever Leaflet currently renders with a small olive ring + crosshair so it reads as a "search from here" affordance and matches the user-location dot.

**Empty states.**

- Search with no query: Fraunces italic centered (*"Where are you eating?"*), Stone color, single line of small Inter helper text
- Saved tab empty: Fraunces italic + small "Search and tap Save to start"
- Itinerary slot empty: handled per-slot (see Itinerary section)

**Loading & errors.**

- Search loading: shimmer rows shaped like the photo card (88×88 Sand block + horizontal lines). No spinners.
- API error banner: existing banner restyled in muted terracotta (Cream text, Terracotta background at 0.85 opacity), with a small italic "Try again" link

**Accessibility.**

- All transitions wrapped in `@media (prefers-reduced-motion: no-preference)`
- Focus rings: `outline: 2px solid #c2410c; outline-offset: 2px` on all interactive elements
- All new color combinations verified for WCAG AA contrast

## Implementation order

Each step is independently shippable. The app remains usable and visibly improved after every step.

1. **Tokens layer.** Add CSS custom properties to a new `src/styles/tokens.css` (imported from `index.css`). Wire Google Fonts in `index.html` with `<link rel="preconnect">`. Replace base resets.
2. **Panel shell.** Restyle `PanelShell.tsx` + tabs; build new header strip; move the Share button into the header.
3. **Search / Saved / Itinerary cards.** Restyle `ResultList`, `SavedList`, `MealSlot`, `SearchBar`, `LocationBar` with new card shapes — without photos yet. App is shippable here.
4. **Map tiles + pin + popup.** Swap to CartoDB Positron in `MapView.tsx`. Implement custom `L.divIcon`. Restyle the popup.
5. **Foursquare photo fetch.** Add `api/photos.ts` (or extend `api/places.ts`). Extend `Place` type with `photoUrl?`. Lazy-load in cards via `IntersectionObserver`. Cache in-memory; persist URL with saved/itinerary in localStorage.
6. **Dialogs & polish.** Share dialog, add-to-itinerary popover, toast, empty states, focus rings, reduced-motion gating, search-center marker.
7. **Manual QA pass.** Load the Vercel preview on desktop + mobile Safari. Verify pin sizes, popup readability, photo lazy-loading, panel scroll behavior at long lists, focus rings, color contrast.

## Files touched

| File | Change |
|---|---|
| `index.html` | Add Google Fonts links (Fraunces, Inter) |
| `src/index.css` | Import tokens, remove generic resets |
| `src/styles/tokens.css` *(new)* | CSS custom properties for color / type / spacing / radii / shadow |
| `src/App.css` | Major rewrite — every component restyled |
| `src/components/PanelShell.tsx` | Add header strip, restructure for new tab styling |
| `src/components/MapView.tsx` | Swap tile layer, custom divIcon, popup styling |
| `src/components/SearchTab/*` | New card layout |
| `src/components/SavedTab/*` | New card layout + section heading |
| `src/components/ItineraryTab/MealSlot.tsx` | New meal slot card, numbered badge, thumbnail |
| `src/components/ShareDialog.tsx` | Restyle modal, copy button |
| `src/components/AddToItineraryPopover.tsx` | New grid layout, restyled buttons |
| `src/components/Toast.tsx` | New surface, reposition on mobile |
| `src/types.ts` | Add `photoUrl?: string` to `Place` |
| `src/lib/api-client.ts` | Add `fetchPhoto(fsqId)` |
| `src/components/usePhoto.ts` *(new)* | Hook: IntersectionObserver + in-memory cache + fetch |
| `api/photos.ts` *(new)* | Serverless function — proxy Foursquare photos endpoint |

## Out of scope

- Trip naming (header shows hardcoded *"Your trip"*)
- Editable meal-slot names
- Multi-day itineraries
- Print/PDF export
- Refactor of reducer, persistence, or share codec
- Search filters or ranking changes
- Light/dark mode toggle — this redesign is single-mode (light editorial)

## Risks

- **Google Fonts load delays.** Fraunces is a variable font (~80KB). Mitigation: `font-display: swap` + preconnect; fall back to Georgia until loaded.
- **Foursquare photos rate limit.** Same key as search; lazy-loading + caching keeps requests proportional to cards actually viewed. If we hit limits in practice, add a per-fsq_id in-flight dedupe or move to a single batched call.
- **Pin readability on dense CartoDB tiles.** Verify in QA at zoom levels 12-18; if pins disappear into label clutter, bump the pin shadow or size.
- **Existing tests.** All 62 should pass without changes — the redesign touches styles and adds optional `photoUrl`, not logic. If a test asserts on rendered class names or text, update the test to match the new content (don't change behavior to satisfy stale tests).
