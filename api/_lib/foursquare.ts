import type { Place } from '../../src/types';
import { buildGoogleMapsUrl } from '../../src/lib/google-url';

export type FsqRaw = {
  fsq_id?: string;
  name?: string;
  geocodes?: { main?: { latitude?: number; longitude?: number } };
  location?: { formatted_address?: string };
  categories?: Array<{ name?: string }>;
  rating?: number;
  stats?: { total_tips?: number };
};

export function mapFoursquareResult(raw: FsqRaw): Place | null {
  if (!raw.fsq_id || typeof raw.fsq_id !== 'string') return null;
  if (!raw.name || typeof raw.name !== 'string') return null;
  const main = raw.geocodes?.main;
  if (
    !main ||
    typeof main.latitude !== 'number' ||
    typeof main.longitude !== 'number'
  ) {
    return null;
  }

  const address = raw.location?.formatted_address ?? '';
  const categories = (raw.categories ?? [])
    .map((c) => c.name)
    .filter((n): n is string => typeof n === 'string');

  const place: Place = {
    fsq_id: raw.fsq_id,
    name: raw.name,
    address,
    lat: main.latitude,
    lng: main.longitude,
    categories,
    googleUrl: buildGoogleMapsUrl(raw.name, address),
  };

  if (typeof raw.rating === 'number') place.rating = raw.rating;
  if (typeof raw.stats?.total_tips === 'number') place.tipsCount = raw.stats.total_tips;

  return place;
}
