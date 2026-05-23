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
