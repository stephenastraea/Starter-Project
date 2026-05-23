import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng, Place } from '../types';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { BLUE_PIN, RED_PIN } from './map-icons';
import { useToast } from './Toast';

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

  const openGoogle = () => {
    const win = window.open(place.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${place.googleUrl}`);
  };

  return (
    <div className="pin-popup">
      <div className="pin-popup__name">{place.name}</div>
      <div className="pin-popup__meta">
        {place.categories[0] ?? 'Restaurant'}
        {place.rating !== undefined && (
          <>
            {' · '}
            <span title="Foursquare rating">★ {place.rating.toFixed(1)}</span>
          </>
        )}
        {place.tipsCount !== undefined && (
          <>
            {' · '}
            <span title="Foursquare tips count">{place.tipsCount} tips</span>
          </>
        )}
      </div>
      <div className="pin-popup__actions">
        <button onClick={openGoogle}>Open in Google Maps</button>
        <button onClick={() => dispatch({ type: 'SAVE_PLACE', place })}>
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
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
        <Marker position={[state.center.lat, state.center.lng]} icon={BLUE_PIN} />
      )}

      {state.results.map((place) => (
        <Marker key={place.fsq_id} position={[place.lat, place.lng]} icon={RED_PIN}>
          <Popup>
            <PlacePopup place={place} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
