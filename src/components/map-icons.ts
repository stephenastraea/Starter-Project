import L from 'leaflet';

function svgIcon(color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 24 32">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}" />
      <circle cx="12" cy="12" r="4.5" fill="#fff" />
    </svg>`;
  return L.divIcon({
    className: 'map-pin',
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -34],
  });
}

export const RED_PIN = svgIcon('#e53935');
export const BLUE_PIN = svgIcon('#1e88e5');
