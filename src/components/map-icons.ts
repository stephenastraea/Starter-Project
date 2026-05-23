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

export function numberedPin(n: number): L.DivIcon {
  return makePin('search', String(n));
}

// Kept for backwards compatibility with imports during migration; remove
// after MapView is updated.
export const RED_PIN = SEARCH_PIN;
export const BLUE_PIN = USER_PIN;
