import L from 'leaflet';

type PinVariant = 'search' | 'saved' | 'user';

function makePin(variant: PinVariant, label?: string): L.DivIcon {
  const labelHtml = label
    ? `<span class="map-pin__label">${label}</span>`
    : '';
  return L.divIcon({
    className: `map-pin map-pin--${variant}`,
    html: `<span class="map-pin__teardrop">${labelHtml}</span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

export const SEARCH_PIN = makePin('search');
export const SAVED_PIN = makePin('saved');
export const USER_PIN = makePin('user');

const numberedPinCache = new Map<number, L.DivIcon>();

export function numberedPin(n: number): L.DivIcon {
  const cached = numberedPinCache.get(n);
  if (cached) return cached;
  const icon = makePin('search', String(n));
  numberedPinCache.set(n, icon);
  return icon;
}
