import { describe, it, expect } from 'vitest';
import { buildGoogleMapsUrl } from './google-url';

describe('buildGoogleMapsUrl', () => {
  it('builds a search URL from name and address', () => {
    const url = buildGoogleMapsUrl('Joe\'s Pizza', '7 Carmine St, New York, NY');
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
  });

  it('URL-encodes spaces, commas, and apostrophes', () => {
    const url = buildGoogleMapsUrl("Joe's Pizza", '7 Carmine St, New York, NY');
    expect(url).toContain('Joe%27s%20Pizza');
    expect(url).toContain('%2C');
  });

  it('handles non-ASCII characters (e.g. accents)', () => {
    const url = buildGoogleMapsUrl('Café Münchner', 'Schönhauser Allee, Berlin');
    expect(url).toContain(encodeURIComponent('Café Münchner'));
    expect(url).toContain(encodeURIComponent('Schönhauser Allee, Berlin'));
  });

  it('joins name and address with a space', () => {
    const url = buildGoogleMapsUrl('A', 'B');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=A%20B');
  });

  it('returns a URL with no trailing whitespace when address is empty', () => {
    const url = buildGoogleMapsUrl('Solo Spot', '');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Solo%20Spot');
  });
});
