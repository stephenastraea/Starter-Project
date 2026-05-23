import type { Place } from '../types';

export type GeocodeResponse = { lat: number; lng: number; displayName: string };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export async function fetchPlaces(args: {
  lat: number;
  lng: number;
  q: string;
  radius?: number;
}): Promise<Place[]> {
  const params = new URLSearchParams({
    lat: String(args.lat),
    lng: String(args.lng),
    q: args.q,
    radius: String(args.radius ?? 16093),
  });
  const data = await get<{ results: Place[] }>(`/api/places?${params}`);
  return data.results;
}

export async function geocode(q: string): Promise<GeocodeResponse> {
  return await get<GeocodeResponse>(`/api/geocode?q=${encodeURIComponent(q)}`);
}

export async function fetchPhoto(fsqId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/photos?fsq_id=${encodeURIComponent(fsqId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { photoUrl?: string | null };
    return body.photoUrl ?? null;
  } catch {
    return null;
  }
}
