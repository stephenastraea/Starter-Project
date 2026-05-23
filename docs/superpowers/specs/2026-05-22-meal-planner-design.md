# Meal Planner — Design Spec

**Date:** 2026-05-22
**Status:** Draft — awaiting user review

## Summary

A free-to-deploy, single-page web app for planning vacation meals on a map. Users see restaurants and food places as pins on an interactive map, hover for a quick summary, click through to Google Maps for full reviews, save favorites, and group picks into a single-day itinerary by meal slot (Breakfast / Lunch / Dinner / Snacks).

## Goals

- Useful for planning vacation meals on both desktop (pre-trip) and phone (day-of).
- Free to host and operate, with no credit card required on file anywhere.
- No accounts; itineraries are local-first with a share-link escape hatch.

## Non-goals (v1)

- User accounts or cloud sync.
- Multi-day itineraries.
- Routing/directions between picks.
- Drag-and-drop reordering (use up/down buttons instead).
- Showing Google's own rating/review count inline (Foursquare data is shown on hover instead; Google reviews are reached by clicking through).
- User-configurable search radius (fixed at 10 miles / 16093 meters in v1).

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                            │
│                                                                 │
│   React + Vite + TypeScript                                     │
│   Leaflet (OSM tiles)                                           │
│   State: React Context + useReducer                             │
│   Persistence: localStorage  +  URL hash (for share links)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │ same-origin fetch (JSON)│
              ▼                         ▼
   ┌──────────────────────┐   ┌──────────────────────┐
   │  /api/places         │   │  /api/geocode        │
   │  Vercel function     │   │  Vercel function     │
   │  → Foursquare API    │   │  → Nominatim (OSM)   │
   │  FOURSQUARE_KEY env  │   │  no key required     │
   └──────────────────────┘   └──────────────────────┘

External (no key, free):
  • OSM tile servers (map tiles, via Leaflet)
  • google.com/maps/search/?api=1&query=...  (click-through link)
```

### Key choices

- **Two serverless functions**, not one. `places` and `geocode` have different concerns and rate-limit shapes; splitting them keeps each function small and lets either provider be swapped independently later.
- **Foursquare key lives only in the function**, set via `vercel env add FOURSQUARE_KEY`. Never exposed to the browser.
- **Nominatim** for geocoding is free with no key, but has a strict 1-req/sec usage policy. The serverless function debounces and sets a `User-Agent` header (which Nominatim requires).
- **No new client deps beyond Leaflet and React-Leaflet.** State stays in a Context-backed reducer — no Zustand/Redux.
- **Share-link** is a `#`-fragment, not a query string: fragments don't get sent to the server, and the encoded payload can be ~2–3 KB without issues.

## Components

```
<App>
├── <AppStateProvider>           // Context + useReducer; wraps everything
│   ├── <MapView>                // Leaflet map, fills viewport
│   │   ├── <CenterMarker>       // Blue dot for the current search center
│   │   ├── <ResultPin> × N      // Red pins (up to 20), with hover popup
│   │   └── <ClickToPlaceLayer>  // Captures map-click → moves center
│   │
│   └── <PanelShell>             // Responsive container
│       │
│       ├── desktop layout: <Sidebar> on the left, fixed width
│       └── mobile layout:  <BottomSheet>, swipeable, three snap points
│
│           Both contain the same three tabs:
│           ├── <SearchTab>
│           │     ├── <LocationBar>     // address input + 📍 "use my location"
│           │     ├── <SearchBar>       // restaurant/cuisine query
│           │     └── <ResultList>      // mirrors the pins, scrollable
│           │
│           ├── <SavedTab>
│           │     └── <SavedList>       // saved places, each with "remove" + "add to itinerary"
│           │
│           └── <ItineraryTab>
│                 ├── <MealSlot name="Breakfast"></MealSlot>
│                 ├── <MealSlot name="Lunch"></MealSlot>
│                 ├── <MealSlot name="Dinner"></MealSlot>
│                 └── <MealSlot name="Snacks"></MealSlot>
│
└── <ShareDialog>                // Triggered from a top-right button; shows copy-link
```

### Component notes

- **`<MapView>`** owns the Leaflet instance and translates Leaflet events into reducer actions. Hover/click are handled inside `<ResultPin>` — hover opens a Leaflet `Popup`; click opens the Google Maps URL via `window.open(url, '_blank', 'noopener')`.
- **`<PanelShell>`** picks layout from a CSS media query, not a JS resize listener. One component tree, two layouts via CSS — no duplicated children.
- **`<MealSlot>`** is a drop target. Items inside expose a "remove" and a "move to other slot" action. Reordering within a slot is up/down buttons.

### State shape

