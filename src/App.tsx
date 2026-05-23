import { useEffect, useState } from 'react';
import './App.css';
import { AppStateProvider, useAppDispatch } from './state/AppStateProvider';
import { usePersistence } from './state/usePersistence';
import { useShareHydration } from './state/useShareHydration';
import { ToastProvider } from './components/Toast';
import { MapView } from './components/MapView';
import { PanelShell } from './components/PanelShell';
import { ShareDialog } from './components/ShareDialog';
import { getUserLocation } from './lib/geolocation';

function GeolocateOnMount() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'SET_GEO_STATUS', status: 'pending' });
      try {
        const loc = await getUserLocation();
        if (cancelled) return;
        dispatch({ type: 'SET_CENTER', center: loc });
        dispatch({ type: 'SET_GEO_STATUS', status: 'granted' });
      } catch {
        if (cancelled) return;
        dispatch({ type: 'SET_GEO_STATUS', status: 'denied' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
  return null;
}

function PersistenceMount() {
  usePersistence();
  return null;
}

function HydrateFromShareMount() {
  useShareHydration();
  return null;
}

function AppInner() {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="app">
      <HydrateFromShareMount />
      <PersistenceMount />
      <GeolocateOnMount />
      <MapView />
      <PanelShell />
      <button className="share-button" onClick={() => setShareOpen(true)}>
        Share
      </button>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AppStateProvider>
  );
}

export default App;
