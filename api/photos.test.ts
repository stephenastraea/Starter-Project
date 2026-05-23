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
