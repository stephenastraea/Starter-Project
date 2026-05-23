import { useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { geocode } from '../lib/api-client';
import { getUserLocation } from '../lib/geolocation';
import { useToast } from './Toast';

export function LocationBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await geocode(text.trim());
      dispatch({ type: 'SET_CENTER', center: { lat: result.lat, lng: result.lng } });
      dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Lookup failed';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function useMyLocation() {
    if (pending) return;
    setPending(true);
    setError(null);
    dispatch({ type: 'SET_GEO_STATUS', status: 'pending' });
    try {
      const loc = await getUserLocation();
      dispatch({ type: 'SET_CENTER', center: loc });
      dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
    } catch {
      dispatch({ type: 'SET_GEO_STATUS', status: 'denied' });
      showToast("Couldn't get your location. Enter an address above or click the map.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="location-bar">
      <form onSubmit={submitAddress}>
        <input
          type="text"
          placeholder="Enter a city or address"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
        />
        <button type="submit" disabled={pending || !text.trim()}>
          Go
        </button>
        <button type="button" onClick={useMyLocation} disabled={pending}>
          📍 Use my location
        </button>
      </form>
      {error && <div className="location-bar__error">{error}</div>}
      {state.geolocationStatus === 'denied' && (
        <div className="banner">
          We couldn't get your location. Enter an address above or click the map.
        </div>
      )}
    </div>
  );
}
