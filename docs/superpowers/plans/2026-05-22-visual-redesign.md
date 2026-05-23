# Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the meal-planner app's visuals from generic-default to a coherent Warm Editorial design (terracotta + olive on cream, Fraunces + Inter, CartoDB Positron map tiles, Foursquare photos in cards) without changing app behavior.

**Architecture:** Pure additive change. A new tokens layer (`src/styles/tokens.css`) drives all component styles in `App.css`. The `MapView` swaps its tile layer and pin icons; the `Place` type gets an optional `photoUrl`; a new `usePhoto` hook lazy-loads photos via IntersectionObserver. One new serverless function (`api/photos.ts`) proxies Foursquare's photos endpoint. No reducer changes; all 62 existing tests continue to pass.

**Tech Stack:** React 19 + Vite + TypeScript, react-leaflet, Vercel serverless functions, Foursquare Places API (2025-06-17), Google Fonts (Fraunces + Inter), Vitest + React Testing Library.

**Source spec:** `docs/superpowers/specs/2026-05-22-visual-redesign-design.md` — read it once before starting.

**Working agreements:**

- Commit at the end of every task. Each task must leave the app shippable.
- Do not change the externally-observable behavior of any component (button labels, aria attributes, test-ids, click handlers). The redesign is visual. Tests assert on labels/test-ids — if a test would break, you've changed too much.
- TDD is required for any task that adds logic (photo fetching, the `usePhoto` hook, the `api/photos.ts` function, `Place` type changes). Pure CSS tasks don't have meaningful unit tests — verify by running `npm run dev` and looking at the page.
- After every task, run `npm test` (must stay green) and `npm run build` (must succeed).

---

## Phase 1 — Tokens Layer

Foundation that everything else inherits from. After this phase the app looks slightly different (new fonts, new background) but nothing else has been restyled yet.

---

### Task 1: Add Google Fonts and update document head

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the document head with the new font links and proper title**

Current `index.html` has the placeholder Conductor title and no fonts. Replace the entire `<head>` so the file reads:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#faf6ee" />
    <meta name="description" content="Plan vacation meals on a map. Save spots, organize by Breakfast / Lunch / Dinner / Snacks, share a link." />
    <meta property="og:title" content="Meal Planner" />
    <meta property="og:description" content="Plan vacation meals on a map." />
    <meta property="og:type" content="website" />
    <title>Meal Planner</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,400;1,9..144,600;1,9..144,700&family=Inter:wght@400;500;600&display=swap"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The font URL loads only what we use: Fraunces 600 regular + italic 400/600/700 (with the variable optical-size axis), Inter 400/500/600. `display=swap` ensures the page renders immediately with the fallback serif/sans while Fraunces/Inter download.

- [ ] **Step 2: Verify dev server runs**

Run: `npm run dev`
Open `http://localhost:5173`. The page should render (no visual change yet — fonts aren't in any CSS rules). DevTools Network tab should show two requests to `fonts.googleapis.com` and one or more to `fonts.gstatic.com`.

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: All 62 tests pass. Run: `npm run build`. Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add Google Fonts (Fraunces + Inter) and proper page metadata"
```

---

### Task 2: Create the design-tokens stylesheet

**Files:**
- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the directory and file**

Run: `mkdir -p src/styles`

- [ ] **Step 2: Write the tokens file**

Create `src/styles/tokens.css` with the complete contents:

```css
/* Design tokens — Warm Editorial direction.
 * Imported once from src/index.css. All component styles read from these
 * custom properties. Do not hard-code colors / fonts / spacing in App.css. */

:root {
  /* Color */
  --color-bone: #faf6ee;
  --color-linen: #f4ecdf;
  --color-cream: #fffaf0;
  --color-sand: #e6d6b8;
  --color-terracotta: #c2410c;
  --color-olive: #4a5d23;
  --color-espresso: #2a1f17;
  --color-stone: #8a7563;

  /* Surfaces */
  --surface-app: var(--color-bone);
  --surface-panel: var(--color-linen);
  --surface-card: var(--color-cream);
  --surface-border: var(--color-sand);

  /* Text */
  --text-default: var(--color-espresso);
  --text-muted: var(--color-stone);
  --text-accent: var(--color-terracotta);
  --text-category: var(--color-olive);
  --text-inverted: var(--color-cream);

  /* Typography */
  --font-serif: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  /* Spacing — 4px grid */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;

  /* Shadows */
  --shadow-panel: 0 12px 32px rgba(42, 31, 23, 0.12);
  --shadow-popup: 0 8px 24px rgba(42, 31, 23, 0.12);
  --shadow-modal: 0 16px 48px rgba(42, 31, 23, 0.18);

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 120ms;
  --dur-base: 200ms;
}
```

- [ ] **Step 3: Import tokens from `src/index.css`**

Replace the entire contents of `src/index.css` with:

```css
@import './styles/tokens.css';

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  height: 100%;
  min-height: 100svh;
}

