import {
  EMPTY_ITINERARY,
  MEAL_SLOTS,
  type Itinerary,
  type MealSlot,
  type Place,
} from '../types';

export type ShareState = {
  saved: Place[];
  itinerary: Itinerary;
};

const REQUIRED_PLACE_FIELDS: (keyof Place)[] = [
  'fsq_id',
  'name',
  'address',
  'lat',
  'lng',
  'categories',
  'googleUrl',
];

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(encoded: string): Uint8Array | null {
  try {
    const padded = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function gzipString(input: string): Promise<Uint8Array> {
  const stream = bytesToStream(new TextEncoder().encode(input))
    .pipeThrough(new CompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzipToString(input: Uint8Array): Promise<string> {
  const stream = bytesToStream(input)
    .pipeThrough(new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  for (const field of REQUIRED_PLACE_FIELDS) {
    if (!(field in obj)) return false;
  }
  if (typeof obj.fsq_id !== 'string') return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.address !== 'string') return false;
  if (typeof obj.lat !== 'number') return false;
  if (typeof obj.lng !== 'number') return false;
  if (!Array.isArray(obj.categories)) return false;
  if (typeof obj.googleUrl !== 'string') return false;
  return true;
}

function sanitizeItinerary(raw: unknown): Itinerary | null {
  if (!raw || typeof raw !== 'object') return null;
  const result: Itinerary = { ...EMPTY_ITINERARY };
  for (const slot of MEAL_SLOTS) {
    const arr = (raw as Record<string, unknown>)[slot];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) return null;
    if (!arr.every(isPlace)) return null;
    result[slot as MealSlot] = arr;
  }
  return result;
}

export async function encodeShareState(state: ShareState): Promise<string> {
  const json = JSON.stringify(state);
  const bytes = await gzipString(json);
  return toBase64Url(bytes);
}

export async function decodeShareState(encoded: string): Promise<ShareState | null> {
  if (!encoded) return null;
  const bytes = fromBase64Url(encoded);
  if (!bytes) return null;

  let json: string;
  try {
    json = await gunzipToString(bytes);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  if (!('saved' in obj) || !('itinerary' in obj)) return null;
  if (!Array.isArray(obj.saved) || !obj.saved.every(isPlace)) return null;

  const itinerary = sanitizeItinerary(obj.itinerary);
  if (!itinerary) return null;

  return { saved: obj.saved, itinerary };
}
