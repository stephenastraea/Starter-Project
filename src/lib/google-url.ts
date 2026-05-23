export function buildGoogleMapsUrl(name: string, address: string): string {
  const query = address.trim() ? `${name} ${address}` : name;
  const encoded = encodeURIComponent(query).replace(/'/g, '%27');
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