```ts
type AppState = {
  center: { lat: number; lng: number } | null;
  geolocationStatus: 'idle' | 'pending' | 'granted' | 'denied';
  query: string;
  results: Place[];        // current pins
  saved: Place[];          // saved list, dedup'd by fsq_id
  itinerary: Record<MealSlot, Place[]>;
  panelTab: 'search' | 'saved' | 'itinerary';
};

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

type Place = {
  fsq_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];    // human-readable cuisine
  rating?: number;         // foursquare 0–10
  tipsCount?: number;      // foursquare reviews-equivalent
  googleUrl: string;       // pre-built link for click-through
};
```

## Data flow

### On page load

1. Parse the URL hash. If it contains a valid encoded payload, hydrate `saved` and `itinerary` from it (and overwrite localStorage so the share-link is now "yours").
2. Otherwise, hydrate `saved` and `itinerary` from localStorage.
3. Request browser geolocation.
   - **Granted** → set `center` to those coords.
   - **Denied or unavailable** → leave `center` null and show an inline banner asking the user to type an address or click the map.
4. Map renders; if `center` is set, fly to it at zoom ~13.

### Search

1. User types in `<SearchBar>`. Input is debounced 350ms.
2. Reducer dispatches `SEARCH_START` (sets a loading flag). Component fires `GET /api/places?lat=…&lng=…&q=…&radius=16093` (10 miles in meters).
3. `api/places` server function:
   - Validates inputs (lat/lng numeric and in-range, radius capped, q ≤ 100 chars).
   - Calls Foursquare `GET /places/search` with `categories=13065` (food category) plus the query, `ll=lat,lng`, `radius`, `limit=20`, `sort=RATING`.
   - Maps the response to the trimmed `Place[]` shape above, generating each `googleUrl` as `https://www.google.com/maps/search/?api=1&query=<encoded name + address>`.
   - Returns JSON.
4. Reducer dispatches `SEARCH_SUCCESS` with the results. Pins render; `<ResultList>` mirrors them.

### Address override

1. User types an address in `<LocationBar>`, hits enter.
2. `GET /api/geocode?q=…` → Nominatim → `{ lat, lng, displayName }`.
3. Reducer dispatches `SET_CENTER`. Map flies there. Any in-flight or stale search is dropped; the user re-runs search if they want.

### Click-to-place-pin

1. Map click → `<ClickToPlaceLayer>` dispatches `SET_CENTER` with the clicked coords.
2. Same as address override from here.

### Pin interactions

