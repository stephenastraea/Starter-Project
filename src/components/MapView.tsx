import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng, Place } from '../types';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { numberedPin, SAVED_PIN, SEARCH_PIN, USER_PIN } from './map-icons';
import { useToast } from './Toast';

function findItineraryNumber(
  itinerary: import('../types').Itinerary,
  fsqId: string,
): number | null {
  for (const slot of Object.keys(itinerary) as Array<keyof typeof itinerary>) {
    const idx = itinerary[slot].findIndex((p) => p.fsq_id === fsqId);
    if (idx >= 0) return idx + 1;
  }
  return null;
}

function ClickToPlace() {
  const dispatch = useAppDispatch();
  useMapEvents({
    click(e) {
      dispatch({ type: 'SET_CENTER', center: { lat: e.latlng.lat, lng: e.latlng.lng } });
    },
  });
  return null;
}

function FlyToCenter({ center }: { center: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], 13, { duration: 1.0 });
  }, [center, map]);
  return null;
}

function PlacePopup({ place }: { place: Place }) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const showToast = useToast();
  const isSaved = state.saved.some((p) => p.fsq_id === place.fsq_id);
  // The popup re-mounts on each click — read the freshest photoUrl from
  // search results / saved / itinerary if any branch has it.
  const photoUrl =
    place.photoUrl ??
    state.results.find((r) => r.fsq_id === place.fsq_id)?.photoUrl ??
    state.saved.find((r) => r.fsq_id === place.fsq_id)?.photoUrl ??
    null;

  const openGoogle = () => {
    const win = window.open(place.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${place.googleUrl}`);
  };

  return (
    <div className="pin-popup">
      {photoUrl && (
        <div
          className="pin-popup__photo"
          style={{ backgroundImage: `url(${photoUrl})` }}
          aria-hidden="true"
        />
      )}
      <h3 className="pin-popup__name">{place.name}</h3>
      <p className="pin-popup__meta">{place.categories[0] ?? 'Restaurant'}</p>
      <div className="pin-popup__actions">
        <button
          className="is-primary"
          onClick={() => dispatch({ type: 'SAVE_PLACE', place })}
        >
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button className="is-text" onClick={openGoogle}>Maps</button>
      </div>
    </div>
  );
}

export function MapView() {
  const state = useAppState();
  const defaultCenter: [number, number] = state.center
    ? [state.center.lat, state.center.lng]
    : [0, 0];
  const defaultZoom = state.center ? 13 : 2;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      minZoom={3}
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      maxBoundsViscosity={1}
      className="map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickToPlace />
      <FlyToCenter center={state.center} />

      {state.center && (
        <Marker position={[state.center.lat, state.center.lng]} icon={USER_PIN} />
      )}

      {state.results.map((place) => {
        const itineraryIndex = findItineraryNumber(state.itinerary, place.fsq_id);
        const isSaved = state.saved.some((s) => s.fsq_id === place.fsq_id);
        let icon = SEARCH_PIN;
        if (itineraryIndex !== null) icon = numberedPin(itineraryIndex);
        else if (isSaved) icon = SAVED_PIN;
        return (
          <Marker key={place.fsq_id} position={[place.lat, place.lng]} icon={icon}>
            <Popup>
              <PlacePopup place={place} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
