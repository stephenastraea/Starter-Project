import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapFoursquareResult, type FsqRaw } from './_lib/foursquare.js';

const FSQ_URL = 'https://places-api.foursquare.com/places/search';
const FSQ_API_VERSION = '2025-06-17';
const FOOD_CATEGORY = '13065';
const MAX_RADIUS_M = 100_000;
// Oversample so we still hit RESULT_LIMIT distinct establishments after the
// dedupe pass collapses chain duplicates. Foursquare's max limit per request
// is 50; we don't paginate beyond that for v1.
const FSQ_REQUEST_LIMIT = '50';
const RESULT_LIMIT = 20;

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
    limit: FSQ_REQUEST_LIMIT,
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${FSQ_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'X-Places-Api-Version': FSQ_API_VERSION,
      },
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

  const deduped = dedupeByNameKeepingClosest(data.results ?? []);
  const results = deduped
    .map(mapFoursquareResult)
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, RESULT_LIMIT);

  return res.status(200).json({ results });
}

// Keep only the closest result per (case-insensitive, trimmed) name.
// Distance is taken from Foursquare's `distance` field (meters from search
// center). If `distance` is missing, the first occurrence wins.
export function dedupeByNameKeepingClosest(raws: FsqRaw[]): FsqRaw[] {
  const bestByName = new Map<string, FsqRaw>();
  const seenOrder: string[] = [];
  for (const raw of raws) {
    if (!raw.name) continue;
    const key = raw.name.trim().toLowerCase();
    const existing = bestByName.get(key);
    if (!existing) {
      bestByName.set(key, raw);
      seenOrder.push(key);
      continue;
    }
    const existingD = typeof existing.distance === 'number' ? existing.distance : Infinity;
    const currentD = typeof raw.distance === 'number' ? raw.distance : Infinity;
    if (currentD < existingD) bestByName.set(key, raw);
  }
  return seenOrder.map((k) => bestByName.get(k)!);
}