- **Desktop hover** → Leaflet `Popup` shows name · cuisine · "★ 8.4 · 27 tips" (label clarifies these are Foursquare's). Rating/tips fields are omitted if Foursquare doesn't return them.
- **Desktop click on the pin marker itself** → `window.open(place.googleUrl, '_blank', 'noopener')`. We don't navigate the user away.
- **Touch devices (no hover available)** → A tap on the pin opens the popup *instead of* opening Google directly. The popup contains an explicit "Open in Google Maps" button that performs the same `window.open` call. This avoids ambiguity from the missing hover state.
- **Save** action (button in the popup and in `<ResultList>`) → `SAVE_PLACE`. Toggle: a second click un-saves.
- **Add to itinerary** action (button in the popup, in `<ResultList>`, and in `<SavedList>`) → opens a small popover with the four meal slots; clicking a slot dispatches `ADD_TO_ITINERARY` with the slot.

### Persistence

- After every state change to `saved` or `itinerary`, a `useEffect` writes those two slices (only) to `localStorage` under `meal-planner:v1`.
- Search results and the map center are **not** persisted — they're transient.

### Share

1. User clicks "Share" → `<ShareDialog>` opens.
2. Serialize `{ saved, itinerary }` to JSON, gzip-compress with the browser's `CompressionStream` API, then base64url-encode.
3. URL is `https://<site>/#s=<encoded>`. Dialog shows the URL with a "Copy" button.
4. Opening a share link triggers the hydration step described in "On page load."

## Error handling

The principle: fail loudly to the user when something they did needs another action; fail quietly with a fallback when it's transient.

### Geolocation

- *Denied / blocked / timed out (>8s).* Set `geolocationStatus = 'denied'`. Show a dismissible banner at the top of the panel: "We couldn't get your location. Enter an address above or click the map." Map stays at a neutral world view (zoom 2, center 0,0). Search button is disabled until `center` is set.
- *Browser doesn't support geolocation at all.* Same as denied.

### Address geocoding (`/api/geocode`)

- *No results.* Inline error under the address bar: "No places found for '<query>'."
- *Upstream (Nominatim) failure or 5xx.* Inline error: "Couldn't look up that address. Try again." No automatic retry — Nominatim's politeness policy makes that a bad pattern.
- *Network offline.* Same inline message.

### Place search (`/api/places`)

- *Empty result set.* `<ResultList>` shows "No places matched. Try a wider term or move the map." Map clears any prior pins.
- *Foursquare 4xx other than 404.* Toast: "Search failed. Please try again." Keeps prior results on the map.
- *Foursquare 5xx or our function error.* Toast with a retry action. One automatic retry with 1s backoff before showing the toast.
- *Rate-limited (429).* Toast: "Searching a bit too fast — try again in a moment." Search button disabled for 5s.
- *Network offline.* Toast: "You appear to be offline."

### Pin click-through

- `window.open` returning null (popup blocker) → toast: "Your browser blocked a new tab. Allow popups for this site, or copy this link." Show the URL inline so they can copy it.

### Persistence

- *localStorage write fails (quota / private mode).* Catch and toast once per session: "Your browser isn't saving data — your list and itinerary will reset when you close this tab."
- *localStorage read returns malformed JSON.* Treat as empty state. Log to console.

### Share-link hydration

- *Hash decodes but JSON is invalid, or schema doesn't match.* Ignore the hash, fall back to localStorage, show a one-time toast: "That share link looks broken. Showing your saved data instead." Do not mix-and-match partial data.
- *Hash decodes correctly but contains 0 items.* Treated as a valid empty share; no error.

### Map tiles

- OSM tile load failures are visual only. Leaflet handles retries; we don't intervene.

### Inputs

- Search query stripped to 100 chars, trimmed. Empty query disables the search button.
- Lat/lng on the server function clamped/validated; out-of-range → 400 with a JSON `{ error }` body. Client surfaces this as the generic search-failed toast.

### Explicitly out of scope (v1)

- Offline mode beyond honoring whatever's in localStorage.
- Background re-sync when connection returns.
- Error reporting / telemetry. Just `console.error` for unexpected paths.

## Testing

### Unit tests (Vitest)

- *Reducer.* Save toggle de-dupes by `fsq_id`. Add-to-itinerary moves a place between slots (doesn't duplicate it). Remove-from-itinerary leaves saved list alone. Removing a saved place that's also in the itinerary leaves the itinerary entry intact.
- *Share-link codec.* `encode(state)` → `decode(...)` round-trips. Decoding a malformed string returns `null` rather than throwing. Missing required fields → `null`. Unknown meal slot drops only that slot, not the whole payload.
- *Google URL builder.* Names and addresses with spaces, commas, apostrophes, and non-ASCII produce URLs that round-trip through `encodeURIComponent`.
- *Foursquare → Place mapper* (exported from `api/places.ts`). Missing `rating`/`tips_count` become `undefined`, not `0`/`null`. Empty `categories` handled.

### Component tests (React Testing Library)

- *`<MealSlot>` interactions.* Adding an item to a slot renders it. The "move to other slot" picker dispatches the right action.
- *`<PanelShell>` responsive switch.* Mocking `matchMedia`, the desktop tree renders `<Sidebar>` and the mobile tree renders `<BottomSheet>`. Same children inside both.
- *`<SearchBar>` debounce.* Typing fast fires exactly one dispatch after the debounce window.

### Integration test (one)

- *Search → pin → save → itinerary → share → reload from share URL.* Mocks the two `/api/*` endpoints. Walks the full happy path.

### Explicitly not tested

- Leaflet itself.
- Live Foursquare and Nominatim responses. Server functions mock the upstream `fetch` boundary in tests.
- Visual regression (no Percy/Chromatic).
- Real geolocation API; mocked to a fixed coord in the few tests that need it.

### Manual smoke checklist (run before each deploy)

1. Open in an incognito window. Grant location. Search "ramen". See up to 20 pins.
2. Hover a pin → popup shows cuisine + Foursquare rating + tips count, labeled.
3. Click a pin → new tab opens to Google Maps for that place.
4. Save 3 places, drop them into different meal slots.
5. Hit Share. Copy the URL. Open in a different browser. See the same saved + itinerary.
6. Deny location on first load. Type an address. Map flies there. Search works.
7. Resize to phone width. Bottom sheet appears, sidebar gone. Same actions still work.

## Operational notes

- **Foursquare API key:** Create a developer account at developer.foursquare.com, generate a key, and add it to Vercel as `FOURSQUARE_KEY` for both Preview and Production environments. Local development reads from `.env.local`.
- **Free-tier sanity:** Foursquare's developer tier allows ~1,000 calls/day. With 350ms debounce + 20-result `limit`, a single user's session is well under this.
- **Nominatim usage policy:** Send a descriptive `User-Agent` (e.g., `meal-planner/1.0 (contact: <email>)`). Do not bulk-query. The server function will rate-limit itself to 1 req/sec.
- **No analytics, no cookies.** Nothing that would require a consent banner.