body {
  background: var(--surface-app);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Global focus ring — used by every interactive element unless overridden. */
:focus-visible {
  outline: 2px solid var(--color-terracotta);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This replaces the existing tiny `src/index.css` (the rules currently in `src/App.css` for `* { box-sizing }`, `html, body, #root` are about to be removed in Phase 2 — for now they're duplicated, that's fine).

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 62 pass. Run: `npm run build`. Expected: clean build.

- [ ] **Step 5: Visual smoke check**

Run: `npm run dev`
Open `http://localhost:5173`. The page background should now be cream (`#faf6ee`) instead of white. Body text uses Inter. Everything else still looks the same (App.css is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/index.css
git commit -m "Add design tokens and wire them into global styles"
```

---

## Phase 2 — Panel Shell

The sidebar/bottom-sheet container gets the new editorial surface, header strip, and tab styling. Tab labels stay accessible by the same names so `PanelShell.test.tsx` keeps passing.

---

### Task 3: Restyle the panel shell surface

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Replace the `.panel-shell*` rules**

Find the block starting `.panel-shell {` in `src/App.css` (around line 131) and replace through the end of `.panel-shell__body { ... }` with:

```css
.panel-shell {
  position: absolute;
  background: var(--surface-panel);
  z-index: 500;
  box-shadow: var(--shadow-panel);
  display: flex;
  flex-direction: column;
  color: var(--text-default);
  font-family: var(--font-sans);
}

.panel-shell--desktop {
  top: var(--space-4);
  left: var(--space-4);
  width: 380px;
  max-height: calc(100vh - 32px);
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border);
  overflow: hidden;
}

.panel-shell--mobile {
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-top: 1px solid var(--surface-border);
}

.panel-shell--mobile::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--surface-border);
  margin: 8px auto 0;
}

.panel-shell__body {
  padding: var(--space-4) var(--space-5, 20px);
  overflow-y: auto;
  flex: 1;
}
```

(The mobile grab handle is the `::before` pseudo-element — pure CSS, no markup change.)

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All 62 pass. The `panel-shell--desktop` / `panel-shell--mobile` className assertions still match.

- [ ] **Step 3: Visual check**

Run: `npm run dev`. The sidebar should now be Linen, 380px wide, with a soft shadow and Sand border. On mobile (resize to under 768px), the grab handle should appear at the top.

- [ ] **Step 4: Commit**

```bash
git add src/App.css
git commit -m "Restyle panel shell with Linen surface and mobile grab handle"
```

---

### Task 4: Add the header strip and move Share into it

**Files:**
- Modify: `src/components/PanelShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `PanelShell` to accept and render share controls**

Replace the contents of `src/components/PanelShell.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { PanelTab, Place } from '../types';
import { SearchTab } from './SearchTab';
import { SavedTab } from './SavedTab';
import { ItineraryTab } from './ItineraryTab';
import { AddToItineraryPopover } from './AddToItineraryPopover';

const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);
  return isMobile;
}

export function PanelShell({ onShareClick }: { onShareClick: () => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [pendingForItinerary, setPendingForItinerary] = useState<Place | null>(null);

  const itineraryCount = Object.values(state.itinerary).reduce((acc, arr) => acc + arr.length, 0);

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: 'search', label: 'Search' },
    { id: 'saved', label: 'Saved', count: state.saved.length },
    { id: 'itinerary', label: 'Itinerary', count: itineraryCount },
  ];

  return (
    <div
      data-testid="panel-shell"
      className={`panel-shell ${isMobile ? 'panel-shell--mobile' : 'panel-shell--desktop'}`}
    >
      <div className="panel-shell__header">
        <h1 className="panel-shell__trip-name">Your trip</h1>
        <button
          type="button"
          className="panel-shell__share"
          aria-label="Share itinerary"
          onClick={onShareClick}
        >
          Share
        </button>
      </div>
      <div className="panel-shell__tabs" role="tablist">
        {tabs.map((t) => {
          const accName = t.count !== undefined ? `${t.label} (${t.count})` : t.label;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={state.panelTab === t.id}
              aria-label={accName}
              className={`panel-shell__tab ${state.panelTab === t.id ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_PANEL_TAB', tab: t.id })}
            >
              <span className="panel-shell__tab-label">{t.label}</span>
              {t.count !== undefined && (
                <span className="panel-shell__tab-count"> · {t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="panel-shell__body">
        {state.panelTab === 'search' && (
          <SearchTab onAddToItinerary={setPendingForItinerary} />
        )}
        {state.panelTab === 'saved' && (
          <SavedTab onAddToItinerary={setPendingForItinerary} />
        )}
        {state.panelTab === 'itinerary' && <ItineraryTab />}
      </div>
      {pendingForItinerary && (
        <AddToItineraryPopover
          place={pendingForItinerary}
          onClose={() => setPendingForItinerary(null)}
        />
      )}
    </div>
  );
}
```

Notes:
- The `aria-label={accName}` on each tab preserves the test matcher `getByRole('tab', { name: /saved/i })` — RTL accessible-name resolution will match.
- `onShareClick` is a required prop. The Share button is now part of the shell header.

- [ ] **Step 2: Update `App.tsx` to pass `onShareClick` and remove the floating button**

Replace the `AppInner` function in `src/App.tsx` with:

```tsx
function AppInner() {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="app">
      <HydrateFromShareMount />
      <PersistenceMount />
      <GeolocateOnMount />
      <MapView />
      <PanelShell onShareClick={() => setShareOpen(true)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
```

The standalone `<button className="share-button">` is removed.

- [ ] **Step 3: Add header strip and tab styles to `src/App.css`**

Find the block starting `.panel-shell__tabs {` (around line 153) and replace through `.panel-shell__tab.is-active { ... }` with:

```css
.panel-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5, 20px) var(--space-3);
  border-bottom: 1px solid var(--surface-border);
}

.panel-shell__trip-name {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 18px;
  font-variation-settings: 'opsz' 96;
  margin: 0;
  letter-spacing: -0.005em;
}

.panel-shell__share {
  background: transparent;
  border: 1px solid var(--surface-border);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.panel-shell__share:hover {
  background: var(--surface-card);
}

.panel-shell__tabs {
  display: flex;
  gap: var(--space-6);
  padding: 0 var(--space-5, 20px);
  border-bottom: 1px solid var(--surface-border);
}

.panel-shell__tab {
  background: none;
  border: none;
  padding: var(--space-3) 0;
  margin: 0;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px;
  transition: color var(--dur-fast) var(--ease-out);
}

.panel-shell__tab.is-active {
  color: var(--text-default);
  border-bottom-color: var(--color-terracotta);
}

.panel-shell__tab-count {
  color: var(--text-muted);
  font-weight: 400;
}

.panel-shell__tab.is-active .panel-shell__tab-count {
  color: var(--text-muted);
}
```

Also delete the now-unused `.share-button` block (around line 261) entirely.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 62 pass. The `PanelShell` tests now look up tabs by `name: /search/i` etc., which still match via the new `aria-label`.

- [ ] **Step 5: Visual check**

Run: `npm run dev`. The panel should now have an editorial header strip with "Your trip" in Fraunces italic and a Share button. Tabs underneath are uppercase, with a terracotta underline on the active one. The floating blue Share button is gone.

- [ ] **Step 6: Commit**

```bash
git add src/components/PanelShell.tsx src/App.tsx src/App.css
git commit -m "Add panel header strip with trip name and integrated Share button"
```

---

## Phase 3 — Cards (Search, Saved, Itinerary) — no photos yet

Restyle the three list views with the new card shape but without photos. After this phase the app is fully restyled and shippable; photos come in Phase 5.

---

### Task 5: Restyle SearchBar and LocationBar

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Replace the location-bar, banner, and search-bar rules**

Find `.location-bar form {` (around line 61) through the end of `.search-bar { ... }` (around line 94) and replace with:

```css
.location-bar {
  margin-bottom: var(--space-3);
}

.location-bar form {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.location-bar input {
  flex: 1;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text-default);
  min-width: 0;
}

.location-bar input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.location-bar button {
  background: transparent;
  border: 1px solid var(--surface-border);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out);
}

.location-bar button:hover:not(:disabled) {
  background: var(--surface-card);
}

.location-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.location-bar__error {
  color: var(--color-terracotta);
  font-size: 12px;
  margin-bottom: var(--space-2);
}

.banner {
  background: rgba(194, 65, 12, 0.1);
  border: 1px solid rgba(194, 65, 12, 0.25);
  color: var(--text-default);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 12px;
  margin-bottom: var(--space-3);
}

.search-bar {
  width: 100%;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text-default);
  margin-bottom: var(--space-4);
}

.search-bar::placeholder {
  color: var(--text-muted);
  opacity: 1;
}
```

- [ ] **Step 2: Run tests + visual check**

Run: `npm test` (all 62 pass) then `npm run dev`. The location bar and search bar should now sit on cream surfaces with sand borders, all caps "GO" / "USE MY LOCATION" buttons.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "Restyle SearchBar and LocationBar with editorial inputs and ghost buttons"
```

---

### Task 6: Restyle ResultList cards (no photo yet)

**Files:**
- Modify: `src/App.css`
- Modify: `src/components/ResultList.tsx`

- [ ] **Step 1: Replace the `.result-list*` rules in `src/App.css`**

Find `.result-list {` (around line 96) through the end of `.result-list__actions button { ... }` (around line 129) and replace with:

```css
.result-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-list--empty {
  padding: var(--space-4) 0;
  color: var(--text-muted);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 16px;
  text-align: center;
}

.result-list__item {
  display: flex;
  gap: var(--space-3);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  overflow: hidden;
}

.result-list__photo {
  flex-shrink: 0;
  width: 88px;
  background: linear-gradient(135deg, var(--surface-border) 0%, #d4c5a8 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 22px;
}

.result-list__body {
  flex: 1;
  min-width: 0;
  padding: var(--space-3) var(--space-3) var(--space-3) 0;
}

.result-list__name {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.005em;
  margin: 0 0 2px;
}

.result-list__meta {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-category);
  margin: 0 0 var(--space-2);
}

.result-list__distance {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}

.result-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.result-list__actions button {
  background: transparent;
  border: 1px solid var(--text-default);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 5px 9px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.result-list__actions button:hover {
  background: var(--surface-panel);
}

.result-list__actions button.is-primary {
  background: var(--color-terracotta);
  border-color: var(--color-terracotta);
  color: var(--text-inverted);
}

.result-list__actions button.is-primary:hover {
  background: #a8370a;
}

.result-list__actions button.is-text {
  border: none;
  padding: 5px 0;
  color: var(--color-terracotta);
  border-bottom: 1px solid var(--color-terracotta);
  border-radius: 0;
}

.result-list__actions button.is-text:hover {
  background: transparent;
  color: #a8370a;
  border-bottom-color: #a8370a;
}
```

- [ ] **Step 2: Restructure `ResultList.tsx` to use the new card layout**

Replace the contents of `src/components/ResultList.tsx` with:

```tsx
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) {
    return <div className="result-list result-list--empty">Looking nearby…</div>;
  }
  if (state.searchError) {
    return <div className="result-list result-list--empty">{state.searchError}</div>;
  }
  if (state.results.length === 0 && state.query) {
    return (
      <div className="result-list result-list--empty">
        No spots matched. Try a wider term, or pan the map.
      </div>
    );
  }
  if (state.results.length === 0) {
    return <div className="result-list result-list--empty">Where are you eating?</div>;
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <ul className="result-list">
      {state.results.map((p) => {
        const isSaved = state.saved.some((s) => s.fsq_id === p.fsq_id);
        return (
          <li key={p.fsq_id} className="result-list__item">
            <div className="result-list__photo" aria-hidden="true">
              {p.name.charAt(0)}
            </div>
            <div className="result-list__body">
              <h3 className="result-list__name">{p.name}</h3>
              <p className="result-list__meta">{p.categories[0] ?? 'Restaurant'}</p>
              <div className="result-list__actions">
                <button
                  className="is-primary"
                  onClick={() => dispatch({ type: 'SAVE_PLACE', place: p })}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

Notes:
- The rating/tips display is dropped — per the spec, the new Foursquare API doesn't return them and the existing app already shows `undefined` for most results.
- `.result-list__photo` uses the first letter as a placeholder. In Phase 5 it'll become a real background-image when a photo URL is available.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All 62 pass. (No existing tests assert on rating-text inside ResultList.)

- [ ] **Step 4: Visual check**

Run: `npm run dev`, perform a search. Cards should be horizontal with a Linen-gradient placeholder on the left (showing first letter), name in Fraunces, category in olive uppercase, three buttons (Save / + Itinerary / Maps).

- [ ] **Step 5: Commit**

```bash
git add src/App.css src/components/ResultList.tsx
git commit -m "Restyle search result cards in horizontal editorial layout"
```

---

### Task 7: Restyle SavedList with section heading

**Files:**
- Modify: `src/components/SavedList.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `SavedList.tsx`**

Replace the contents of `src/components/SavedList.tsx` with:

```tsx
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function SavedList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.saved.length === 0) {
    return (
      <>
        <header className="section-header">
          <h2 className="section-header__title"><em>Saved spots</em></h2>
        </header>
        <div className="result-list result-list--empty">
          Search and tap Save to start your list.
        </div>
      </>
    );
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <>
      <header className="section-header">
        <h2 className="section-header__title"><em>Saved spots</em></h2>
        <span className="section-header__count">
          {state.saved.length} {state.saved.length === 1 ? 'place' : 'places'}
        </span>
      </header>
      <ul className="result-list">
        {state.saved.map((p) => (
          <li key={p.fsq_id} className="result-list__item">
            <div className="result-list__photo" aria-hidden="true">
              {p.name.charAt(0)}
            </div>
            <div className="result-list__body">
              <h3 className="result-list__name">{p.name}</h3>
              <p className="result-list__meta">{p.categories[0] ?? 'Restaurant'}</p>
              <div className="result-list__actions">
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button onClick={() => dispatch({ type: 'REMOVE_SAVED', placeId: p.fsq_id })}>
                  Remove
                </button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 2: Add `.section-header` styles to `src/App.css`**

Append to the end of `src/App.css`:

```css
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.section-header__title {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 22px;
  font-variation-settings: 'opsz' 96;
  margin: 0;
  color: var(--text-default);
  letter-spacing: -0.01em;
}

.section-header__count {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Run tests + visual check**

Run: `npm test` (all 62 pass). Run: `npm run dev`. Switch to the Saved tab — it should show "Saved spots" as an italic Fraunces heading with a count.

- [ ] **Step 4: Commit**

```bash
git add src/components/SavedList.tsx src/App.css
git commit -m "Add editorial section header to Saved tab and restyle saved cards"
```

---

### Task 8: Restyle MealSlot cards with numbered badges

**Files:**
- Modify: `src/components/MealSlot.tsx`
- Modify: `src/App.css`

The existing tests assert:
- `getByText('A')` finds the name (currently uses `.meal-slot__name`)
- `getAllByTestId('meal-slot-name')` for ordering checks
- `getByRole('button', { name: /^remove$/i })`
- `getAllByLabelText('Move down')`
- `getByRole('button', { name: /move to/i })`
- `getByRole('button', { name: /^dinner$/i })` inside the Move-to popover

All of these are preserved in the new markup.

- [ ] **Step 1: Update `MealSlot.tsx`**

Replace the contents of `src/components/MealSlot.tsx` with:

```tsx
import { useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { MEAL_SLOTS, type MealSlot as MealSlotName, type Place } from '../types';
import { useToast } from './Toast';

const LABELS: Record<MealSlotName, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function MealSlot({ slot, label }: { slot: MealSlotName; label: string }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const [moveTarget, setMoveTarget] = useState<Place | null>(null);

  const items = state.itinerary[slot];

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  const countLabel =
    items.length === 0
      ? 'empty'
      : `${items.length} ${items.length === 1 ? 'spot' : 'spots'}`;

  return (
    <div className="meal-slot">
      <div className="meal-slot__head">
        <h3 className="meal-slot__heading"><em>{label}</em></h3>
        <span className="meal-slot__count">{countLabel}</span>
      </div>
      {items.length === 0 && (
        <div className="meal-slot__empty">Add a saved spot here, or use + Itinerary from Search.</div>
      )}
      <ul className="meal-slot__list">
        {items.map((p, index) => (
          <li key={p.fsq_id} className="meal-slot__item">
            <span className="meal-slot__num" aria-hidden="true">{index + 1}</span>
            <div className="meal-slot__thumb" aria-hidden="true">{p.name.charAt(0)}</div>
            <div className="meal-slot__info">
              <div data-testid="meal-slot-name" className="meal-slot__name">
                {p.name}
              </div>
              <div className="meal-slot__meta">{p.categories[0] ?? 'Restaurant'}</div>
            </div>
            <div className="meal-slot__actions">
              <button
                aria-label="Move up"
                disabled={index === 0}
                onClick={() =>
                  dispatch({
                    type: 'MOVE_IN_ITINERARY',
                    placeId: p.fsq_id,
                    slot,
                    direction: 'up',
                  })
                }
              >
                ↑
              </button>
              <button
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() =>
                  dispatch({
                    type: 'MOVE_IN_ITINERARY',
                    placeId: p.fsq_id,
                    slot,
                    direction: 'down',
                  })
                }
              >
                ↓
              </button>
              <button onClick={() => openGoogle(p)}>Maps</button>
              <button onClick={() => setMoveTarget(p)}>Move to…</button>
              <button
                onClick={() =>
                  dispatch({ type: 'REMOVE_FROM_ITINERARY', placeId: p.fsq_id, slot })
                }
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {moveTarget && (
        <div
          className="add-itinerary-overlay"
          role="dialog"
          aria-label={`Move ${moveTarget.name} to another slot`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoveTarget(null);
          }}
        >
          <div className="add-itinerary-popover">
            <div className="add-itinerary-popover__title">
              Move "<em>{moveTarget.name}</em>" to:
            </div>
            <div className="add-itinerary-popover__slots">
              {MEAL_SLOTS.filter((s) => s !== slot).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    dispatch({ type: 'ADD_TO_ITINERARY', place: moveTarget, slot: s });
                    setMoveTarget(null);
                  }}
                >
                  {LABELS[s]}
                </button>
              ))}
            </div>
            <button
              className="add-itinerary-popover__cancel"
              onClick={() => setMoveTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the `.meal-slot*` rules in `src/App.css`**

Find `.meal-slot {` (around line 209) through `.meal-slot__actions button { ... }` (around line 251) and replace with:

```css
.meal-slot {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
}

.meal-slot__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.meal-slot__heading {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 16px;
  margin: 0;
  color: var(--text-default);
  letter-spacing: -0.005em;
}

.meal-slot__count {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.meal-slot__empty {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 12px;
  color: var(--text-muted);
  padding: var(--space-2) 0;
}

.meal-slot__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.meal-slot__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid rgba(230, 214, 184, 0.5);
}

.meal-slot__item:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.meal-slot__num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-olive);
  color: var(--text-inverted);
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meal-slot__thumb {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--surface-border) 0%, #d4c5a8 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 16px;
}

.meal-slot__info {
  flex: 1;
  min-width: 0;
}

.meal-slot__name {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 13px;
  margin: 0;
  letter-spacing: -0.005em;
}

.meal-slot__meta {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-category);
  margin-top: 1px;
}

.meal-slot__actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.meal-slot__actions button {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 11px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.meal-slot__actions button:hover:not(:disabled) {
  background: var(--surface-panel);
  color: var(--text-default);
}

.meal-slot__actions button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All 62 pass. The `MealSlot` tests use button names (`Remove`, `Move down`, `Move to…`, `Dinner`) and `data-testid="meal-slot-name"` — all preserved.

- [ ] **Step 4: Visual check**

Run: `npm run dev`. Add a few places to itinerary slots. Each item should have an olive numbered badge, a Linen letter thumbnail, the name + category, and arrow/maps/move/remove actions on the right.

- [ ] **Step 5: Commit**

```bash
git add src/components/MealSlot.tsx src/App.css
git commit -m "Restyle MealSlot with olive numbered badges and editorial cards"
```

---

## Phase 4 — Map tiles, pins, popups

The biggest visible change. Swap to CartoDB Positron, replace the SVG pin icons with terracotta/olive divIcons, restyle the popup.

---

### Task 9: Swap to CartoDB Positron tile layer

**Files:**
- Modify: `src/components/MapView.tsx`

- [ ] **Step 1: Replace the `<TileLayer>` element**

In `src/components/MapView.tsx`, replace the existing `<TileLayer>` block with:

```tsx
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  subdomains="abcd"
  maxZoom={20}
/>
```

- [ ] **Step 2: Run tests + visual check**

Run: `npm test` (all 62 pass). Run: `npm run dev`. The map should now render as a clean light-grey basemap from CartoDB. Pins still look like the old red/blue SVGs (we'll fix those next).

- [ ] **Step 3: Commit**

```bash
git add src/components/MapView.tsx
git commit -m "Swap OSM default tiles for CartoDB Positron light basemap"
```

---

### Task 10: Custom CSS-based pin icons

**Files:**
- Modify: `src/components/map-icons.ts`
- Modify: `src/App.css`

The pin file currently exports `RED_PIN` and `BLUE_PIN` built as SVG strings. Replace with CSS-based divIcons so the pin styling can use design tokens.

- [ ] **Step 1: Replace `src/components/map-icons.ts`**

Replace the entire file with:

```ts
import L from 'leaflet';

type PinVariant = 'search' | 'saved' | 'user';

function makePin(variant: PinVariant, label?: string): L.DivIcon {
  const labelHtml = label
    ? `<span class="map-pin__label">${label}</span>`
    : '';
  return L.divIcon({
    className: `map-pin map-pin--${variant}`,
    html: `<span class="map-pin__teardrop">${labelHtml}</span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

export const SEARCH_PIN = makePin('search');
export const SAVED_PIN = makePin('saved');
export const USER_PIN = makePin('user');

export function numberedPin(n: number): L.DivIcon {
  return makePin('search', String(n));
}

// Kept for backwards compatibility with imports during migration; remove
// after MapView is updated.
export const RED_PIN = SEARCH_PIN;
export const BLUE_PIN = USER_PIN;
```

- [ ] **Step 2: Add `.map-pin*` styles to the end of `src/App.css`**

Append:

```css
/* Map pins — Leaflet renders these as divIcons; the wrapper has the
 * .map-pin and .map-pin--<variant> classes from map-icons.ts. */
.map-pin {
  background: transparent !important;
  border: none !important;
}

.map-pin__teardrop {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 3px solid var(--color-cream);
  box-shadow: 0 4px 12px rgba(42, 31, 23, 0.3);
  position: relative;
}

.map-pin--search .map-pin__teardrop {
  background: var(--color-terracotta);
}

.map-pin--saved .map-pin__teardrop {
  background: var(--color-olive);
}

.map-pin--user .map-pin__teardrop {
  background: var(--color-olive);
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-radius: 50%;
  transform: none;
  box-shadow: 0 0 0 6px rgba(74, 93, 35, 0.2);
  margin: 10px 0 0 7px;
}

.map-pin__label {
  position: absolute;
  inset: 0;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-cream);
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 12px;
}

.map-pin:hover .map-pin__teardrop {
  transform: rotate(-45deg) scale(1.08);
}

.map-pin--user:hover .map-pin__teardrop {
  transform: scale(1.1);
}
```

- [ ] **Step 3: Update `MapView.tsx` to use the new pin variants**

In `src/components/MapView.tsx`, replace the import line:

```tsx
import { BLUE_PIN, RED_PIN } from './map-icons';
```

with:

```tsx
import { numberedPin, SAVED_PIN, SEARCH_PIN, USER_PIN } from './map-icons';
```

Then update the two `<Marker>` blocks. Replace:

```tsx
{state.center && (
  <Marker position={[state.center.lat, state.center.lng]} icon={BLUE_PIN} />
)}

{state.results.map((place) => (
  <Marker key={place.fsq_id} position={[place.lat, place.lng]} icon={RED_PIN}>
    <Popup>
      <PlacePopup place={place} />
    </Popup>
  </Marker>
))}
```

with:

```tsx
{state.center && (
  <Marker position={[state.center.lat, state.center.lng]} icon={USER_PIN} />
)}

{state.results.map((place) => {
  const itineraryIndex = findItineraryNumber(state.itinerary, place.fsq_id);
  const isSaved = state.saved.some((s) => s.fsq_id === place.fsq_id);
  let icon = SEARCH_PIN;
  if (itineraryIndex !== null) icon = numberedPin(itineraryIndex);
  else if (isSaved) icon = SAVED_PIN;
  return (
    <Marker key={place.fsq_id} position={[place.lat, place.lng]} icon={icon}>
      <Popup>
        <PlacePopup place={place} />
      </Popup>
    </Marker>
  );
})}
```

And add this helper above the `MapView` function (just below the imports):

```tsx
function findItineraryNumber(
  itinerary: import('../types').Itinerary,
  fsqId: string,
): number | null {
  for (const slot of Object.keys(itinerary) as Array<keyof typeof itinerary>) {
    const idx = itinerary[slot].findIndex((p) => p.fsq_id === fsqId);
    if (idx >= 0) return idx + 1;
  }
  return null;
}
```

- [ ] **Step 4: Run tests + visual check**

Run: `npm test` (all 62 pass). Run: `npm run dev`. Pins should now be terracotta teardrops with a cream stroke. Saved spots (after you save one) should appear as olive teardrops. Adding to itinerary turns the pin into a numbered terracotta teardrop.

- [ ] **Step 5: Commit**

```bash
git add src/components/map-icons.ts src/components/MapView.tsx src/App.css
git commit -m "Replace SVG pins with CSS divIcons (terracotta / olive / numbered)"
```

---

### Task 11: Restyle the Leaflet popup

**Files:**
- Modify: `src/components/MapView.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `PlacePopup` in `MapView.tsx`**

Replace the `PlacePopup` function with:

```tsx
function PlacePopup({ place }: { place: Place }) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const showToast = useToast();
  const isSaved = state.saved.some((p) => p.fsq_id === place.fsq_id);

  const openGoogle = () => {
    const win = window.open(place.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${place.googleUrl}`);
  };

  return (
    <div className="pin-popup">
      <h3 className="pin-popup__name">{place.name}</h3>
      <p className="pin-popup__meta">{place.categories[0] ?? 'Restaurant'}</p>
      <div className="pin-popup__actions">
        <button
          className="is-primary"
          onClick={() => dispatch({ type: 'SAVE_PLACE', place })}
        >
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button className="is-text" onClick={openGoogle}>Maps</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `.pin-popup*` and add Leaflet wrapper rules in `src/App.css`**

Find the `.pin-popup {` block (around line 22) and replace through the end of `.pin-popup__actions button { ... }` (around line 46) with:

```css
/* Leaflet popup wrapper — restyle the default white bubble. */
.leaflet-popup-content-wrapper {
  background: var(--surface-card);
  color: var(--text-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popup);
  padding: 0;
}

.leaflet-popup-content {
  margin: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
}

.leaflet-popup-tip {
  background: var(--surface-card);
  box-shadow: var(--shadow-popup);
}

.leaflet-popup-close-button {
  color: var(--text-muted) !important;
  padding: var(--space-2) !important;
}

.pin-popup {
  min-width: 200px;
}

.pin-popup__name {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 16px;
  margin: 0 0 2px;
  color: var(--text-default);
  letter-spacing: -0.005em;
}

.pin-popup__meta {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-category);
  margin: 0 0 var(--space-3);
}

.pin-popup__actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.pin-popup__actions button {
  background: transparent;
  border: 1px solid var(--text-default);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.pin-popup__actions button.is-primary {
  background: var(--color-terracotta);
  border-color: var(--color-terracotta);
  color: var(--text-inverted);
}

.pin-popup__actions button.is-text {
  border: none;
  padding: 5px 0;
  color: var(--color-terracotta);
  border-bottom: 1px solid var(--color-terracotta);
  border-radius: 0;
}
```

- [ ] **Step 3: Run tests + visual check**

Run: `npm test` (all 62 pass). Run: `npm run dev`. Click a pin: the popup should now be Cream with an italic Fraunces name, olive category, and the Save / Maps actions.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.tsx src/App.css
git commit -m "Restyle Leaflet popup with editorial typography and palette"
```

---

### Task 12: Restyle Leaflet zoom & attribution controls

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Append control-styling rules**

Append to the end of `src/App.css`:

```css
/* Leaflet zoom control */
.leaflet-control-zoom {
  border: none !important;
  box-shadow: var(--shadow-popup);
  border-radius: var(--radius-md) !important;
  overflow: hidden;
}

.leaflet-control-zoom a {
  background: var(--surface-card) !important;
  color: var(--text-default) !important;
  border: 1px solid var(--surface-border) !important;
  font-family: var(--font-sans) !important;
  font-weight: 500 !important;
}

.leaflet-control-zoom a:first-child {
  border-bottom: none !important;
  border-radius: var(--radius-md) var(--radius-md) 0 0 !important;
}

.leaflet-control-zoom a:last-child {
  border-radius: 0 0 var(--radius-md) var(--radius-md) !important;
}

.leaflet-control-zoom a:hover {
  background: var(--surface-panel) !important;
}

/* Leaflet attribution */
.leaflet-control-attribution {
  background: rgba(255, 250, 240, 0.85) !important;
  color: var(--text-muted) !important;
  font-family: var(--font-sans) !important;
  font-size: 10px !important;
  border-radius: var(--radius-sm) 0 0 0 !important;
  padding: 2px 8px !important;
}

.leaflet-control-attribution a {
  color: var(--color-terracotta) !important;
}
```

- [ ] **Step 2: Run tests + visual check**

Run: `npm test` (all 62 pass). Run: `npm run dev`. Zoom controls and attribution should now match the editorial palette.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "Restyle Leaflet zoom and attribution controls"
```

---

## Phase 5 — Foursquare Photo Integration

Most logic-heavy phase. Tests required for the type change, backend, client function, and hook. Cards consume the hook only at the end.

---

### Task 13: Add `photoUrl` to the Place type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add optional `photoUrl` field**

In `src/types.ts`, update the `Place` type:

```ts
export type Place = {
  fsq_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  rating?: number;
  tipsCount?: number;
  googleUrl: string;
  photoUrl?: string;
};
```

- [ ] **Step 2: Run tests + build**

Run: `npm test` (all 62 pass — the field is optional and unused). Run: `npm run build`. Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "Add optional photoUrl to Place type"
```

---

### Task 14: Add `api/photos.ts` serverless function with tests

**Files:**
- Create: `api/photos.ts`
- Create: `api/photos.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `api/photos.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from './photos';

function mockReq(query: Record<string, string>) {
  return {
    method: 'GET',
    query,
  } as unknown as Parameters<typeof handler>[0];
}

function mockRes() {
  const res: {
    status: (code: number) => typeof res;
    json: (body: unknown) => typeof res;
    statusCode?: number;
    body?: unknown;
  } = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Parameters<typeof handler>[1] & typeof res;
}

describe('api/photos', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.FOURSQUARE_KEY;

  beforeEach(() => {
    process.env.FOURSQUARE_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.FOURSQUARE_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('rejects requests without an fsq_id', async () => {
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects non-GET methods', async () => {
    const res = mockRes();
    const req = { method: 'POST', query: { fsq_id: 'abc' } } as unknown as Parameters<typeof handler>[0];
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('returns the first photo URL joined at 300x300', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { prefix: 'https://fastly.4sqi.net/img/general/', suffix: '/x_y.jpg' },
        { prefix: 'https://fastly.4sqi.net/img/general/', suffix: '/a_b.jpg' },
      ],
    } as unknown as Response);
    const res = mockRes();
    await handler(mockReq({ fsq_id: 'abc' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      photoUrl: 'https://fastly.4sqi.net/img/general/300x300/x_y.jpg',
    });
  });

  it('returns photoUrl: null when there are no photos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as unknown as Response);
    const res = mockRes();
    await handler(mockReq({ fsq_id: 'abc' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ photoUrl: null });
  });

  it('returns photoUrl: null on upstream errors instead of failing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    } as unknown as Response);
    const res = mockRes();
    await handler(mockReq({ fsq_id: 'abc' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ photoUrl: null });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- api/photos.test.ts`
Expected: FAIL (file `./photos` doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `api/photos.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FSQ_API_VERSION = '2025-06-17';
const PHOTO_SIZE = '300x300';

type FsqPhoto = { prefix?: string; suffix?: string };

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fsqId = firstString(req.query.fsq_id)?.trim();
  if (!fsqId) return res.status(400).json({ error: 'Missing fsq_id' });
  if (fsqId.length > 100) return res.status(400).json({ error: 'fsq_id too long' });

  const key = process.env.FOURSQUARE_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server not configured: FOURSQUARE_KEY missing' });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://places-api.foursquare.com/places/${encodeURIComponent(fsqId)}/photos?limit=1`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          'X-Places-Api-Version': FSQ_API_VERSION,
        },
      },
    );
  } catch {
    return res.status(200).json({ photoUrl: null });
  }

  if (!upstream.ok) {
    return res.status(200).json({ photoUrl: null });
  }

  let data: FsqPhoto[] = [];
  try {
    const body = (await upstream.json()) as FsqPhoto[] | { photos?: FsqPhoto[] };
    if (Array.isArray(body)) data = body;
    else if (body && Array.isArray((body as { photos?: FsqPhoto[] }).photos)) {
      data = (body as { photos?: FsqPhoto[] }).photos ?? [];
    }
  } catch {
    return res.status(200).json({ photoUrl: null });
  }

  const first = data[0];
  if (!first || !first.prefix || !first.suffix) {
    return res.status(200).json({ photoUrl: null });
  }

  const photoUrl = `${first.prefix}${PHOTO_SIZE}${first.suffix}`;
  return res.status(200).json({ photoUrl });
}
```

Note the `.js` extension is not needed here because no relative imports are used. The existing `api/places.ts` uses `.js` imports for `./_lib/foursquare.js` — that's the gotcha called out in `CLAUDE.md`. This file has no relative imports so the rule doesn't apply.

- [ ] **Step 4: Run the tests**

Run: `npm test -- api/photos.test.ts`
Expected: PASS — all 5 test cases.

Then run the full suite: `npm test`
Expected: 67 tests pass (62 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add api/photos.ts api/photos.test.ts
git commit -m "Add api/photos serverless function for Foursquare photo lookup"
```

