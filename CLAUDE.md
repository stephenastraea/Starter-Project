# CLAUDE.md

Quick context for AI assistants opening this repo. Read this before making changes.

## What this is

A vacation meal planner deployed at **https://beijing-tau.vercel.app**. Interactive Leaflet map searches Foursquare for nearby restaurants in a 10-mile radius, lets the user save picks, organize them by meal slot (Breakfast / Lunch / Dinner / Snacks), and share the itinerary via a URL hash. Local-first; no accounts.

Visual identity is "Warm Editorial" — terracotta + olive accents on cream surfaces, Fraunces serif italics for display type, Inter sans for body, CartoDB Positron map tiles.

Owner: stephenastraea (GitHub) / stephen@tryastraea.com.

## Where the design lives

- **Original product spec:** `docs/superpowers/specs/2026-05-22-meal-planner-design.md` — feature behavior, data model, state shape
- **Visual redesign spec:** `docs/superpowers/specs/2026-05-22-visual-redesign-design.md` — current visual direction, token system, component restyling
- **Original implementation plan:** `docs/superpowers/plans/2026-05-22-meal-planner.md` — 31 TDD tasks that built the app
- **Redesign implementation plan:** `docs/superpowers/plans/2026-05-22-visual-redesign.md` — 24 tasks that restyled it

Specs are the source of truth for product/visual behavior. If code drifts from a spec, fix one or the other — don't leave them out of sync without flagging.

The visual redesign spec includes a Phase 5 "photo integration" section. **That section was descoped during implementation** because Foursquare's `/places/{id}/photos` endpoint requires paid API credits — see the post-mortem note at the top of the spec.

## Stack

- React 19 + Vite + TypeScript (SPA)
- React-Leaflet over **CartoDB Positron** tiles (free, no API key, designed for data overlays)
- Two Vercel serverless functions: `/api/places`, `/api/geocode`
- Typography: **Fraunces** (display, variable serif, italic-heavy) + **Inter** (UI) via Google Fonts
- State: Context + useReducer in `src/state/`
- Persistence: `localStorage` for saved + itinerary; URL hash (gzip + base64url) for sharing
- Tests: Vitest + React Testing Library (62 passing as of latest merge)

## Design tokens

All colors, fonts, spacing, radii, and shadows live in `src/styles/tokens.css` as CSS custom properties. Component styles in `src/App.css` must consume tokens, not hard-code values. The palette:

- `--color-bone` / `--color-linen` / `--color-cream` / `--color-sand` — surfaces & borders
- `--color-terracotta` (`#c2410c`) — primary accent / save pins / CTAs
- `--color-olive` (`#4a5d23`) — secondary / category text / saved pins
- `--color-espresso` (`#2a1f17`) — body text
- `--color-stone` (`#8a7563`) — muted text

If you add a new color, define it as a token before using it. There are a few hard-coded hex stragglers in `App.css` (e.g. `#a8370a` darkened terracotta, `#efe0c4` shimmer stop) — those are debt worth cleaning up next time you're nearby, not loading bearing.

## File map

```
src/
  App.tsx                  top-level wiring (Map + PanelShell + ShareDialog)
  types.ts                 Place, MealSlot, AppState, Itinerary
  index.css                global resets + tokens import + focus ring + reduced-motion
  App.css                  per-component styles, ~890 lines, all consume tokens
  styles/
    tokens.css             color / type / spacing / radii / shadow CSS custom properties
  state/
    reducer.ts             single source of truth, save/itinerary/search actions
    AppStateProvider.tsx   Context wrapper + useAppState/useAppDispatch hooks
    usePersistence.ts      hydrate from + write to localStorage
    useShareHydration.ts   read URL hash on mount
  lib/
    api-client.ts          fetchPlaces, geocode, ApiError
    google-url.ts          buildGoogleMapsUrl (apostrophe escaping is intentional)
    share-codec.ts         encodeShareState/decodeShareState (gzip+base64url)
    geolocation.ts         getUserLocation
  components/
    MapView.tsx            Leaflet map, custom divIcon pins, popups
    map-icons.ts           SEARCH_PIN / SAVED_PIN / USER_PIN + numberedPin(n) — all CSS-styled L.divIcon
    PanelShell.tsx         responsive sidebar (desktop) / bottom sheet (mobile), header strip, tabs
    RestaurantCard.tsx     shared horizontal card markup for ResultList + SavedList
    SearchTab/SavedTab/ItineraryTab + SearchBar/LocationBar/ResultList/SavedList/MealSlot
    ShareDialog.tsx, AddToItineraryPopover.tsx, Toast.tsx

api/
  places.ts                Foursquare-backed; dedupes by name; oversamples to 50, slices to 20
  geocode.ts               Nominatim/OSM; politeness User-Agent set
  _lib/foursquare.ts       mapFoursquareResult + dedupe helper
```

## Gotchas

