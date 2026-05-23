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
