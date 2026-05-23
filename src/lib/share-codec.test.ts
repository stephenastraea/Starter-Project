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
    const json = JSON.stringify({ saved: [PLACE] });
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    expect(await decodeShareState(b64)).toBeNull();
    expect(bogus).not.toBe('');
  });

  it('strips photoUrl from saved places when encoding', async () => {
    const encoded = await encodeShareState({
      saved: [{ ...PLACE, photoUrl: 'https://photo.example/x.jpg' }],
      itinerary: EMPTY_ITINERARY,
    });
    const decoded = await decodeShareState(encoded);
    expect(decoded!.saved[0].photoUrl).toBeUndefined();
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