- **Foursquare migrated their Places API in 2025.** Endpoint is `https://places-api.foursquare.com/places/search`, auth is `Bearer <key>`, requires `X-Places-Api-Version: 2025-06-17` header. The old v3 endpoint at `api.foursquare.com/v3/...` returns 401 with current keys. The mapper in `api/_lib/foursquare.ts` supports both response shapes for safety.
- **New Foursquare API doesn't expose `rating` or `tipsCount`** in default search results — removed from the UI accordingly.
- **Foursquare photos are a Premium-tier feature.** `/places/{fsq_place_id}/photos` returns 429 with `"no API credits remaining"` on the free tier. That's why the redesign's photo subsystem was descoped — cards show a Fraunces-italic letter placeholder over a Linen-to-sand gradient instead, which is a deliberate design choice now. If you want photos, the user has to enable Foursquare billing first.
- **Vercel serverless functions use nodenext module resolution.** Relative imports in `api/*.ts` MUST use `.js` extensions (e.g. `import './_lib/foursquare.js'`), even though the source is `.ts`. Forgetting this works locally under Vitest but fails at runtime on Vercel with `FUNCTION_INVOCATION_FAILED`.
- **`vercel dev` does NOT load `.env.local`** for serverless functions when the project is linked. Env vars must be set on the Vercel project (`vercel env add FOURSQUARE_KEY <env>`).
- **`vercel deploy` from an unlinked workspace silently creates a new project** named after the working directory. This workspace is "colombo" — once we fixed the link to `beijing`, the first deploy had already spun up a stray `colombo` project that should be deleted (https://vercel.com/stephenastraeas-projects/colombo → Settings → Delete Project). Always check `.vercel/project.json` before deploying; that file is gitignored so each clone needs `vercel link --project beijing`.
- **`FOURSQUARE_KEY` must be set for ALL three Vercel envs** (Production, Development, Preview) — not just one. Preview deploys 401 on search until the key is there.
- **Search results dedupe by lowercased+trimmed name.** Chains like "Shake Shack" appearing at multiple physical locations collapse to the closest. "Shake Shack" vs "Shake Shack Innovation Kitchen" are intentionally distinct.
- **Nominatim rate-limit is unenforceable on Vercel serverless** (no shared state across cold starts). We rely on client-side debounce + descriptive `User-Agent`.
- **The `result-list__photo` and `meal-slot__thumb` letter placeholders use `data-initial` + `::before { content: attr(data-initial) }`** instead of rendering the letter as a text node. This is intentional: the existing `MealSlot.test.tsx` calls `getByText('A')` to find a place named "A", and a text-node letter placeholder would create a second match and break the test. The CSS-only rendering keeps the letter visible without polluting the accessible text content.

## Developing

```sh
npm install
npm run dev      # client only — /api/* will 404
vercel dev       # client + functions; pulls env vars from the linked Vercel project
npm test         # 62 tests across 10 files
npm run build    # tsc -b && vite build
npm run lint     # 3 pre-existing errors in Toast.tsx + AppStateProvider.tsx (Fast Refresh on context exports) are accepted; don't introduce new ones
```

For `vercel dev` to work, `FOURSQUARE_KEY` must be present on the `development` env (already set as of latest deploy).

## Deploying

The Vercel project is `stephenastraeas-projects/beijing`. NOT auto-deployed from GitHub — must use the CLI:

```sh
vercel deploy --yes          # preview (separate URL, low-risk for QA)
vercel deploy --prod --yes   # publishes to https://beijing-tau.vercel.app
```

After deploy, you can pull runtime logs via the Vercel MCP tool (`get_runtime_logs`) for debugging — but logs can take 1-2 min to ingest. For faster debugging, instrument the function to echo the diagnostic into its response body behind a `?debug=1` flag and call it directly via the `web_fetch_vercel_url` MCP tool (which can authenticate to protected previews).

To enable auto-deploy on git push, connect the GitHub repo in https://vercel.com/stephenastraeas-projects/beijing/settings/git.

## Git workflow

- GitHub repo: `stephenastraea/Starter-Project` (origin) — **this is where PRs go**
- Conductor upstream: `meltylabs/Quickstart` — DON'T open PRs against this; it's the starter template
- Watch out: `gh pr create` without `--repo` defaults to the upstream parent (`meltylabs/Starter-Project`) when forks are involved. **Always pass `--repo stephenastraea/Starter-Project`** explicitly when opening PRs from this workspace.
- Conductor creates a per-workspace branch — don't push to `main` directly; open PRs via `gh pr create --repo stephenastraea/Starter-Project --base main`
- Recent PRs:
  - PR #2 — original meal planner (merged)
  - PR #3 — Warm Editorial visual redesign (merged 2026-05-23)

## Conventions in this codebase

- **TDD where it has value:** pure logic (reducer, codec, mappers, URL builders) and component interactions (SearchBar debounce, PanelShell responsive, MealSlot reorder). UI rendering / styles aren't unit-tested.
- **One file = one responsibility.** Don't co-locate unrelated utilities.
- **Each MealSlot of state in the reducer is independent** — moving a place between slots dispatches `ADD_TO_ITINERARY` (which deletes from the old slot first); removing from a slot does NOT remove from saved (independence is tested).
- **Don't store transient state** (search results, map center) to localStorage. Only `saved` and `itinerary`.
- **All styling reads from tokens.** Hard-coded hex / px in `App.css` is debt, not a pattern to follow.
- **RestaurantCard takes children-like `actions` prop** so ResultList and SavedList can supply different action sets while reusing the card chrome. Don't add list-specific logic inside RestaurantCard.
- **No comments unless they explain WHY** (a non-obvious constraint, a bug workaround). Don't narrate code.