---

### Task 15: Add `fetchPhoto` to the api client

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: Write a quick smoke test inline (in the same file or a new one)**

Create `src/lib/api-client.test.ts` (the project doesn't have one yet):

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPhoto } from './api-client';

describe('fetchPhoto', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calls /api/photos with the fsq_id and returns the photoUrl', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ photoUrl: 'https://example.com/photo.jpg' }),
    } as unknown as Response);
    global.fetch = mock;

    const result = await fetchPhoto('abc123');

    expect(mock).toHaveBeenCalledWith(
      '/api/photos?fsq_id=abc123',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(result).toBe('https://example.com/photo.jpg');
  });

  it('returns null when the response says photoUrl is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ photoUrl: null }),
    } as unknown as Response);
    expect(await fetchPhoto('abc')).toBeNull();
  });

  it('returns null on network error rather than throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await fetchPhoto('abc')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api-client.test.ts`
Expected: FAIL — `fetchPhoto` is not exported.

- [ ] **Step 3: Add `fetchPhoto` to `src/lib/api-client.ts`**

Append to `src/lib/api-client.ts`:

```ts
export async function fetchPhoto(fsqId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/photos?fsq_id=${encodeURIComponent(fsqId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { photoUrl?: string | null };
    return body.photoUrl ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 70 tests pass (67 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts
git commit -m "Add fetchPhoto client wrapper around /api/photos"
```

---

### Task 16: Build the `usePhoto` hook with IntersectionObserver + in-memory cache

**Files:**
- Create: `src/components/usePhoto.ts`
- Create: `src/components/usePhoto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/usePhoto.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { __resetPhotoCacheForTests, usePhoto } from './usePhoto';
import * as apiClient from '../lib/api-client';

class FakeIntersectionObserver {
  static lastInstance: FakeIntersectionObserver | null = null;
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    FakeIntersectionObserver.lastInstance = this;
  }
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting, target: document.createElement('div') } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function renderUsePhoto(fsqId: string | undefined, initialPhotoUrl?: string) {
  return renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(null);
    // Attach a real element so the observer has something to track.
    if (!ref.current) ref.current = document.createElement('div');
    const photoUrl = usePhoto(fsqId, { initialPhotoUrl, ref });
    return { photoUrl, ref };
  });
}

describe('usePhoto', () => {
  beforeEach(() => {
    __resetPhotoCacheForTests();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns the initial photoUrl immediately and does not fetch', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto');
    const { result } = renderUsePhoto('abc', 'https://existing.example/p.jpg');
    expect(result.current.photoUrl).toBe('https://existing.example/p.jpg');
    expect(spy).not.toHaveBeenCalled();
  });

  it('fetches once when the element intersects and returns the URL', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto').mockResolvedValue('https://fresh.example/p.jpg');
    const { result } = renderUsePhoto('abc');
    expect(result.current.photoUrl).toBeNull();

    FakeIntersectionObserver.lastInstance?.trigger(true);

    await waitFor(() => {
      expect(result.current.photoUrl).toBe('https://fresh.example/p.jpg');
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('abc');
  });

  it('returns the cached URL without refetching on a second hook for the same id', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto').mockResolvedValue('https://cached.example/p.jpg');
    const first = renderUsePhoto('abc');
    FakeIntersectionObserver.lastInstance?.trigger(true);
    await waitFor(() => expect(first.result.current.photoUrl).toBe('https://cached.example/p.jpg'));

    const second = renderUsePhoto('abc');
    expect(second.result.current.photoUrl).toBe('https://cached.example/p.jpg');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when fsqId is undefined', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto');
    const { result } = renderUsePhoto(undefined);
    FakeIntersectionObserver.lastInstance?.trigger(true);
    expect(result.current.photoUrl).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/usePhoto.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/usePhoto.ts`:

```ts
import { useEffect, useRef, useState, type RefObject } from 'react';
import { fetchPhoto } from '../lib/api-client';

const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

export function __resetPhotoCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

type Options = {
  initialPhotoUrl?: string;
  ref?: RefObject<HTMLElement | null>;
};

export function usePhoto(
  fsqId: string | undefined,
  options: Options = {},
): string | null {
  const { initialPhotoUrl, ref } = options;
  const internalRef = useRef<HTMLElement | null>(null);
  const targetRef = ref ?? internalRef;
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (initialPhotoUrl) return initialPhotoUrl;
    if (fsqId && cache.has(fsqId)) return cache.get(fsqId) ?? null;
    return null;
  });

  useEffect(() => {
    if (!fsqId) return;
    if (initialPhotoUrl) return;
    if (cache.has(fsqId)) {
      setPhotoUrl(cache.get(fsqId) ?? null);
      return;
    }

    const target = targetRef.current;
    if (typeof IntersectionObserver === 'undefined' || !target) {
      // Fallback: fetch immediately if we can't observe.
      void load(fsqId).then((url) => setPhotoUrl(url));
      return;
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        observer.disconnect();
        void load(fsqId).then((url) => {
          if (!cancelled) setPhotoUrl(url);
        });
      },
      { rootMargin: '200px' },
    );
    observer.observe(target);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fsqId, initialPhotoUrl, targetRef]);

  return photoUrl;
}

async function load(fsqId: string): Promise<string | null> {
  if (cache.has(fsqId)) return cache.get(fsqId) ?? null;
  const existing = inFlight.get(fsqId);
  if (existing) return existing;
  const promise = fetchPhoto(fsqId).then((url) => {
    cache.set(fsqId, url);
    inFlight.delete(fsqId);
    return url;
  });
  inFlight.set(fsqId, promise);
  return promise;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 74 tests pass (70 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/usePhoto.ts src/components/usePhoto.test.ts
git commit -m "Add usePhoto hook with IntersectionObserver and in-memory cache"
```

---

### Task 17: Wire photos into ResultList and SavedList cards

**Files:**
- Modify: `src/components/ResultList.tsx`
- Modify: `src/components/SavedList.tsx`
- Create: `src/components/RestaurantCard.tsx`

The two lists share the same card shape; extract it to avoid duplication.

- [ ] **Step 1: Create the shared `RestaurantCard` component**

Create `src/components/RestaurantCard.tsx`:

```tsx
import { useRef, type ReactNode } from 'react';
import type { Place } from '../types';
import { usePhoto } from './usePhoto';

export function RestaurantCard({
  place,
  actions,
}: {
  place: Place;
  actions: ReactNode;
}) {
  const photoRef = useRef<HTMLDivElement | null>(null);
  const photoUrl = usePhoto(place.fsq_id, {
    initialPhotoUrl: place.photoUrl,
    ref: photoRef,
  });

  return (
    <li className="result-list__item">
      <div
        ref={photoRef}
        className="result-list__photo"
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
        aria-hidden="true"
      >
        {photoUrl ? '' : place.name.charAt(0)}
      </div>
      <div className="result-list__body">
        <h3 className="result-list__name">{place.name}</h3>
        <p className="result-list__meta">{place.categories[0] ?? 'Restaurant'}</p>
        <div className="result-list__actions">{actions}</div>
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Update `ResultList.tsx` to use `RestaurantCard`**

Replace the contents of `src/components/ResultList.tsx` with:

```tsx
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';
import { RestaurantCard } from './RestaurantCard';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) {
    return <div className="result-list result-list--empty">Looking nearby…</div>;
  }
  if (state.searchError) {
    return <div className="result-list result-list--empty">{state.searchError}</div>;
  }
  if (state.results.length === 0 && state.query) {
    return (
      <div className="result-list result-list--empty">
        No spots matched. Try a wider term, or pan the map.
      </div>
    );
  }
  if (state.results.length === 0) {
    return <div className="result-list result-list--empty">Where are you eating?</div>;
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <ul className="result-list">
      {state.results.map((p) => {
        const isSaved = state.saved.some((s) => s.fsq_id === p.fsq_id);
        return (
          <RestaurantCard
            key={p.fsq_id}
            place={p}
            actions={
              <>
                <button
                  className="is-primary"
                  onClick={() => dispatch({ type: 'SAVE_PLACE', place: p })}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </>
            }
          />
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Update `SavedList.tsx` to use `RestaurantCard`**

Replace the contents of `src/components/SavedList.tsx` with:

```tsx
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';
import { RestaurantCard } from './RestaurantCard';

export function SavedList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.saved.length === 0) {
    return (
      <>
        <header className="section-header">
          <h2 className="section-header__title"><em>Saved spots</em></h2>
        </header>
        <div className="result-list result-list--empty">
          Search and tap Save to start your list.
        </div>
      </>
    );
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <>
      <header className="section-header">
        <h2 className="section-header__title"><em>Saved spots</em></h2>
        <span className="section-header__count">
          {state.saved.length} {state.saved.length === 1 ? 'place' : 'places'}
        </span>
      </header>
      <ul className="result-list">
        {state.saved.map((p) => (
          <RestaurantCard
            key={p.fsq_id}
            place={p}
            actions={
              <>
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button onClick={() => dispatch({ type: 'REMOVE_SAVED', placeId: p.fsq_id })}>
                  Remove
                </button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </>
            }
          />
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 4: Run tests + visual check**

Run: `npm test` (all 74 pass). Run: `vercel dev` (need the API route working — `npm run dev` alone won't proxy `/api/photos`). Perform a search and watch the cards. As you scroll, photos should fade in.

- [ ] **Step 5: Commit**

```bash
git add src/components/RestaurantCard.tsx src/components/ResultList.tsx src/components/SavedList.tsx
git commit -m "Wire lazy-loaded Foursquare photos into Search and Saved cards"
```

---

### Task 18: Persist photoUrl on save and add-to-itinerary

**Files:**
- Modify: `src/state/reducer.ts`
- Modify: `src/components/RestaurantCard.tsx`

When a card has loaded a photo and the user saves the place, the saved record should keep that URL so it survives a reload. The cleanest way: have the card mutate-into-state by dispatching a `SET_PLACE_PHOTO` action when the photo loads.

- [ ] **Step 1: Inspect the reducer**

Run: `cat src/state/reducer.ts | head -80`
Look at the existing action types. You'll add a new action that updates `photoUrl` for a place in `results`, `saved`, and `itinerary` (search results AND any saved/itinerary copies of the same fsq_id).

- [ ] **Step 2: Add the new action type and handler to `src/state/reducer.ts`**

Add to the action union (find the existing `type Action =` declaration):

```ts
| { type: 'SET_PLACE_PHOTO'; placeId: string; photoUrl: string }
```

Add the handler inside the reducer's switch:

```ts
case 'SET_PLACE_PHOTO': {
  const apply = (p: Place): Place =>
    p.fsq_id === action.placeId && !p.photoUrl ? { ...p, photoUrl: action.photoUrl } : p;
  return {
    ...state,
    results: state.results.map(apply),
    saved: state.saved.map(apply),
    itinerary: {
      breakfast: state.itinerary.breakfast.map(apply),
      lunch: state.itinerary.lunch.map(apply),
      dinner: state.itinerary.dinner.map(apply),
      snacks: state.itinerary.snacks.map(apply),
    },
  };
}
```

(If `Place` isn't imported into `reducer.ts`, add it: `import type { Place, Itinerary } from '../types';`.)

- [ ] **Step 3: Dispatch the action from `RestaurantCard` when a photo loads**

Update `src/components/RestaurantCard.tsx` to dispatch the new action:

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import type { Place } from '../types';
import { usePhoto } from './usePhoto';
import { useAppDispatch } from '../state/AppStateProvider';

export function RestaurantCard({
  place,
  actions,
}: {
  place: Place;
  actions: ReactNode;
}) {
  const photoRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const photoUrl = usePhoto(place.fsq_id, {
    initialPhotoUrl: place.photoUrl,
    ref: photoRef,
  });

  useEffect(() => {
    if (photoUrl && !place.photoUrl) {
      dispatch({ type: 'SET_PLACE_PHOTO', placeId: place.fsq_id, photoUrl });
    }
  }, [photoUrl, place.photoUrl, place.fsq_id, dispatch]);

  return (
    <li className="result-list__item">
      <div
        ref={photoRef}
        className="result-list__photo"
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
        aria-hidden="true"
      >
        {photoUrl ? '' : place.name.charAt(0)}
      </div>
      <div className="result-list__body">
        <h3 className="result-list__name">{place.name}</h3>
        <p className="result-list__meta">{place.categories[0] ?? 'Restaurant'}</p>
        <div className="result-list__actions">{actions}</div>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Add a focused reducer test for the new action**

Find `src/state/reducer.test.ts` (the project should have one — if not, this task creates one). Append:

```ts
import { describe, it, expect } from 'vitest';
import { reducer } from './reducer';
import { INITIAL_STATE, type Place } from '../types';

const placeNoPhoto: Place = {
  fsq_id: 'x',
  name: 'X',
  address: '',
  lat: 0,
  lng: 0,
  categories: [],
  googleUrl: '',
};

describe('SET_PLACE_PHOTO', () => {
  it('sets photoUrl on matching results / saved / itinerary entries that have no photo yet', () => {
    const state = {
      ...INITIAL_STATE,
      results: [placeNoPhoto],
      saved: [placeNoPhoto],
      itinerary: { ...INITIAL_STATE.itinerary, lunch: [placeNoPhoto] },
    };
    const next = reducer(state, {
      type: 'SET_PLACE_PHOTO',
      placeId: 'x',
      photoUrl: 'https://e.com/p.jpg',
    });
    expect(next.results[0].photoUrl).toBe('https://e.com/p.jpg');
    expect(next.saved[0].photoUrl).toBe('https://e.com/p.jpg');
    expect(next.itinerary.lunch[0].photoUrl).toBe('https://e.com/p.jpg');
  });

  it('does not overwrite an existing photoUrl', () => {
    const withPhoto: Place = { ...placeNoPhoto, photoUrl: 'https://old.com/p.jpg' };
    const state = { ...INITIAL_STATE, results: [withPhoto] };
    const next = reducer(state, {
      type: 'SET_PLACE_PHOTO',
      placeId: 'x',
      photoUrl: 'https://new.com/p.jpg',
    });
    expect(next.results[0].photoUrl).toBe('https://old.com/p.jpg');
  });
});
```

If `src/state/reducer.test.ts` doesn't exist, create it with the imports needed and just these tests.

- [ ] **Step 5: Run tests + build**

Run: `npm test` (all 76 pass — 74 + 2 new). Run: `npm run build` (clean build).

- [ ] **Step 6: Commit**

```bash
git add src/state/reducer.ts src/state/reducer.test.ts src/components/RestaurantCard.tsx
git commit -m "Persist loaded photoUrl through reducer so save/itinerary keep it"
```

---

### Task 19: Wire photos into the map popup and MealSlot thumbnails

**Files:**
- Modify: `src/components/MapView.tsx`
- Modify: `src/App.css`
- Modify: `src/components/MealSlot.tsx`

The popup gets the same photo treatment as cards (small strip above actions). MealSlot thumbnails (36×36) use the URL too.

- [ ] **Step 1: Update `PlacePopup` to render a photo when available**

In `src/components/MapView.tsx`, replace the `PlacePopup` function with:

```tsx
function PlacePopup({ place }: { place: Place }) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const showToast = useToast();
  const isSaved = state.saved.some((p) => p.fsq_id === place.fsq_id);
  // The popup re-mounts on each click — read the freshest photoUrl from
  // search results / saved / itinerary if any branch has it.
  const photoUrl =
    place.photoUrl ??
    state.results.find((r) => r.fsq_id === place.fsq_id)?.photoUrl ??
    state.saved.find((r) => r.fsq_id === place.fsq_id)?.photoUrl ??
    null;

  const openGoogle = () => {
    const win = window.open(place.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${place.googleUrl}`);
  };

  return (
    <div className="pin-popup">
      {photoUrl && (
        <div
          className="pin-popup__photo"
          style={{ backgroundImage: `url(${photoUrl})` }}
          aria-hidden="true"
        />
      )}
      <h3 className="pin-popup__name">{place.name}</h3>
      <p className="pin-popup__meta">{place.categories[0] ?? 'Restaurant'}</p>
      <div className="pin-popup__actions">
        <button
          className="is-primary"
          onClick={() => dispatch({ type: 'SAVE_PLACE', place })}
        >
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button className="is-text" onClick={openGoogle}>Maps</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `.pin-popup__photo` to `src/App.css`**

Find the `.pin-popup {` block and add (just below `min-width: 200px;`):

```css
.pin-popup__photo {
  width: 100%;
  height: 80px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  background-size: cover;
  background-position: center;
  background-color: var(--surface-border);
}
```

- [ ] **Step 3: Update `MealSlot.tsx` to use the place's `photoUrl` on the thumbnail**

In `src/components/MealSlot.tsx`, find the thumbnail line:

```tsx
<div className="meal-slot__thumb" aria-hidden="true">{p.name.charAt(0)}</div>
```

Replace with:

```tsx
<div
  className="meal-slot__thumb"
  style={p.photoUrl ? { backgroundImage: `url(${p.photoUrl})` } : undefined}
  aria-hidden="true"
>
  {p.photoUrl ? '' : p.name.charAt(0)}
</div>
```

(MealSlot intentionally doesn't trigger fetches — itinerary items inherit `photoUrl` from when they were saved/added. This avoids re-fetching during an itinerary-only browsing session.)

- [ ] **Step 4: Run tests + visual check**

Run: `npm test` (all 76 pass). Run: `vercel dev`. Click pins — popups show a small photo strip. Switch to Itinerary — items with photos show real thumbnails.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapView.tsx src/components/MealSlot.tsx src/App.css
git commit -m "Show photos in map popups and itinerary thumbnails"
```

---

## Phase 6 — Dialogs, toasts, search-center marker

Restyle the remaining surfaces. Mostly CSS.

---

### Task 20: Restyle Share dialog and Add-to-itinerary popover

**Files:**
- Modify: `src/App.css`
- Modify: `src/components/ShareDialog.tsx`
- Modify: `src/components/AddToItineraryPopover.tsx`

- [ ] **Step 1: Replace `.add-itinerary-*` rules in `src/App.css`**

Find `.add-itinerary-overlay {` (around line 174) through `.add-itinerary-popover__cancel { ... }` (around line 207) and replace with:

```css
.add-itinerary-overlay {
  position: fixed;
  inset: 0;
  background: rgba(42, 31, 23, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.add-itinerary-popover {
  background: var(--surface-card);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  width: min(360px, 100%);
  box-shadow: var(--shadow-modal);
  border: 1px solid var(--surface-border);
}

.add-itinerary-popover__title {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 18px;
  margin-bottom: var(--space-4);
  color: var(--text-default);
}

.add-itinerary-popover__slots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.add-itinerary-popover__slots button {
  background: transparent;
  border: 1px solid var(--text-default);
  color: var(--text-default);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.add-itinerary-popover__slots button:hover {
  background: var(--surface-panel);
}

.add-itinerary-popover__cancel {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: var(--space-2);
  cursor: pointer;
}

.add-itinerary-popover__cancel:hover {
  color: var(--text-default);
}

.share-dialog__url {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--surface-panel);
  color: var(--text-default);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  resize: none;
}
```

- [ ] **Step 2: Update `ShareDialog.tsx` title and Copy button**

In `src/components/ShareDialog.tsx`, change the title element and the Copy button labels for an editorial feel. Replace:

```tsx
<div className="add-itinerary-popover__title">Share your plan</div>
```

with:

```tsx
<div className="add-itinerary-popover__title"><em>Share your trip</em></div>
```

And replace the buttons block:

```tsx
<div className="add-itinerary-popover__slots">
  <button onClick={copy}>Copy</button>
  <button onClick={onClose}>Close</button>
</div>
```

with:

```tsx
<div className="add-itinerary-popover__slots">
  <button onClick={copy} className="is-primary">Copy link</button>
  <button onClick={onClose}>Close</button>
</div>
```

- [ ] **Step 3: Add `.add-itinerary-popover__slots button.is-primary` style**

Append to `src/App.css`:

```css
.add-itinerary-popover__slots button.is-primary {
  background: var(--color-terracotta);
  border-color: var(--color-terracotta);
  color: var(--text-inverted);
}

.add-itinerary-popover__slots button.is-primary:hover {
  background: #a8370a;
}
```

- [ ] **Step 4: Update `AddToItineraryPopover.tsx` title**

In `src/components/AddToItineraryPopover.tsx`, change:

```tsx
<div className="add-itinerary-popover__title">Add "{place.name}" to:</div>
```

to:

```tsx
<div className="add-itinerary-popover__title">
  Add "<em>{place.name}</em>" to…
</div>
```

- [ ] **Step 5: Run tests + visual check**

Run: `npm test` (all 76 pass). Run: `npm run dev`. Open the Share dialog and the Add-to-itinerary popover; both should sit on a Cream surface with the editorial typography.

- [ ] **Step 6: Commit**

```bash
git add src/App.css src/components/ShareDialog.tsx src/components/AddToItineraryPopover.tsx
git commit -m "Restyle Share dialog and Add-to-itinerary popover in editorial palette"
```

---

### Task 21: Restyle Toast and reposition on mobile

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Replace the `.toast` rule**

Find the `.toast {` block (around line 48) and replace with:

```css
.toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-espresso);
  color: var(--text-inverted);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  z-index: 2000;
  max-width: 80%;
  font-family: var(--font-sans);
  font-size: 13px;
  animation: toast-in var(--dur-base) var(--ease-out);
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 768px) {
  .toast {
    bottom: auto;
    top: var(--space-4);
  }
}
```

- [ ] **Step 2: Run tests + visual check**

Run: `npm test` (all 76 pass). Run: `npm run dev`. Trigger a toast (e.g. search before setting location). It should appear with the new dark editorial style. Resize to mobile — toast moves to the top.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "Restyle Toast and reposition to top on mobile so it clears the bottom sheet"
```

---

### Task 22: Replace the search-center / user-location marker styling

Already handled in Task 10 — both share the `.map-pin--user` style. If during QA you want to differentiate (e.g., add a small crosshair to the search-center marker), do it here. Otherwise skip this task and move on.

- [ ] **Step 1: Verify the user / search-center pin in the browser**

Run: `npm run dev`. Click on the map: the center marker should be the small olive ring (per Task 10). If it isn't, return to Task 10.

- [ ] **Step 2: No commit needed** (verification only). If you decided to add a crosshair, commit with `git commit -m "Differentiate search-center marker with crosshair"`.

---

### Task 23: Loading shimmer for search

**Files:**
- Modify: `src/App.css`
- Modify: `src/components/ResultList.tsx`

Replace the "Looking nearby…" text with a shimmering placeholder card so loading feels less abrupt.

- [ ] **Step 1: Add the shimmer styles to `src/App.css`**

Append:

```css
.result-list__shimmer {
  display: flex;
  gap: var(--space-3);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  overflow: hidden;
  height: 88px;
}

.result-list__shimmer-photo {
  width: 88px;
  background: linear-gradient(
    90deg,
    var(--surface-border) 0%,
    #efe0c4 50%,
    var(--surface-border) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.result-list__shimmer-body {
  flex: 1;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.result-list__shimmer-line {
  height: 12px;
  background: linear-gradient(
    90deg,
    var(--surface-border) 0%,
    #efe0c4 50%,
    var(--surface-border) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--radius-sm);
}

.result-list__shimmer-line--short { width: 40%; }
.result-list__shimmer-line--medium { width: 70%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **Step 2: Render shimmer rows from `ResultList` during search**

In `src/components/ResultList.tsx`, replace the `if (state.searching)` block with:

```tsx
if (state.searching) {
  return (
    <ul className="result-list" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="result-list__shimmer">
          <div className="result-list__shimmer-photo" />
          <div className="result-list__shimmer-body">
            <div className="result-list__shimmer-line result-list__shimmer-line--medium" />
            <div className="result-list__shimmer-line result-list__shimmer-line--short" />
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Run tests + visual check**

Run: `npm test` (all 76 pass). Run: `vercel dev`. Run a search and watch the shimmer rows during the network round-trip.

- [ ] **Step 4: Commit**

```bash
git add src/App.css src/components/ResultList.tsx
git commit -m "Replace plain Searching text with shimmer placeholder cards"
```

---

## Phase 7 — Manual QA Pass

No code — just verification. This is the gate before merging.

---

### Task 24: Manual QA pass

- [ ] **Step 1: Run full test suite and build one more time**

Run: `npm test`. Expected: all 76 pass.
Run: `npm run build`. Expected: clean.
Run: `npm run lint`. Expected: clean.

- [ ] **Step 2: Local end-to-end smoke test**

Run: `vercel dev`. Open `http://localhost:3000` and exercise:

- Geolocation prompt → use my location → map flies to your area
- Type a query (e.g. "pizza") → shimmer rows → real results with photos appear
- Click a result's "Save" → pin on map turns olive
- Click "+ Itinerary" → popover opens → pick "Dinner" → pin turns into a numbered terracotta pin
- Switch to Saved tab → "Saved spots" header + cards with photos
- Switch to Itinerary tab → "Dinner" slot shows the numbered item with thumbnail
- Click Share in header → modal opens → "Copy link" → toast appears
- Resize browser to mobile width (≤ 768px) → bottom sheet with grab handle, toast moves to top
- Click a pin on the map → popup with photo, name, category, Save / Maps actions

- [ ] **Step 3: Deploy to a Vercel preview**

Run: `vercel deploy --yes`
Expected output: a preview URL like `https://beijing-<hash>.vercel.app`.

- [ ] **Step 4: Test on real mobile Safari**

Open the preview URL on an iPhone (or Safari iOS simulator). Verify:

- Fonts load (Fraunces is visible — not Georgia fallback)
- Photos load lazily as you scroll
- Map tiles look clean
- Pins are tap-targetable (the divIcon has enough hit area)
- The bottom sheet's grab handle is visible
- Share dialog opens; Copy link works

- [ ] **Step 5: Lighthouse check**

In Chrome DevTools → Lighthouse → run on the preview URL. Aim for:
- Performance ≥ 85
- Accessibility ≥ 95
- Best Practices ≥ 95

If Performance is far below 85, the most likely culprit is render-blocking Google Fonts — verify the `<link rel="preconnect">` and `display=swap` are present in `index.html`.

- [ ] **Step 6: Deploy to production**

If everything looks good:

```bash
vercel deploy --prod --yes
```

Verify at `https://beijing-tau.vercel.app`.

- [ ] **Step 7: Final commit (if any cleanup was needed)**

If QA surfaced small fixes, commit them with descriptive messages.

---

## Self-Review

After writing the plan, ran the spec coverage / placeholder / type-consistency check:

- **Spec coverage:** Every spec section maps to a phase — Tokens (Phase 1) · Map/pins (Phase 4) · Panel shell (Phase 2) · Cards (Phases 3+5) · Photo integration (Phase 5) · Dialogs and polish (Phase 6) · QA (Phase 7).
- **Placeholders:** None — every step has either code or a verification command. Task 22 (search-center marker) is deliberately a verification-only task since Task 10 already produces the desired marker.
- **Type consistency:** `Place.photoUrl` is added in Task 13 and consumed in Tasks 17/18/19. The `SET_PLACE_PHOTO` action defined in Task 18 has the same shape (`placeId`, `photoUrl`) where dispatched in `RestaurantCard`. `usePhoto` options match between Task 16 (definition) and Task 17 (consumer).
- **Test compatibility:** `MealSlot` tests rely on text "A", `data-testid="meal-slot-name"`, button names "Remove" / "Move down" / "Move to" / "Dinner" — all preserved in Task 8. `PanelShell` tests rely on `data-testid="panel-shell"`, the `--desktop` / `--mobile` classes, and tab accessible names `/search/i`, `/saved/i`, `/itinerary/i` — all preserved in Task 4 (the tabs now have explicit `aria-label` covering both label and count).
