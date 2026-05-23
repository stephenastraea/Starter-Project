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
