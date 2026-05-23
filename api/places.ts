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
