# Meal Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "hello world" deployment with a single-page meal planner: an interactive map with Foursquare-backed restaurant search, a save list, a meal-slotted single-day itinerary, and a shareable URL — local-first, deployable for free on Vercel.

**Architecture:** React + Vite + TypeScript SPA backed by two Vercel serverless functions (`/api/places`, `/api/geocode`). State is held in a Context-backed reducer; persisted to `localStorage` and to a URL hash for sharing. Leaflet + OpenStreetMap tiles for the map; no map API key. Pins click through to Google Maps URLs (no Google API).

**Tech Stack:** React 19, Vite 8, TypeScript, Leaflet + React-Leaflet, Foursquare Places API (server-side), Nominatim/OSM (server-side), Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-22-meal-planner-design.md` — read this first.

**Conventions used throughout this plan:**

- Every code block is the complete content of the file being edited (or the complete content of the named function being added/modified). The engineer should not have to merge fragments.
- `npm test -- <pattern>` runs a focused test file. `npm test` runs the full suite.
- `npm run dev` starts the Vite dev server. `vercel dev` starts the dev server with `/api/*` functions wired up (the engineer will need this to manually smoke-test the API endpoints).
- Commit after every task. Commit messages are provided in the final step of each task.

---

## Phase 1: Foundation

### Task 1: Install dependencies and set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test-setup.ts`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install leaflet react-leaflet @vercel/node
```

Expected: packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Install dev/test dependencies**

Run:
```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/leaflet
```

Expected: packages added to `devDependencies`.

- [ ] **Step 3: Add test scripts to `package.json`**

Open `package.json` and replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

Create `vitest.config.ts` with this exact content:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: false,
  },
});
```

- [ ] **Step 5: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Add `vitest/globals` to TypeScript types**

Open `tsconfig.app.json`. Find the `"compilerOptions"` block and add `"types": ["vitest/globals"]`. If a `"types"` field already exists, append `"vitest/globals"` to its array.

- [ ] **Step 7: Verify the setup with a trivial test**

Create `src/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 8: Delete the sanity test**

Run: `rm src/sanity.test.ts`

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts tsconfig.app.json
git commit -m "Add Vitest, Leaflet, and React-Leaflet dependencies"
```

---

### Task 2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts` with shared type definitions**

```ts
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEAL_SLOTS: readonly MealSlot[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
] as const;

export type LatLng = {
  lat: number;
  lng: number;
};

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
};

export type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied';

export type PanelTab = 'search' | 'saved' | 'itinerary';

export type Itinerary = Record<MealSlot, Place[]>;

export const EMPTY_ITINERARY: Itinerary = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
};

export type AppState = {
  center: LatLng | null;
  geolocationStatus: GeolocationStatus;
  query: string;
  results: Place[];
  searching: boolean;
  searchError: string | null;
  saved: Place[];
  itinerary: Itinerary;
  panelTab: PanelTab;
};

export const INITIAL_STATE: AppState = {
  center: null,
  geolocationStatus: 'idle',
  query: '',
  results: [],
  searching: false,
  searchError: null,
  saved: [],
  itinerary: EMPTY_ITINERARY,
  panelTab: 'search',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "Define shared types for meal planner state"
```

---

### Task 3: Google Maps URL builder (TDD)

**Files:**
- Create: `src/lib/google-url.ts`
- Create: `src/lib/google-url.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/google-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildGoogleMapsUrl } from './google-url';

describe('buildGoogleMapsUrl', () => {
  it('builds a search URL from name and address', () => {
    const url = buildGoogleMapsUrl('Joe\'s Pizza', '7 Carmine St, New York, NY');
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
  });

  it('URL-encodes spaces, commas, and apostrophes', () => {
    const url = buildGoogleMapsUrl("Joe's Pizza", '7 Carmine St, New York, NY');
    expect(url).toContain('Joe%27s%20Pizza');
    expect(url).toContain('%2C');
  });

  it('handles non-ASCII characters (e.g. accents)', () => {
    const url = buildGoogleMapsUrl('Café Münchner', 'Schönhauser Allee, Berlin');
    expect(url).toContain(encodeURIComponent('Café Münchner'));
    expect(url).toContain(encodeURIComponent('Schönhauser Allee, Berlin'));
  });

  it('joins name and address with a space', () => {
    const url = buildGoogleMapsUrl('A', 'B');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=A%20B');
  });

  it('returns a URL with no trailing whitespace when address is empty', () => {
    const url = buildGoogleMapsUrl('Solo Spot', '');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Solo%20Spot');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- google-url`
Expected: FAIL — "Cannot find module './google-url'".

- [ ] **Step 3: Implement `src/lib/google-url.ts`**

```ts
export function buildGoogleMapsUrl(name: string, address: string): string {
  const query = address.trim() ? `${name} ${address}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- google-url`
Expected: 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/google-url.ts src/lib/google-url.test.ts
git commit -m "Add Google Maps URL builder"
```

---

### Task 4: Share-link codec (TDD)

The codec serializes `{ saved, itinerary }` for the URL hash. It uses `CompressionStream`/`DecompressionStream` for gzip and base64url for transport. Decoding must be defensive: malformed input returns `null`, invalid schemas return `null`, and unknown meal slots are dropped (per spec).

**Files:**
- Create: `src/lib/share-codec.ts`
- Create: `src/lib/share-codec.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/share-codec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeShareState, decodeShareState } from './share-codec';
import { EMPTY_ITINERARY, type Place } from '../types';

const PLACE: Place = {
  fsq_id: 'fsq-1',
  name: 'Test Place',
  address: '1 Test St',
  lat: 40.0,
  lng: -74.0,
  categories: ['Pizza'],
  rating: 8.4,
  tipsCount: 27,
  googleUrl: 'https://www.google.com/maps/search/?api=1&query=Test%20Place%201%20Test%20St',
};

describe('share codec', () => {
  it('round-trips a non-trivial state', async () => {
    const state = {
      saved: [PLACE],
      itinerary: { ...EMPTY_ITINERARY, lunch: [PLACE] },
    };
    const encoded = await encodeShareState(state);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(state);
  });

  it('round-trips an empty state', async () => {
    const state = { saved: [], itinerary: EMPTY_ITINERARY };
    const encoded = await encodeShareState(state);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(state);
  });

  it('returns null for malformed input rather than throwing', async () => {
    expect(await decodeShareState('not-base64!!')).toBeNull();
    expect(await decodeShareState('')).toBeNull();
  });

  it('returns null when payload is valid base64 but invalid JSON', async () => {
    const encoded = btoa('this is not json').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    expect(await decodeShareState(encoded)).toBeNull();
  });

  it('returns null when payload is missing required fields', async () => {
    const bogus = await encodeShareState({ saved: [PLACE], itinerary: EMPTY_ITINERARY });
    // Mangle by re-encoding a payload without `itinerary`.
    const json = JSON.stringify({ saved: [PLACE] });
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    expect(await decodeShareState(b64)).toBeNull();
    expect(bogus).not.toBe('');
  });

  it('drops unknown meal slots but keeps the rest of the payload', async () => {
    const json = JSON.stringify({
      saved: [PLACE],
      itinerary: { lunch: [PLACE], midnight: [PLACE] },
    });
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

    const decoded = await decodeShareState(b64);
    expect(decoded).not.toBeNull();
    expect(decoded!.saved).toEqual([PLACE]);
    expect(decoded!.itinerary.lunch).toEqual([PLACE]);
    expect(decoded!.itinerary).not.toHaveProperty('midnight');
    expect(decoded!.itinerary.breakfast).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- share-codec`
Expected: FAIL — "Cannot find module './share-codec'".

- [ ] **Step 3: Implement `src/lib/share-codec.ts`**

```ts
import {
  EMPTY_ITINERARY,
  MEAL_SLOTS,
  type Itinerary,
  type MealSlot,
  type Place,
} from '../types';

export type ShareState = {
  saved: Place[];
  itinerary: Itinerary;
};

const REQUIRED_PLACE_FIELDS: (keyof Place)[] = [
  'fsq_id',
  'name',
  'address',
  'lat',
  'lng',
  'categories',
  'googleUrl',
];

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(encoded: string): Uint8Array | null {
  try {
    const padded = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function gzipString(input: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(input)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzipToString(input: Uint8Array): Promise<string> {
  const stream = new Blob([input])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  for (const field of REQUIRED_PLACE_FIELDS) {
    if (!(field in obj)) return false;
  }
  if (typeof obj.fsq_id !== 'string') return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.address !== 'string') return false;
  if (typeof obj.lat !== 'number') return false;
  if (typeof obj.lng !== 'number') return false;
  if (!Array.isArray(obj.categories)) return false;
  if (typeof obj.googleUrl !== 'string') return false;
  return true;
}

function sanitizeItinerary(raw: unknown): Itinerary | null {
  if (!raw || typeof raw !== 'object') return null;
  const result: Itinerary = { ...EMPTY_ITINERARY };
  for (const slot of MEAL_SLOTS) {
    const arr = (raw as Record<string, unknown>)[slot];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) return null;
    if (!arr.every(isPlace)) return null;
    result[slot as MealSlot] = arr;
  }
  return result;
}

export async function encodeShareState(state: ShareState): Promise<string> {
  const json = JSON.stringify(state);
  const bytes = await gzipString(json);
  return toBase64Url(bytes);
}

export async function decodeShareState(encoded: string): Promise<ShareState | null> {
  if (!encoded) return null;
  const bytes = fromBase64Url(encoded);
  if (!bytes) return null;

  let json: string;
  try {
    json = await gunzipToString(bytes);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  if (!('saved' in obj) || !('itinerary' in obj)) return null;
  if (!Array.isArray(obj.saved) || !obj.saved.every(isPlace)) return null;

  const itinerary = sanitizeItinerary(obj.itinerary);
  if (!itinerary) return null;

  return { saved: obj.saved, itinerary };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- share-codec`
Expected: 6 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/share-codec.ts src/lib/share-codec.test.ts
git commit -m "Add gzip+base64url share-link codec"
```

---

### Task 5: State reducer (TDD)

The reducer is the single source of truth for app state. It owns search, save, and itinerary actions. Test the invariants that matter (per spec): dedupe by `fsq_id`, no duplication across slot moves, independence of saved-list and itinerary entries.

**Files:**
- Create: `src/state/reducer.ts`
- Create: `src/state/reducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/state/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reducer, type Action } from './reducer';
import { INITIAL_STATE, EMPTY_ITINERARY, type Place, type AppState } from '../types';

function placeFactory(id: string, name = `Place ${id}`): Place {
  return {
    fsq_id: id,
    name,
    address: '1 Test St',
    lat: 40,
    lng: -74,
    categories: ['Test'],
    googleUrl: `https://example.com/${id}`,
  };
}

function dispatch(state: AppState, action: Action): AppState {
  return reducer(state, action);
}

describe('reducer', () => {
  it('SET_CENTER updates center and clears results', () => {
    const state = { ...INITIAL_STATE, results: [placeFactory('1')] };
    const next = dispatch(state, { type: 'SET_CENTER', center: { lat: 1, lng: 2 } });
    expect(next.center).toEqual({ lat: 1, lng: 2 });
    expect(next.results).toEqual([]);
  });

  it('SEARCH_START sets searching and clears prior error', () => {
    const state = { ...INITIAL_STATE, searchError: 'old' };
    const next = dispatch(state, { type: 'SEARCH_START' });
    expect(next.searching).toBe(true);
    expect(next.searchError).toBeNull();
  });

  it('SEARCH_SUCCESS replaces results and unsets searching', () => {
    const results = [placeFactory('1'), placeFactory('2')];
    const next = dispatch({ ...INITIAL_STATE, searching: true }, { type: 'SEARCH_SUCCESS', results });
    expect(next.results).toEqual(results);
    expect(next.searching).toBe(false);
  });

  it('SAVE_PLACE adds a place; second SAVE_PLACE removes it (toggle)', () => {
    const p = placeFactory('1');
    const added = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    expect(added.saved).toEqual([p]);
    const removed = dispatch(added, { type: 'SAVE_PLACE', place: p });
    expect(removed.saved).toEqual([]);
  });

  it('SAVE_PLACE dedupes by fsq_id', () => {
    const p1 = placeFactory('1');
    const p1Renamed = { ...p1, name: 'Updated' };
    const state = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p1 });
    const next = dispatch(state, { type: 'SAVE_PLACE', place: p1Renamed });
    // Toggle: same fsq_id means it un-saves.
    expect(next.saved).toEqual([]);
  });

  it('ADD_TO_ITINERARY appends to a slot', () => {
    const p = placeFactory('1');
    const next = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    expect(next.itinerary.lunch).toEqual([p]);
    expect(next.itinerary.breakfast).toEqual([]);
  });

  it('ADD_TO_ITINERARY moves a place from one slot to another instead of duplicating', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'dinner' });
    expect(s2.itinerary.lunch).toEqual([]);
    expect(s2.itinerary.dinner).toEqual([p]);
  });

  it('REMOVE_FROM_ITINERARY removes a place from a slot but leaves saved alone', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    const s3 = dispatch(s2, { type: 'REMOVE_FROM_ITINERARY', placeId: 'fsq-x', slot: 'lunch' });
    // wrong id: nothing changes
    expect(s3.itinerary.lunch).toEqual([p]);
    const s4 = dispatch(s3, { type: 'REMOVE_FROM_ITINERARY', placeId: p.fsq_id, slot: 'lunch' });
    expect(s4.itinerary.lunch).toEqual([]);
    expect(s4.saved).toEqual([p]);
  });

  it('REMOVE_SAVED leaves itinerary intact', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'dinner' });
    const s3 = dispatch(s2, { type: 'REMOVE_SAVED', placeId: p.fsq_id });
    expect(s3.saved).toEqual([]);
    expect(s3.itinerary.dinner).toEqual([p]);
  });

  it('MOVE_IN_ITINERARY swaps adjacent items', () => {
    const a = placeFactory('1');
    const b = placeFactory('2');
    const c = placeFactory('3');
    let s = INITIAL_STATE;
    for (const p of [a, b, c]) {
      s = dispatch(s, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    }
    const moved = dispatch(s, { type: 'MOVE_IN_ITINERARY', placeId: b.fsq_id, slot: 'lunch', direction: 'up' });
    expect(moved.itinerary.lunch.map((x) => x.fsq_id)).toEqual(['2', '1', '3']);
  });

  it('MOVE_IN_ITINERARY is a no-op at the boundary', () => {
    const a = placeFactory('1');
    const b = placeFactory('2');
    const s1 = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: a, slot: 'lunch' });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: b, slot: 'lunch' });
    const s3 = dispatch(s2, { type: 'MOVE_IN_ITINERARY', placeId: a.fsq_id, slot: 'lunch', direction: 'up' });
    expect(s3.itinerary.lunch.map((x) => x.fsq_id)).toEqual(['1', '2']);
  });

  it('HYDRATE replaces saved and itinerary only', () => {
    const p = placeFactory('1');
    const state = { ...INITIAL_STATE, query: 'pre-existing', results: [placeFactory('2')] };
    const next = dispatch(state, {
      type: 'HYDRATE',
      saved: [p],
      itinerary: { ...EMPTY_ITINERARY, dinner: [p] },
    });
    expect(next.saved).toEqual([p]);
    expect(next.itinerary.dinner).toEqual([p]);
    // Non-persistent fields untouched
    expect(next.query).toBe('pre-existing');
    expect(next.results).toEqual([placeFactory('2')]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reducer`
Expected: FAIL — "Cannot find module './reducer'".

- [ ] **Step 3: Implement `src/state/reducer.ts`**

```ts
import {
  EMPTY_ITINERARY,
  MEAL_SLOTS,
  type AppState,
  type Itinerary,
  type LatLng,
  type MealSlot,
  type Place,
  type PanelTab,
} from '../types';

export type Action =
  | { type: 'SET_CENTER'; center: LatLng }
  | { type: 'SET_GEO_STATUS'; status: AppState['geolocationStatus'] }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; results: Place[] }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'SAVE_PLACE'; place: Place }
  | { type: 'REMOVE_SAVED'; placeId: string }
  | { type: 'ADD_TO_ITINERARY'; place: Place; slot: MealSlot }
  | { type: 'REMOVE_FROM_ITINERARY'; placeId: string; slot: MealSlot }
  | { type: 'MOVE_IN_ITINERARY'; placeId: string; slot: MealSlot; direction: 'up' | 'down' }
  | { type: 'SET_PANEL_TAB'; tab: PanelTab }
  | { type: 'HYDRATE'; saved: Place[]; itinerary: Itinerary };

function removeFromAllSlots(itinerary: Itinerary, placeId: string): Itinerary {
  const next: Itinerary = { ...EMPTY_ITINERARY };
  for (const slot of MEAL_SLOTS) {
    next[slot] = itinerary[slot].filter((p) => p.fsq_id !== placeId);
  }
  return next;
}

function move<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= arr.length) return arr;
  const next = arr.slice();
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return next;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CENTER':
      return { ...state, center: action.center, results: [] };

    case 'SET_GEO_STATUS':
      return { ...state, geolocationStatus: action.status };

    case 'SET_QUERY':
      return { ...state, query: action.query };

    case 'SEARCH_START':
      return { ...state, searching: true, searchError: null };

    case 'SEARCH_SUCCESS':
      return { ...state, searching: false, results: action.results, searchError: null };

    case 'SEARCH_ERROR':
      return { ...state, searching: false, searchError: action.error };

    case 'SAVE_PLACE': {
      const already = state.saved.some((p) => p.fsq_id === action.place.fsq_id);
      const saved = already
        ? state.saved.filter((p) => p.fsq_id !== action.place.fsq_id)
        : [...state.saved, action.place];
      return { ...state, saved };
    }

    case 'REMOVE_SAVED':
      return { ...state, saved: state.saved.filter((p) => p.fsq_id !== action.placeId) };

    case 'ADD_TO_ITINERARY': {
      const cleared = removeFromAllSlots(state.itinerary, action.place.fsq_id);
      return {
        ...state,
        itinerary: { ...cleared, [action.slot]: [...cleared[action.slot], action.place] },
      };
    }

    case 'REMOVE_FROM_ITINERARY':
      return {
        ...state,
        itinerary: {
          ...state.itinerary,
          [action.slot]: state.itinerary[action.slot].filter((p) => p.fsq_id !== action.placeId),
        },
      };

    case 'MOVE_IN_ITINERARY': {
      const slot = state.itinerary[action.slot];
      const idx = slot.findIndex((p) => p.fsq_id === action.placeId);
      if (idx === -1) return state;
      return {
        ...state,
        itinerary: { ...state.itinerary, [action.slot]: move(slot, idx, action.direction) },
      };
    }

    case 'SET_PANEL_TAB':
      return { ...state, panelTab: action.tab };

    case 'HYDRATE':
      return { ...state, saved: action.saved, itinerary: action.itinerary };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- reducer`
Expected: 12 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/reducer.ts src/state/reducer.test.ts
git commit -m "Add state reducer with save/itinerary/search actions"
```

---

### Task 6: AppState context and provider

**Files:**
- Create: `src/state/AppStateProvider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { INITIAL_STATE, type AppState } from '../types';
import { reducer, type Action } from './reducer';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

export function useAppDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useAppDispatch must be used inside AppStateProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/AppStateProvider.tsx
git commit -m "Add AppStateProvider with state/dispatch hooks"
```

---

### Task 7: localStorage persistence hook

This hook writes `saved` and `itinerary` (and nothing else) to localStorage under `meal-planner:v1` on every change, and reads on mount. It also handles the malformed-JSON case by ignoring it.

**Files:**
- Create: `src/state/usePersistence.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useRef } from 'react';
import { EMPTY_ITINERARY, MEAL_SLOTS, type Itinerary, type Place } from '../types';
import { useAppDispatch, useAppState } from './AppStateProvider';

const STORAGE_KEY = 'meal-planner:v1';

type Persisted = { saved: Place[]; itinerary: Itinerary };

function readFromStorage(): Persisted | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.saved)) return null;
    if (!obj.itinerary || typeof obj.itinerary !== 'object') return null;
    const itinerary: Itinerary = { ...EMPTY_ITINERARY };
    for (const slot of MEAL_SLOTS) {
      const arr = (obj.itinerary as Record<string, unknown>)[slot];
      if (Array.isArray(arr)) itinerary[slot] = arr as Place[];
    }
    return { saved: obj.saved as Place[], itinerary };
  } catch {
    return null;
  }
}

export function usePersistence(): void {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const hydratedRef = useRef(false);
  const writeFailedRef = useRef(false);

  // Hydrate once on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const persisted = readFromStorage();
    if (persisted) {
      dispatch({ type: 'HYDRATE', saved: persisted.saved, itinerary: persisted.itinerary });
    }
  }, [dispatch]);

  // Write on change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (writeFailedRef.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ saved: state.saved, itinerary: state.itinerary }),
      );
    } catch {
      writeFailedRef.current = true;
      console.warn('meal-planner: localStorage write failed; data will not persist.');
    }
  }, [state.saved, state.itinerary]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/usePersistence.ts
git commit -m "Persist saved+itinerary to localStorage on change"
```

---

## Phase 2: Server functions

### Task 8: Foursquare response mapper (TDD)

**Files:**
- Create: `api/_lib/foursquare.ts`
- Create: `api/_lib/foursquare.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `api/_lib/foursquare.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapFoursquareResult } from './foursquare';

const FULL = {
  fsq_id: 'fsq-123',
  name: 'Joe’s Pizza',
  geocodes: { main: { latitude: 40.73, longitude: -74.0 } },
  location: { formatted_address: '7 Carmine St, New York, NY' },
  categories: [{ name: 'Pizza Place' }, { name: 'Restaurant' }],
  rating: 8.4,
  stats: { total_tips: 27 },
};

describe('mapFoursquareResult', () => {
  it('maps a full result', () => {
    const out = mapFoursquareResult(FULL);
    expect(out).not.toBeNull();
    expect(out).toEqual({
      fsq_id: 'fsq-123',
      name: 'Joe’s Pizza',
      address: '7 Carmine St, New York, NY',
      lat: 40.73,
      lng: -74.0,
      categories: ['Pizza Place', 'Restaurant'],
      rating: 8.4,
      tipsCount: 27,
      googleUrl: expect.stringContaining('https://www.google.com/maps/search/?api=1&query='),
    });
  });

  it('omits rating when Foursquare omits it', () => {
    const { rating, ...rest } = FULL;
    expect(rating).toBeDefined();
    const out = mapFoursquareResult(rest as unknown as typeof FULL);
    expect(out!.rating).toBeUndefined();
  });

  it('omits tipsCount when stats is missing', () => {
    const { stats, ...rest } = FULL;
    expect(stats).toBeDefined();
    const out = mapFoursquareResult(rest as unknown as typeof FULL);
    expect(out!.tipsCount).toBeUndefined();
  });

  it('handles empty categories array', () => {
    const out = mapFoursquareResult({ ...FULL, categories: [] });
    expect(out!.categories).toEqual([]);
  });

  it('returns null when fsq_id is missing', () => {
    const { fsq_id, ...rest } = FULL;
    expect(fsq_id).toBeDefined();
    const out = mapFoursquareResult(rest as unknown as typeof FULL);
    expect(out).toBeNull();
  });

  it('returns null when geocodes.main is missing', () => {
    const broken = { ...FULL, geocodes: {} };
    expect(mapFoursquareResult(broken as unknown as typeof FULL)).toBeNull();
  });

  it('uses empty string when address is missing', () => {
    const out = mapFoursquareResult({ ...FULL, location: {} } as unknown as typeof FULL);
    expect(out!.address).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- foursquare`
Expected: FAIL — "Cannot find module './foursquare'".

- [ ] **Step 3: Implement `api/_lib/foursquare.ts`**

```ts
import type { Place } from '../../src/types';
import { buildGoogleMapsUrl } from '../../src/lib/google-url';

export type FsqRaw = {
  fsq_id?: string;
  name?: string;
  geocodes?: { main?: { latitude?: number; longitude?: number } };
  location?: { formatted_address?: string };
  categories?: Array<{ name?: string }>;
  rating?: number;
  stats?: { total_tips?: number };
};

export function mapFoursquareResult(raw: FsqRaw): Place | null {
  if (!raw.fsq_id || typeof raw.fsq_id !== 'string') return null;
  if (!raw.name || typeof raw.name !== 'string') return null;
  const main = raw.geocodes?.main;
  if (
    !main ||
    typeof main.latitude !== 'number' ||
    typeof main.longitude !== 'number'
  ) {
    return null;
  }

  const address = raw.location?.formatted_address ?? '';
  const categories = (raw.categories ?? [])
    .map((c) => c.name)
    .filter((n): n is string => typeof n === 'string');

  const place: Place = {
    fsq_id: raw.fsq_id,
    name: raw.name,
    address,
    lat: main.latitude,
    lng: main.longitude,
    categories,
    googleUrl: buildGoogleMapsUrl(raw.name, address),
  };

  if (typeof raw.rating === 'number') place.rating = raw.rating;
  if (typeof raw.stats?.total_tips === 'number') place.tipsCount = raw.stats.total_tips;

  return place;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- foursquare`
Expected: 7 passing tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/foursquare.ts api/_lib/foursquare.test.ts
git commit -m "Add Foursquare response mapper"
```

---

### Task 9: `/api/geocode` Vercel function (TDD)

Uses Nominatim. Validates the query, calls Nominatim with a descriptive User-Agent, and returns the first result.

**API verification:** Before implementing, the engineer should sanity-check Nominatim's current API at `https://nominatim.openstreetmap.org/search?format=json&q=Brooklyn`. Expected response shape: `[{ lat: "40.6526...", lon: "-73.9498...", display_name: "..." }, ...]`.

**Rate-limiting deviation from spec:** The spec mentions rate-limiting Nominatim requests to 1 req/sec from the server. On Vercel serverless this is not enforceable in-memory (cold starts make per-process counters meaningless without an external store like KV/Redis). For personal-use scale, we rely on client-side debounce (350ms in `<SearchBar>`, only one geocode per address submit) plus a descriptive `User-Agent` to stay within Nominatim's politeness policy. Document, don't half-implement.

**Files:**
- Create: `api/geocode.ts`
- Create: `api/geocode.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `api/geocode.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from './geocode';

type MockReq = {
  method: string;
  query: Record<string, string | string[] | undefined>;
};

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  status: (code: number) => MockRes;
  setHeader: (k: string, v: string) => void;
  json: (b: unknown) => void;
};

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(b) {
      this.body = b;
    },
  };
  return res;
}

const NOMINATIM_OK = [
  { lat: '40.6526', lon: '-73.9498', display_name: 'Brooklyn, NYC, USA' },
];

describe('/api/geocode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 400 for missing q', async () => {
    const req = { method: 'GET', query: {} } as MockReq;
    const res = mockRes();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for empty q', async () => {
    const req = { method: 'GET', query: { q: '   ' } } as MockReq;
    const res = mockRes();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST', query: { q: 'Brooklyn' } } as MockReq;
    const res = mockRes();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it('returns 404 when Nominatim returns an empty array', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    const res = mockRes();
    await handler({ method: 'GET', query: { q: 'asdfqwerty' } } as never, res as never);
    expect(res.statusCode).toBe(404);
  });

  it('returns parsed lat/lng/displayName on success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(NOMINATIM_OK), { status: 200 }),
    );
    const res = mockRes();
    await handler({ method: 'GET', query: { q: 'Brooklyn' } } as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      lat: 40.6526,
      lng: -73.9498,
      displayName: 'Brooklyn, NYC, USA',
    });
  });

  it('sends a descriptive User-Agent to Nominatim', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(NOMINATIM_OK), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler({ method: 'GET', query: { q: 'Brooklyn' } } as never, res as never);
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'User-Agent': expect.stringContaining('meal-planner'),
    });
  });

  it('returns 502 when Nominatim returns a 5xx', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('boom', { status: 503 }),
    );
    const res = mockRes();
    await handler({ method: 'GET', query: { q: 'Brooklyn' } } as never, res as never);
    expect(res.statusCode).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- geocode`
Expected: FAIL — "Cannot find module './geocode'".

- [ ] **Step 3: Implement `api/geocode.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'meal-planner/1.0 (https://github.com/)';

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = firstString(req.query.q)?.trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter `q`' });
  if (q.length > 200) return res.status(400).json({ error: '`q` too long' });

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(q)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });
  } catch {
    return res.status(502).json({ error: 'Upstream geocoder unreachable' });
  }

  if (!upstream.ok) {
    return res.status(502).json({ error: 'Upstream geocoder error' });
  }

  let data: Array<{ lat?: string; lon?: string; display_name?: string }>;
  try {
    data = (await upstream.json()) as typeof data;
  } catch {
    return res.status(502).json({ error: 'Bad upstream response' });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(404).json({ error: 'No results' });
  }

  const first = data[0];
  const lat = first.lat ? Number(first.lat) : NaN;
  const lng = first.lon ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(502).json({ error: 'Bad upstream response' });
  }

  return res.status(200).json({
    lat,
    lng,
    displayName: first.display_name ?? q,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- geocode`
Expected: 7 passing tests.

- [ ] **Step 5: Commit**

```bash
git add api/geocode.ts api/geocode.test.ts
git commit -m "Add /api/geocode Vercel function backed by Nominatim"
```

---

### Task 10: `/api/places` Vercel function (TDD)

Uses Foursquare. Validates inputs, calls Foursquare with the API key from `FOURSQUARE_KEY`, and maps results.

**API verification:** Before implementing, the engineer should look up the current Foursquare Places API endpoint and auth contract — the assumed contract here (v3, key as `Authorization` header, `/places/search` endpoint) was current as of early 2026 but Foursquare has reorganized in the past. If the endpoint differs, only the `fetch` call inside this function needs to change; the mapper (Task 8) stays the same as long as the response shape matches `FsqRaw`.

**Files:**
- Create: `api/places.ts`
- Create: `api/places.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `api/places.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from './places';

type MockReq = {
  method: string;
  query: Record<string, string | string[] | undefined>;
};
type MockRes = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockRes;
  setHeader: (k: string, v: string) => void;
  json: (b: unknown) => void;
};
function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(b) {
      this.body = b;
    },
  };
  return res;
}

const FSQ_OK = {
  results: [
    {
      fsq_id: 'fsq-1',
      name: 'Joe\'s Pizza',
      geocodes: { main: { latitude: 40.73, longitude: -74.0 } },
      location: { formatted_address: '7 Carmine St' },
      categories: [{ name: 'Pizza Place' }],
      rating: 8.4,
      stats: { total_tips: 27 },
    },
  ],
};

describe('/api/places', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('FOURSQUARE_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns 405 for non-GET methods', async () => {
    const res = mockRes();
    await handler({ method: 'POST', query: {} } as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 for missing lat/lng/q', async () => {
    const res = mockRes();
    await handler({ method: 'GET', query: { q: 'pizza' } } as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for out-of-range lat/lng', async () => {
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '200', lng: '0', q: 'pizza' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when FOURSQUARE_KEY is missing', async () => {
    vi.unstubAllEnvs();
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '40', lng: '-74', q: 'pizza' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(500);
  });

  it('returns 200 with mapped places on success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(FSQ_OK), { status: 200 }),
    );
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '40', lng: '-74', q: 'pizza', radius: '16093' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as { results: unknown[] }).results).toHaveLength(1);
    expect((res.body as { results: Array<{ fsq_id: string }> }).results[0].fsq_id).toBe('fsq-1');
  });

  it('passes the Foursquare key as Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '40', lng: '-74', q: 'pizza' } } as never,
      res as never,
    );
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'test-key',
    });
  });

  it('passes through a 429 from Foursquare', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '40', lng: '-74', q: 'pizza' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(429);
  });

  it('returns 502 when Foursquare returns 5xx', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('boom', { status: 503 }),
    );
    const res = mockRes();
    await handler(
      { method: 'GET', query: { lat: '40', lng: '-74', q: 'pizza' } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- api/places`
Expected: FAIL — "Cannot find module './places'".

- [ ] **Step 3: Implement `api/places.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapFoursquareResult, type FsqRaw } from './_lib/foursquare';

const FSQ_URL = 'https://api.foursquare.com/v3/places/search';
const FOOD_CATEGORY = '13065';
const MAX_RADIUS_M = 100_000;

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = parseNumber(firstString(req.query.lat));
  const lng = parseNumber(firstString(req.query.lng));
  const q = firstString(req.query.q)?.trim() ?? '';
  const radius = Math.min(parseNumber(firstString(req.query.radius)) ?? 16093, MAX_RADIUS_M);

  if (lat === null || lng === null) {
    return res.status(400).json({ error: 'Missing or invalid lat/lng' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lat/lng out of range' });
  }
  if (!q) return res.status(400).json({ error: 'Missing query `q`' });
  if (q.length > 100) return res.status(400).json({ error: '`q` too long' });

  const key = process.env.FOURSQUARE_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server not configured: FOURSQUARE_KEY missing' });
  }

  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: String(radius),
    categories: FOOD_CATEGORY,
    query: q,
    limit: '20',
    sort: 'RATING',
    fields: 'fsq_id,name,geocodes,location,categories,rating,stats',
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${FSQ_URL}?${params}`, {
      headers: { Authorization: key, Accept: 'application/json' },
    });
  } catch {
    return res.status(502).json({ error: 'Upstream search unreachable' });
  }

  if (upstream.status === 429) return res.status(429).json({ error: 'Rate limited' });
  if (upstream.status >= 500) return res.status(502).json({ error: 'Upstream search error' });
  if (!upstream.ok) return res.status(502).json({ error: 'Upstream search error' });

  let data: { results?: FsqRaw[] };
  try {
    data = (await upstream.json()) as { results?: FsqRaw[] };
  } catch {
    return res.status(502).json({ error: 'Bad upstream response' });
  }

  const results = (data.results ?? [])
    .map(mapFoursquareResult)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return res.status(200).json({ results });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- api/places`
Expected: 8 passing tests.

- [ ] **Step 5: Commit**

```bash
git add api/places.ts api/places.test.ts
git commit -m "Add /api/places Vercel function backed by Foursquare"
```

---

### Task 11: Client API wrapper

A thin typed fetch wrapper so components don't repeat URL/error parsing logic.

**Files:**
- Create: `src/lib/api-client.ts`

- [ ] **Step 1: Create the wrapper**

```ts
import type { Place } from '../types';

export type GeocodeResponse = { lat: number; lng: number; displayName: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export async function fetchPlaces(args: {
  lat: number;
  lng: number;
  q: string;
  radius?: number;
}): Promise<Place[]> {
  const params = new URLSearchParams({
    lat: String(args.lat),
    lng: String(args.lng),
    q: args.q,
    radius: String(args.radius ?? 16093),
  });
  const data = await get<{ results: Place[] }>(`/api/places?${params}`);
  return data.results;
}

export async function geocode(q: string): Promise<GeocodeResponse> {
  return await get<GeocodeResponse>(`/api/geocode?q=${encodeURIComponent(q)}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "Add typed API client for /api/places and /api/geocode"
```

---

## Phase 3: Map + search

### Task 12: Toast hook

Minimal toast utility used throughout. One global toast slot — newer toasts replace older. Auto-dismiss after 4s. We're not adding `react-hot-toast` as a dependency for this.

**Files:**
- Create: `src/components/Toast.tsx`

- [ ] **Step 1: Implement**

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string };

const ToastContext = createContext<((m: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const idRef = useRef(0);

  const show = useCallback((message: string) => {
    idRef.current += 1;
    setToast({ id: idRef.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "Add toast provider and useToast hook"
```

---

### Task 13: Geolocation helper

**Files:**
- Create: `src/lib/geolocation.ts`

- [ ] **Step 1: Implement**

```ts
import type { LatLng } from '../types';

export async function getUserLocation(timeoutMs = 8000): Promise<LatLng> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }
  return new Promise<LatLng>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/geolocation.ts
git commit -m "Add geolocation helper"
```

---

### Task 14: Add Leaflet CSS to the app

Leaflet's tile rendering needs its stylesheet imported once globally.

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Open `src/main.tsx` and add the import**

Add this import line near the top, alongside the existing imports:

```ts
import 'leaflet/dist/leaflet.css';
```

- [ ] **Step 2: Commit**

```bash
git add src/main.tsx
git commit -m "Import Leaflet stylesheet"
```

---

### Task 15: `<MapView>` with center marker and result pins

This is the largest visual component. It owns the Leaflet map, draws the center marker (where searches happen from), draws result pins with hover popups, and dispatches `SET_CENTER` on map click. Pin click opens Google Maps in a new tab (or surfaces a popup on touch via the popup's "Open in Google Maps" button).

The default Leaflet marker images break under bundlers because the library reads them via relative URLs. We work around this by using small inline SVG icons, which also lets us color pins red.

**Files:**
- Create: `src/components/MapView.tsx`
- Create: `src/components/map-icons.ts`
- Modify: `src/App.css` (add styles)

- [ ] **Step 1: Create `src/components/map-icons.ts`**

```ts
import L from 'leaflet';

function svgIcon(color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 24 32">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}" />
      <circle cx="12" cy="12" r="4.5" fill="#fff" />
    </svg>`;
  return L.divIcon({
    className: 'map-pin',
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -34],
  });
}

export const RED_PIN = svgIcon('#e53935');
export const BLUE_PIN = svgIcon('#1e88e5');
```

- [ ] **Step 2: Create `src/components/MapView.tsx`**

```tsx
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng, Place } from '../types';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { BLUE_PIN, RED_PIN } from './map-icons';
import { useToast } from './Toast';

function ClickToPlace() {
  const dispatch = useAppDispatch();
  useMapEvents({
    click(e) {
      dispatch({ type: 'SET_CENTER', center: { lat: e.latlng.lat, lng: e.latlng.lng } });
    },
  });
  return null;
}

function FlyToCenter({ center }: { center: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], 13, { duration: 1.0 });
  }, [center, map]);
  return null;
}

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
      <div className="pin-popup__name">{place.name}</div>
      <div className="pin-popup__meta">
        {place.categories[0] ?? 'Restaurant'}
        {place.rating !== undefined && (
          <>
            {' · '}
            <span title="Foursquare rating">★ {place.rating.toFixed(1)}</span>
          </>
        )}
        {place.tipsCount !== undefined && (
          <>
            {' · '}
            <span title="Foursquare tips count">{place.tipsCount} tips</span>
          </>
        )}
      </div>
      <div className="pin-popup__actions">
        <button onClick={openGoogle}>Open in Google Maps</button>
        <button onClick={() => dispatch({ type: 'SAVE_PLACE', place })}>
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
      </div>
    </div>
  );
}

export function MapView() {
  const state = useAppState();
  const defaultCenter: [number, number] = state.center
    ? [state.center.lat, state.center.lng]
    : [0, 0];
  const defaultZoom = state.center ? 13 : 2;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace />
      <FlyToCenter center={state.center} />

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
    </MapContainer>
  );
}
```

- [ ] **Step 3: Add map styles to `src/App.css`**

Replace the existing contents of `src/App.css` with:

```css
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}

.app {
  position: relative;
  height: 100%;
  width: 100%;
}

.map {
  height: 100vh;
  width: 100vw;
}

.pin-popup {
  min-width: 200px;
}
.pin-popup__name {
  font-weight: 600;
  font-size: 14px;
}
.pin-popup__meta {
  font-size: 12px;
  color: #555;
  margin: 4px 0 8px;
}
.pin-popup__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pin-popup__actions button {
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #222;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  z-index: 1000;
  max-width: 80%;
  font-size: 14px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.tsx src/components/map-icons.ts src/App.css
git commit -m "Add MapView with center marker, result pins, and popups"
```

---

### Task 16: `<LocationBar>` — address search + use-my-location

**Files:**
- Create: `src/components/LocationBar.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { geocode } from '../lib/api-client';
import { getUserLocation } from '../lib/geolocation';
import { useToast } from './Toast';

export function LocationBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await geocode(text.trim());
      dispatch({ type: 'SET_CENTER', center: { lat: result.lat, lng: result.lng } });
      dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Lookup failed';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function useMyLocation() {
    if (pending) return;
    setPending(true);
    setError(null);
    dispatch({ type: 'SET_GEO_STATUS', status: 'pending' });
    try {
      const loc = await getUserLocation();
      dispatch({ type: 'SET_CENTER', center: loc });
      dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
    } catch {
      dispatch({ type: 'SET_GEO_STATUS', status: 'denied' });
      showToast("Couldn't get your location. Enter an address above or click the map.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="location-bar">
      <form onSubmit={submitAddress}>
        <input
          type="text"
          placeholder="Enter a city or address"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
        />
        <button type="submit" disabled={pending || !text.trim()}>
          Go
        </button>
        <button type="button" onClick={useMyLocation} disabled={pending}>
          📍 Use my location
        </button>
      </form>
      {error && <div className="location-bar__error">{error}</div>}
      {state.geolocationStatus === 'denied' && (
        <div className="banner">
          We couldn't get your location. Enter an address above or click the map.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `src/App.css`** (append):

```css
.location-bar form {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.location-bar input {
  flex: 1;
  padding: 6px 8px;
  font-size: 14px;
}
.location-bar button {
  padding: 6px 10px;
  cursor: pointer;
}
.location-bar__error {
  color: #c62828;
  font-size: 12px;
  margin-bottom: 6px;
}
.banner {
  background: #fff3cd;
  border: 1px solid #ffe69c;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 6px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LocationBar.tsx src/App.css
git commit -m "Add LocationBar with address search and geolocation button"
```

---

### Task 17: `<SearchBar>` with debounce (TDD)

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/SearchBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/SearchBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('<SearchBar>', () => {
  const onSearch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onSearch.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onSearch once for fast typing after the debounce window', () => {
    render(<SearchBar onSearch={onSearch} disabled={false} />);
    const input = screen.getByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(input, { target: { value: 'p' } });
    fireEvent.change(input, { target: { value: 'pi' } });
    fireEvent.change(input, { target: { value: 'piz' } });
    fireEvent.change(input, { target: { value: 'pizz' } });
    fireEvent.change(input, { target: { value: 'pizza' } });

    expect(onSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('pizza');
  });

  it('does not fire onSearch for an empty query', () => {
    render(<SearchBar onSearch={onSearch} disabled={false} />);
    const input = screen.getByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(input, { target: { value: 'pizza' } });
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onSearch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SearchBar`
Expected: FAIL — "Cannot find module './SearchBar'".

- [ ] **Step 3: Implement `src/components/SearchBar.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 350;

export function SearchBar({
  onSearch,
  disabled,
}: {
  onSearch: (query: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const lastFiredRef = useRef('');

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed === lastFiredRef.current) return;
    const timer = setTimeout(() => {
      lastFiredRef.current = trimmed;
      onSearch(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  return (
    <input
      className="search-bar"
      type="search"
      placeholder="Search for a restaurant or cuisine"
      value={text}
      onChange={(e) => setText(e.target.value.slice(0, 100))}
      disabled={disabled}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SearchBar`
Expected: 2 passing tests.

- [ ] **Step 5: Add styles to `src/App.css`** (append):

```css
.search-bar {
  width: 100%;
  padding: 8px 10px;
  font-size: 14px;
  margin-bottom: 8px;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.test.tsx src/App.css
git commit -m "Add SearchBar with 350ms debounce"
```

---

### Task 18: `<ResultList>` — list mirror of pins

**Files:**
- Create: `src/components/ResultList.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) return <div className="result-list result-list--empty">Searching…</div>;
  if (state.searchError) {
    return <div className="result-list result-list--empty">{state.searchError}</div>;
  }
  if (state.results.length === 0 && state.query) {
    return (
      <div className="result-list result-list--empty">
        No places matched. Try a wider term or move the map.
      </div>
    );
  }
  if (state.results.length === 0) {
    return <div className="result-list result-list--empty">Search for restaurants nearby.</div>;
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
            <div className="result-list__name">{p.name}</div>
            <div className="result-list__meta">
              {p.categories[0] ?? 'Restaurant'}
              {p.rating !== undefined && <> · ★ {p.rating.toFixed(1)}</>}
              {p.tipsCount !== undefined && <> · {p.tipsCount} tips</>}
            </div>
            <div className="result-list__actions">
              <button onClick={() => openGoogle(p)}>Google Maps</button>
              <button onClick={() => dispatch({ type: 'SAVE_PLACE', place: p })}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </button>
              <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Append styles to `src/App.css`:**

```css
.result-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}
.result-list--empty {
  padding: 12px;
  color: #666;
  font-size: 14px;
}
.result-list__item {
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.result-list__name {
  font-weight: 600;
  font-size: 14px;
}
.result-list__meta {
  font-size: 12px;
  color: #555;
  margin: 4px 0 6px;
}
.result-list__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.result-list__actions button {
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ResultList.tsx src/App.css
git commit -m "Add ResultList showing search results with save and itinerary buttons"
```

---

### Task 19: Search controller — `<SearchTab>`

Glues `<LocationBar>`, `<SearchBar>`, and `<ResultList>` together with the API call lifecycle.

**Files:**
- Create: `src/components/SearchTab.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useCallback } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { ApiError, fetchPlaces } from '../lib/api-client';
import { LocationBar } from './LocationBar';
import { SearchBar } from './SearchBar';
import { ResultList } from './ResultList';
import { useToast } from './Toast';
import type { Place } from '../types';

export function SearchTab({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  const runSearch = useCallback(
    async (query: string) => {
      if (!state.center) {
        showToast('Set a location first (use the location bar above or click the map).');
        return;
      }
      dispatch({ type: 'SET_QUERY', query });
      dispatch({ type: 'SEARCH_START' });
      try {
        const results = await fetchPlaces({
          lat: state.center.lat,
          lng: state.center.lng,
          q: query,
        });
        dispatch({ type: 'SEARCH_SUCCESS', results });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          showToast('Searching a bit too fast — try again in a moment.');
        } else {
          showToast('Search failed. Please try again.');
        }
        dispatch({ type: 'SEARCH_ERROR', error: 'Search failed.' });
      }
    },
    [state.center, dispatch, showToast],
  );

  return (
    <div className="search-tab">
      <LocationBar />
      <SearchBar onSearch={runSearch} disabled={!state.center || state.searching} />
      <ResultList onAddToItinerary={onAddToItinerary} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SearchTab.tsx
git commit -m "Add SearchTab tying location, search, and results together"
```

---

### Task 20: `<PanelShell>` responsive wrapper (TDD)

The shell switches between sidebar (desktop) and bottom-sheet (mobile) via CSS, with one component tree. Both layouts contain the same three tab buttons. Mobile cutover is at `max-width: 768px`.

For the responsive test, we mock `matchMedia` to assert the right layout class is applied at each breakpoint.

**Files:**
- Create: `src/components/PanelShell.tsx`
- Create: `src/components/PanelShell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/PanelShell.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelShell } from './PanelShell';
import { AppStateProvider } from '../state/AppStateProvider';
import { ToastProvider } from './Toast';

function setMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderShell() {
  render(
    <AppStateProvider>
      <ToastProvider>
        <PanelShell />
      </ToastProvider>
    </AppStateProvider>,
  );
}

describe('<PanelShell>', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders Search/Saved/Itinerary tabs', () => {
    setMatchMedia(false);
    renderShell();
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /saved/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /itinerary/i })).toBeInTheDocument();
  });

  it('uses the desktop class above the breakpoint', () => {
    setMatchMedia(false); // not mobile
    renderShell();
    const shell = screen.getByTestId('panel-shell');
    expect(shell.className).toContain('panel-shell--desktop');
  });

  it('uses the mobile class below the breakpoint', () => {
    setMatchMedia(true); // mobile
    renderShell();
    const shell = screen.getByTestId('panel-shell');
    expect(shell.className).toContain('panel-shell--mobile');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- PanelShell`
Expected: FAIL — "Cannot find module './PanelShell'".

- [ ] **Step 3: Implement `src/components/PanelShell.tsx`**

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

export function PanelShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [pendingForItinerary, setPendingForItinerary] = useState<Place | null>(null);

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'saved', label: `Saved (${state.saved.length})` },
    {
      id: 'itinerary',
      label: `Itinerary (${
        Object.values(state.itinerary).reduce((acc, arr) => acc + arr.length, 0)
      })`,
    },
  ];

  return (
    <div
      data-testid="panel-shell"
      className={`panel-shell ${isMobile ? 'panel-shell--mobile' : 'panel-shell--desktop'}`}
    >
      <div className="panel-shell__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={state.panelTab === t.id}
            className={`panel-shell__tab ${state.panelTab === t.id ? 'is-active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PANEL_TAB', tab: t.id })}
          >
            {t.label}
          </button>
        ))}
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

- [ ] **Step 4: Append shell styles to `src/App.css`:**

```css
.panel-shell {
  position: absolute;
  background: #fff;
  z-index: 500;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}
.panel-shell--desktop {
  top: 16px;
  left: 16px;
  width: 360px;
  max-height: calc(100vh - 32px);
  border-radius: 8px;
}
.panel-shell--mobile {
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  border-radius: 12px 12px 0 0;
}
.panel-shell__tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}
.panel-shell__tab {
  flex: 1;
  padding: 10px 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
}
.panel-shell__tab.is-active {
  border-bottom-color: #1976d2;
  font-weight: 600;
}
.panel-shell__body {
  padding: 12px;
  overflow-y: auto;
}
```

- [ ] **Step 5: Stub `SavedTab`, `ItineraryTab`, `AddToItineraryPopover`**

These are filled out in later tasks but the shell imports them. Create thin placeholders so this task can run.

Create `src/components/SavedTab.tsx`:

```tsx
import type { Place } from '../types';

export function SavedTab(_: { onAddToItinerary: (place: Place) => void }) {
  return <div>Saved (coming up)</div>;
}
```

Create `src/components/ItineraryTab.tsx`:

```tsx
export function ItineraryTab() {
  return <div>Itinerary (coming up)</div>;
}
```

Create `src/components/AddToItineraryPopover.tsx`:

```tsx
import type { Place } from '../types';

export function AddToItineraryPopover(_: { place: Place; onClose: () => void }) {
  return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- PanelShell`
Expected: 3 passing tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/PanelShell.tsx src/components/PanelShell.test.tsx src/components/SavedTab.tsx src/components/ItineraryTab.tsx src/components/AddToItineraryPopover.tsx src/App.css
git commit -m "Add responsive PanelShell with tabs and placeholder tab bodies"
```

---

### Task 21: First app wiring + smoke

Now we have enough to wire the app and confirm Phase 3 works end-to-end. Phase 4–6 will replace placeholders, but at this checkpoint the search + map should function on its own.

**Files:**
- Modify: `src/App.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/App.tsx` with the new top-level**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useEffect } from 'react';
import './App.css';
import { AppStateProvider, useAppDispatch } from './state/AppStateProvider';
import { usePersistence } from './state/usePersistence';
import { ToastProvider } from './components/Toast';
import { MapView } from './components/MapView';
import { PanelShell } from './components/PanelShell';
import { getUserLocation } from './lib/geolocation';

function GeolocateOnMount() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'SET_GEO_STATUS', status: 'pending' });
      try {
        const loc = await getUserLocation();
        if (cancelled) return;
        dispatch({ type: 'SET_CENTER', center: loc });
        dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
      } catch {
        if (cancelled) return;
        dispatch({ type: 'SET_GEO_STATUS', status: 'denied' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
  return null;
}

function PersistenceMount() {
  usePersistence();
  return null;
}

function AppInner() {
  return (
    <div className="app">
      <GeolocateOnMount />
      <PersistenceMount />
      <MapView />
      <PanelShell />
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AppStateProvider>
  );
}

export default App;
```

- [ ] **Step 2: Add `FOURSQUARE_KEY` to local env**

If not already done: create or edit `.env.local` in the project root:

```
FOURSQUARE_KEY=<your-foursquare-developer-key>
```

If you don't have a key yet: sign up at `developer.foursquare.com`, create a project, copy the generated key. Add it as an env var on Vercel with `vercel env add FOURSQUARE_KEY` for Preview and Production environments.

- [ ] **Step 3: Manual smoke test**

In one terminal: `npx vercel dev` (this serves both Vite and `/api/*` together; bare `npm run dev` skips the functions).
Open `http://localhost:3000`. Confirm:

1. Browser prompts for location; on grant, blue marker appears at your location.
2. Type "ramen" in the search bar; red pins appear; result list mirrors them.
3. Click a red pin; popup opens with cuisine, rating, tips count, and two buttons.
4. Click "Open in Google Maps"; new tab opens to Google Maps for that place.
5. Click the map; blue marker moves; previous results clear.
6. Search again from the new center.

If any of these fail, fix before committing.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Wire AppStateProvider, geolocation, map, and panel"
```

---

## Phase 4: Saved list

### Task 22: Real `<SavedList>` and `<SavedTab>`

**Files:**
- Modify: `src/components/SavedTab.tsx` (full rewrite)
- Create: `src/components/SavedList.tsx`

- [ ] **Step 1: Implement `src/components/SavedList.tsx`**

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
      <div className="result-list result-list--empty">
        Save places from search to build your list.
      </div>
    );
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <ul className="result-list">
      {state.saved.map((p) => (
        <li key={p.fsq_id} className="result-list__item">
          <div className="result-list__name">{p.name}</div>
          <div className="result-list__meta">
            {p.categories[0] ?? 'Restaurant'}
            {p.rating !== undefined && <> · ★ {p.rating.toFixed(1)}</>}
            {p.tipsCount !== undefined && <> · {p.tipsCount} tips</>}
          </div>
          <div className="result-list__actions">
            <button onClick={() => openGoogle(p)}>Google Maps</button>
            <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
            <button onClick={() => dispatch({ type: 'REMOVE_SAVED', placeId: p.fsq_id })}>
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Replace `src/components/SavedTab.tsx`**

```tsx
import type { Place } from '../types';
import { SavedList } from './SavedList';

export function SavedTab({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  return <SavedList onAddToItinerary={onAddToItinerary} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SavedTab.tsx src/components/SavedList.tsx
git commit -m "Implement saved list with remove + add-to-itinerary actions"
```

---

## Phase 5: Itinerary

### Task 23: `<AddToItineraryPopover>` slot picker

**Files:**
- Modify: `src/components/AddToItineraryPopover.tsx` (full rewrite)

- [ ] **Step 1: Replace contents**

```tsx
import { useAppDispatch } from '../state/AppStateProvider';
import { MEAL_SLOTS, type MealSlot, type Place } from '../types';

const LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function AddToItineraryPopover({
  place,
  onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  return (
    <div
      className="add-itinerary-overlay"
      role="dialog"
      aria-label={`Add ${place.name} to itinerary`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-itinerary-popover">
        <div className="add-itinerary-popover__title">Add "{place.name}" to:</div>
        <div className="add-itinerary-popover__slots">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => {
                dispatch({ type: 'ADD_TO_ITINERARY', place, slot });
                onClose();
              }}
            >
              {LABELS[slot]}
            </button>
          ))}
        </div>
        <button className="add-itinerary-popover__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append styles to `src/App.css`:**

```css
.add-itinerary-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.add-itinerary-popover {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  width: min(320px, 90vw);
}
.add-itinerary-popover__title {
  font-weight: 600;
  margin-bottom: 12px;
}
.add-itinerary-popover__slots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.add-itinerary-popover__slots button {
  padding: 8px;
  cursor: pointer;
}
.add-itinerary-popover__cancel {
  width: 100%;
  padding: 6px;
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AddToItineraryPopover.tsx src/App.css
git commit -m "Implement meal-slot picker popover"
```

---

### Task 24: `<MealSlot>` with reorder/remove/move (TDD)

**Files:**
- Create: `src/components/MealSlot.tsx`
- Create: `src/components/MealSlot.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/MealSlot.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealSlot } from './MealSlot';
import { AppStateProvider, useAppDispatch } from '../state/AppStateProvider';
import { ToastProvider } from './Toast';
import type { Place } from '../types';
import { useEffect } from 'react';

const placeA: Place = {
  fsq_id: 'a',
  name: 'A',
  address: '1 A St',
  lat: 0,
  lng: 0,
  categories: ['Food'],
  googleUrl: 'https://example.com/a',
};
const placeB: Place = { ...placeA, fsq_id: 'b', name: 'B' };

function Seed({ places }: { places: Place[] }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    for (const p of places) dispatch({ type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
  }, [dispatch, places]);
  return null;
}

function renderSlot(places: Place[]) {
  render(
    <AppStateProvider>
      <ToastProvider>
        <Seed places={places} />
        <MealSlot slot="lunch" label="Lunch" />
      </ToastProvider>
    </AppStateProvider>,
  );
}

describe('<MealSlot>', () => {
  it('renders the items added to the slot', () => {
    renderSlot([placeA, placeB]);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('removes an item when Remove is clicked', () => {
    renderSlot([placeA, placeB]);
    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i });
    fireEvent.click(removeButtons[0]); // remove A
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('swaps items when the down arrow is clicked', () => {
    renderSlot([placeA, placeB]);
    const downA = screen.getAllByLabelText('Move down')[0];
    fireEvent.click(downA);
    const names = screen.getAllByTestId('meal-slot-name').map((n) => n.textContent);
    expect(names).toEqual(['B', 'A']);
  });

  it('moving an item to another slot via the slot picker fires the right action', () => {
    renderSlot([placeA]);
    fireEvent.click(screen.getByRole('button', { name: /move to/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dinner$/i }));
    // After moving to dinner, lunch should be empty.
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- MealSlot`
Expected: FAIL — "Cannot find module './MealSlot'".

- [ ] **Step 3: Implement `src/components/MealSlot.tsx`**

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

  return (
    <div className="meal-slot">
      <h3 className="meal-slot__heading">{label}</h3>
      {items.length === 0 && <div className="meal-slot__empty">No picks yet.</div>}
      <ul className="meal-slot__list">
        {items.map((p, index) => (
          <li key={p.fsq_id} className="meal-slot__item">
            <div data-testid="meal-slot-name" className="meal-slot__name">
              {p.name}
            </div>
            <div className="meal-slot__meta">{p.categories[0] ?? 'Restaurant'}</div>
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
                ▲
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
                ▼
              </button>
              <button onClick={() => openGoogle(p)}>Google Maps</button>
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
            <div className="add-itinerary-popover__title">Move "{moveTarget.name}" to:</div>
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

- [ ] **Step 4: Append styles to `src/App.css`:**

```css
.meal-slot {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.meal-slot__heading {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}
.meal-slot__empty {
  font-size: 12px;
  color: #888;
}
.meal-slot__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.meal-slot__item {
  padding: 6px 0;
  border-top: 1px solid #f3f3f3;
}
.meal-slot__name {
  font-size: 13px;
  font-weight: 600;
}
.meal-slot__meta {
  font-size: 11px;
  color: #555;
  margin-bottom: 4px;
}
.meal-slot__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.meal-slot__actions button {
  font-size: 11px;
  padding: 3px 6px;
  cursor: pointer;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- MealSlot`
Expected: 4 passing tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/MealSlot.tsx src/components/MealSlot.test.tsx src/App.css
git commit -m "Implement MealSlot with reorder, remove, and move-to-slot actions"
```

---

### Task 25: Real `<ItineraryTab>`

**Files:**
- Modify: `src/components/ItineraryTab.tsx` (full rewrite)

- [ ] **Step 1: Replace contents**

```tsx
import { MealSlot } from './MealSlot';

export function ItineraryTab() {
  return (
    <div className="itinerary-tab">
      <MealSlot slot="breakfast" label="Breakfast" />
      <MealSlot slot="lunch" label="Lunch" />
      <MealSlot slot="dinner" label="Dinner" />
      <MealSlot slot="snacks" label="Snacks" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ItineraryTab.tsx
git commit -m "Replace ItineraryTab placeholder with four meal slots"
```

---

## Phase 6: Share link

### Task 26: `<ShareDialog>` component

**Files:**
- Create: `src/components/ShareDialog.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppStateProvider';
import { encodeShareState } from '../lib/share-codec';
import { useToast } from './Toast';

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const showToast = useToast();
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const encoded = await encodeShareState({ saved: state.saved, itinerary: state.itinerary });
      if (cancelled) return;
      const base = `${window.location.origin}${window.location.pathname}`;
      setUrl(`${base}#s=${encoded}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, state.saved, state.itinerary]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied.');
    } catch {
      showToast('Could not copy automatically — select and copy the link.');
    }
  }

  return (
    <div
      className="add-itinerary-overlay"
      role="dialog"
      aria-label="Share itinerary"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-itinerary-popover">
        <div className="add-itinerary-popover__title">Share your plan</div>
        <textarea readOnly value={url} className="share-dialog__url" rows={3} />
        <div className="add-itinerary-popover__slots">
          <button onClick={copy}>Copy</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append styles to `src/App.css`:**

```css
.share-dialog__url {
  width: 100%;
  font-family: monospace;
  font-size: 11px;
  padding: 6px;
  margin-bottom: 12px;
  resize: none;
}
.share-button {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 600;
  padding: 8px 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareDialog.tsx src/App.css
git commit -m "Add ShareDialog with copy-to-clipboard URL"
```

---

### Task 27: URL-hash hydration hook

Reads the `#s=...` fragment on mount and dispatches `HYDRATE`. Invalid payloads fall back to localStorage (which `usePersistence` already loads) and surface a toast.

**Files:**
- Create: `src/state/useShareHydration.ts`

- [ ] **Step 1: Implement**

```ts
import { useEffect, useRef } from 'react';
import { decodeShareState } from '../lib/share-codec';
import { useAppDispatch } from './AppStateProvider';
import { useToast } from '../components/Toast';

const HASH_PREFIX = '#s=';

export function useShareHydration(): void {
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash.startsWith(HASH_PREFIX)) return;

    const payload = hash.slice(HASH_PREFIX.length);
    (async () => {
      const decoded = await decodeShareState(payload);
      if (decoded) {
        dispatch({ type: 'HYDRATE', saved: decoded.saved, itinerary: decoded.itinerary });
      } else {
        showToast('That share link looks broken. Showing your saved data instead.');
      }
      // Clean the hash from the URL so reloads don't re-trigger.
      if (typeof window !== 'undefined') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    })();
  }, [dispatch, showToast]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/useShareHydration.ts
git commit -m "Add share-link URL hydration hook"
```

---

### Task 28: Wire ShareDialog + hydration into the app

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import './App.css';
import { AppStateProvider, useAppDispatch } from './state/AppStateProvider';
import { usePersistence } from './state/usePersistence';
import { useShareHydration } from './state/useShareHydration';
import { ToastProvider } from './components/Toast';
import { MapView } from './components/MapView';
import { PanelShell } from './components/PanelShell';
import { ShareDialog } from './components/ShareDialog';
import { getUserLocation } from './lib/geolocation';

function GeolocateOnMount() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'SET_GEO_STATUS', status: 'pending' });
      try {
        const loc = await getUserLocation();
        if (cancelled) return;
        dispatch({ type: 'SET_CENTER', center: loc });
        dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
      } catch {
        if (cancelled) return;
        dispatch({ type: 'SET_GEO_STATUS', status: 'denied' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
  return null;
}

function PersistenceMount() {
  usePersistence();
  return null;
}

function HydrateFromShareMount() {
  useShareHydration();
  return null;
}

function AppInner() {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="app">
      <HydrateFromShareMount />
      <PersistenceMount />
      <GeolocateOnMount />
      <MapView />
      <PanelShell />
      <button className="share-button" onClick={() => setShareOpen(true)}>
        Share
      </button>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AppStateProvider>
  );
}

export default App;
```

Note: `HydrateFromShareMount` is placed *before* `PersistenceMount` so a share-link wins over the local copy, then gets persisted on the next render.

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "Wire ShareDialog and URL-hash hydration into the app"
```

---

## Phase 7: Integration test + cleanup

### Task 29: Integration test — full happy path

**Files:**
- Create: `tests/integration/full-flow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import App from '../../src/App';

const SAMPLE_PLACE = {
  fsq_id: 'fsq-1',
  name: 'Joe\'s Pizza',
  address: '7 Carmine St',
  lat: 40.73,
  lng: -74.0,
  categories: ['Pizza'],
  rating: 8.4,
  tipsCount: 27,
  googleUrl: 'https://www.google.com/maps/search/?api=1&query=Joe%27s%20Pizza%207%20Carmine%20St',
};

const mockGeolocation = {
  getCurrentPosition: vi.fn((success) =>
    success({ coords: { latitude: 40.73, longitude: -74.0 } } as GeolocationPosition),
  ),
};

beforeEach(() => {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: mockGeolocation,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/places')) {
        return new Response(JSON.stringify({ results: [SAMPLE_PLACE] }), { status: 200 });
      }
      if (url.includes('/api/geocode')) {
        return new Response(
          JSON.stringify({ lat: 40.73, lng: -74.0, displayName: 'NYC' }),
          { status: 200 },
        );
      }
      // Pass-through for OSM tiles — return 200 OK empty body.
      return new Response('', { status: 200 });
    }),
  );
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('full meal-planner flow', () => {
  it('search → save → itinerary → share URL round-trip', async () => {
    const { unmount } = render(<App />);

    // Wait for geolocation grant + initial render.
    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    // Type into search and wait for debounce.
    const searchInput = await screen.findByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(searchInput, { target: { value: 'pizza' } });

    // Result appears in result list.
    await waitFor(() => {
      expect(screen.getAllByText(/Joe's Pizza/i).length).toBeGreaterThan(0);
    });

    // Save the place.
    const saveBtn = screen.getAllByRole('button', { name: /save/i })[0];
    fireEvent.click(saveBtn);

    // Switch to Saved tab.
    fireEvent.click(screen.getByRole('tab', { name: /saved/i }));
    expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();

    // Add to itinerary (Dinner).
    fireEvent.click(screen.getByRole('button', { name: /\+ itinerary/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dinner$/i }));

    // Switch to Itinerary tab and confirm Dinner has the item.
    fireEvent.click(screen.getByRole('tab', { name: /itinerary/i }));
    expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();

    // Open Share dialog.
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
    const textarea = (await screen.findByLabelText(
      /share itinerary/i,
    )).querySelector('textarea') as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toContain('#s='));
    const shareUrl = textarea.value;

    unmount();

    // Now re-mount the app with the share URL as the location hash, and an empty localStorage.
    localStorage.clear();
    const hashIdx = shareUrl.indexOf('#');
    window.history.replaceState(null, '', shareUrl.slice(hashIdx));

    render(<App />);

    // The hydrated state should show the saved + itinerary entry.
    fireEvent.click(await screen.findByRole('tab', { name: /itinerary/i }));
    await waitFor(() => {
      expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- full-flow`
Expected: 1 passing test. If failing, the failure points to a real regression in the wiring; fix it before continuing.

> Known flake to avoid: this test depends on the share-codec being able to round-trip through gzip in JSDOM. Vitest's `jsdom` environment uses the host Node's `CompressionStream`, which is available in Node 18.17+. If you see "ReferenceError: CompressionStream is not defined", upgrade Node.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/full-flow.test.tsx
git commit -m "Add integration test: search → save → itinerary → share round-trip"
```

---

### Task 30: Cleanup obsolete files

The original train-demo CSS, the unused `server.js`, and the old hello-world function are no longer used.

**Files:**
- Delete: `server.js`
- Delete: `api/hello.js`
- Modify: `src/index.css` (review for train-demo-specific styles)
- Modify: `README.md`

- [ ] **Step 1: Remove the old hello-world Node server**

Run: `git rm server.js`

- [ ] **Step 2: Remove the old API hello endpoint**

Run: `git rm api/hello.js`

- [ ] **Step 3: Audit `src/index.css`**

Open `src/index.css`. Anything that's specifically styling the old train demo (`.train`, `.steam`, `.hero`, `.mute-toggle`, `.counter`, `.tagline`, body backgrounds tied to the demo) — delete. Keep global resets, font defaults. If you're unsure, run `git log -p src/index.css` to see what existed before.

- [ ] **Step 4: Update `README.md`**

Replace the body (everything after the opening "Welcome to Conductor" sentence is fair game) with a concise description of the meal-planner app, how to run it (`vercel dev` for full functionality, `npm test` for tests), and where to find the spec and plan. Keep the Conductor-related preamble intact.

Suggested replacement for the body section (after `## How Conductor Uses This Project`):

```markdown
## What this is

A vacation meal planner: an interactive map that searches Foursquare for nearby restaurants in a 10-mile radius, lets you save picks, and arrange them into a single-day itinerary by meal slot. Pins click through to Google Maps for full reviews. Local-first with a shareable URL.

See `docs/superpowers/specs/2026-05-22-meal-planner-design.md` for the design spec and `docs/superpowers/plans/2026-05-22-meal-planner.md` for the implementation plan.

## Local development

```sh
npm install
```

For the SPA only (no serverless functions):

```sh
npm run dev
```

For the full app including `/api/*` functions, use Vercel's dev server (requires `npm install -g vercel`):

```sh
vercel dev
```

You'll need a `FOURSQUARE_KEY` in `.env.local`. Get one at developer.foursquare.com.

## Tests

```sh
npm test         # one-shot
npm run test:watch
```

## Deploy

This deploys to Vercel automatically when pushed to a connected branch. Set `FOURSQUARE_KEY` in the Vercel project's Preview and Production environments.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove obsolete train demo and hello-world server; update README"
```

---

### Task 31: Run the full test suite

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All test files pass. If anything fails, fix before continuing.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: No errors. Warnings about unused exports in test files are fine.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: TypeScript compiles, Vite produces `dist/`.

- [ ] **Step 4: Manual smoke checklist**

Per the spec's manual smoke list:

1. Open in an incognito window with `vercel dev` running. Grant location. Search "ramen". See up to 20 pins.
2. Hover a pin → popup shows cuisine + Foursquare rating + tips count, labeled.
3. Click a pin → new tab opens to Google Maps for that place.
4. Save 3 places, drop them into different meal slots.
5. Hit Share. Copy the URL. Open in a different browser. See the same saved + itinerary.
6. Deny location on first load. Type an address. Map flies there. Search works.
7. Resize to phone width. Bottom sheet appears, sidebar gone. Same actions still work.

If anything fails, that's a real bug — fix it.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "Fix issues found during manual smoke testing"
```

(Skip this commit if nothing needed fixing.)

---

## Done

You now have a working meal planner on the `/` route, replacing the old "hello world" output. Push to your Vercel-connected branch to deploy.
