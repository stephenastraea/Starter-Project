import type { Place } from '../../src/types';
import { buildGoogleMapsUrl } from '../../src/lib/google-url';

// Foursquare Places API (places-api.foursquare.com, 2025-06-17+) response shape.
// Includes legacy v3 fields as optional so the mapper stays backwards-compatible
// in case the engineer needs to pin to an older API version.
export type FsqRaw = {
  fsq_place_id?: string;
  fsq_id?: string; // legacy v3 field name
  name?: string;
  latitude?: number;
  longitude?: number;
  geocodes?: { main?: { latitude?: number; longitude?: number } }; // legacy v3
  location?: { formatted_address?: string };
  categories?: Array<{ name?: string }>;
  rating?: number;
  stats?: { total_tips?: number };
};

export function mapFoursquareResult(raw: FsqRaw): Place | null {
  const id = raw.fsq_place_id ?? raw.fsq_id;
  if (!id || typeof id !== 'string') return null;
  if (!raw.name || typeof raw.name !== 'string') return null;

  const lat = typeof raw.latitude === 'number' ? raw.latitude : raw.geocodes?.main?.latitude;
  const lng = typeof raw.longitude === 'number' ? raw.longitude : raw.geocodes?.main?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const address = raw.location?.formatted_address ?? '';
  const categories = (raw.categories ?? [])
    .map((c) => c.name)
    .filter((n): n is string => typeof n === 'string');

  const place: Place = {
    fsq_id: id,
    name: raw.name,
    address,
    lat,
    lng,
    categories,
    googleUrl: buildGoogleMapsUrl(raw.name, address),
  };

  if (typeof raw.rating === 'number') place.rating = raw.rating;
  if (typeof raw.stats?.total_tips === 'number') place.tipsCount = raw.stats.total_tips;

  return place;
}
