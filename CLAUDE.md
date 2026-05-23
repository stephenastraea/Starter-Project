# CLAUDE.md

Quick context for AI assistants opening this repo. Read this before making changes.

## What this is

A vacation meal planner deployed at **https://beijing-tau.vercel.app**. Interactive Leaflet map searches Foursquare for nearby restaurants in a 10-mile radius, lets the user save picks, organize them by meal slot (Breakfast / Lunch / Dinner / Snacks), and share the itinerary via a URL hash. Local-first; no accounts.

Owner: stephenastraea (GitHub) / stephen@tryastraea.com.

## Where the design lives

- **Design spec:** `docs/superpowers/specs/2026-05-22-meal-planner-design.md` — read this first if you need to make non-trivial changes
- **Implementation plan:** `docs/superpowers/plans/2026-05-22-meal-planner.md` — 31 TDD-structured tasks that built the app

The spec is the source of truth for product behavior. If the code drifts from the spec, fix the spec or fix the code — don't leave them out of sync without flagging.

## Stack

- React 19 + Vite + TypeScript (SPA)
- React-Leaflet over OpenStreetMap tiles (no map API key)
- Two Vercel serverless functions: `/api/places`, `/api/geocode`
- State: Context + useReducer in `src/state/`
- Persistence: `localStorage` for saved + itinerary; URL hash (gzip + base64url) for sharing
- Tests: Vitest + React Testing Library

## File map

```
src/
  App.tsx                  top-level wiring
  types.ts                 Place, MealSlot, AppState, Itinerary
  state/
    reducer.ts             single source of truth, save/itinerary/search actions
    AppStateProvider.tsx   Context wrapper + useAppState/useAppDispatch hooks
    usePersistence.ts      hydrate from + write to localStorage
    useShareHydration.ts   read URL hash on mount
  lib/
    api-client.ts          fetchPlaces, geocode, ApiError
    google-url.ts          buildGoogleMapsUrl (note: apostrophe escaping is intentional)
    share-codec.ts         encodeShareState/decodeShareState (gzip+base64url)
    geolocation.ts         getUserLocation
  components/
    MapView.tsx            Leaflet map, pins, popups, click-to-place-center
    PanelShell.tsx         responsive sidebar (desktop) / bottom sheet (mobile)
    SearchTab/SavedTab/ItineraryTab + SearchBar/LocationBar/ResultList/SavedList/MealSlot
    ShareDialog.tsx, AddToItineraryPopover.tsx, Toast.tsx

api/
  places.ts                Foursquare-backed; dedupes by name; oversamples to 50, slices to 20
  geocode.ts               Nominatim/OSM; politeness User-Agent set
  _lib/foursquare.ts       mapFoursquareResult + dedupe helper
```

## Gotchas

- **Foursquare migrated their Places API in 2025.** Endpoint is `https://places-api.foursquare.com/places/search`, auth is `Bearer <key>`, requires `X-Places-Api-Version: 2025-06-17` header. The old v3 endpoint at `api.foursquare.com/v3/...` returns 401 with current keys. The mapper in `api/_lib/foursquare.ts` supports both response shapes for safety.
- **New API doesn't expose `rating` or `tipsCount`** in default search results. The hover popup omits those when missing — the click-through to Google Maps still surfaces real review data.
- **Vercel serverless functions use nodenext module resolution.** Relative imports in `api/*.ts` MUST use `.js` extensions (e.g. `import './_lib/foursquare.js'`), even though the source is `.ts`. Forgetting this works locally under Vitest but fails at runtime on Vercel with `FUNCTION_INVOCATION_FAILED`.
- **`vercel dev` does NOT load `.env.local`** for serverless functions when the project is linked. Env vars must be set on the Vercel project (`vercel env add FOURSQUARE_KEY <env>`), not just in `.env.local`. The dev server then pulls them.
- **Search results dedupe by lowercased+trimmed name.** Chains like "Shake Shack" appearing at multiple physical locations collapse to the closest. "Shake Shack" vs "Shake Shack Innovation Kitchen" are intentionally distinct.
- **Nominatim rate-limit is unenforceable on Vercel serverless** (no shared state across cold starts). We rely on client-side debounce + descriptive `User-Agent`. Documented in the spec.

## Developing

```sh
npm install
npm run dev      # client only — searches will 404 because /api/* isn't served
vercel dev       # client + functions; uses env vars from the linked Vercel project
npm test         # 62 tests across 10 files
npm run build    # tsc -b && vite build
npm run lint
```

For `vercel dev` to work, the env var must be present:
```sh
vercel env add FOURSQUARE_KEY development --value <key> --yes
```
(Already done for this project as of the initial deploy.)

## Deploying

The Vercel project is `stephenastraeas-projects/beijing`. NOT auto-deployed from GitHub yet — must use the CLI:

```sh
vercel deploy --prod --yes   # publishes to https://beijing-tau.vercel.app
```

To enable auto-deploy on git push, connect the GitHub repo in the Vercel project settings (https://vercel.com/stephenastraeas-projects/beijing/settings/git). After connecting, `FOURSQUARE_KEY` for `preview` env can be set with a specific git-branch argument.

## Git workflow

- GitHub repo: `stephenastraea/Starter-Project` (origin)
- Conductor upstream: `meltylabs/Quickstart`
- Conductor creates a per-workspace branch — don't push to `main` directly; open PRs via `gh pr create --base main`
- The current development was on `stephenastraea/website-brainstorm` (PR #2 merged or pending)

## Conventions in this codebase

- TDD where it has value: pure logic (reducer, codec, mappers, URL builders) and component interactions (SearchBar debounce, PanelShell responsive, MealSlot reorder). UI rendering / styles aren't unit-tested.
- One file = one responsibility. Don't co-locate unrelated utilities.
- Each `MapSlot` of state in the reducer is independent — moving a place between slots dispatches `ADD_TO_ITINERARY` (which deletes from the old slot first); removing from a slot does NOT remove from saved (independence is tested).
- Don't store transient state (search results, map center) to localStorage. Only `saved` and `itinerary`.
- No comments unless they explain WHY (a non-obvious constraint, a bug workaround). Don't narrate code.
