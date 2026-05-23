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
