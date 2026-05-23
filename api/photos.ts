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
