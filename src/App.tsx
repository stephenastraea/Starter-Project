import { useEffect } from 'react';
import './App.css';
import { AppStateProvider, useAppDispatch } from './state/AppStateProvider';
import { usePersistence } from './state/usePersistence';
import { ToastProvider } from './components/Toast';
import { MapView } from './components/MapView';
import { PanelShell } from './components/PanelShell';
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

function AppInner() {
  return (
    <div className="app">
      <GeolocateOnMount />
      <PersistenceMount />
      <MapView />
      <PanelShell />
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
