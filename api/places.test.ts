import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler, { dedupeByNameKeepingClosest } from './places';
import type { FsqRaw } from './_lib/foursquare';

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
      Authorization: 'Bearer test-key',
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

describe('dedupeByNameKeepingClosest', () => {
  function raw(name: string, distance: number, id = name): FsqRaw {
    return { fsq_place_id: id, name, distance };
  }

  it('keeps the closest result when names match', () => {
    const out = dedupeByNameKeepingClosest([
      raw('Shake Shack', 3286, 'a'),
      raw('Shake Shack', 1616, 'b'),
      raw('Shake Shack', 4500, 'c'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].fsq_place_id).toBe('b');
  });

  it('does not collapse different names', () => {
    const out = dedupeByNameKeepingClosest([
      raw('Shake Shack', 1000),
      raw('5 Napkin Burger', 2000),
      raw('Corner Bistro', 3000),
    ]);
    expect(out.map((r) => r.name)).toEqual(['Shake Shack', '5 Napkin Burger', 'Corner Bistro']);
  });

  it('treats name matching as case-insensitive and trim-insensitive', () => {
    const out = dedupeByNameKeepingClosest([
      raw('Shake Shack', 3000, 'a'),
      raw(' shake shack ', 1000, 'b'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].fsq_place_id).toBe('b');
  });

  it('preserves the first-seen ordering of surviving names', () => {
    const out = dedupeByNameKeepingClosest([
      raw('B', 2000),
      raw('A', 1000),
      raw('B', 500), // closer B than first
      raw('C', 3000),
    ]);
    expect(out.map((r) => r.name)).toEqual(['B', 'A', 'C']);
  });

  it('skips entries without a name', () => {
    const out = dedupeByNameKeepingClosest([
      { fsq_place_id: 'no-name', distance: 1 } as FsqRaw,
      raw('Shake Shack', 1000),
    ]);
    expect(out.map((r) => r.name)).toEqual(['Shake Shack']);
  });

  it('falls back to first-seen when distance is missing', () => {
    const out = dedupeByNameKeepingClosest([
      { fsq_place_id: 'a', name: 'Joe', distance: undefined } as FsqRaw,
      { fsq_place_id: 'b', name: 'Joe', distance: undefined } as FsqRaw,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].fsq_place_id).toBe('a');
  });
});
