import { useEffect, useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { PanelTab, Place } from '../types';
import { SearchTab } from './SearchTab';
import { SavedTab } from './SavedTab';
import { ItineraryTab } from './ItineraryTab';
import { AddToItineraryPopover } from './AddToItineraryPopover';

const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);
  return isMobile;
}

export function PanelShell() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [pendingForItinerary, setPendingForItinerary] = useState<Place | null>(null);

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'saved', label: `Saved (${state.saved.length})` },
    {
      id: 'itinerary',
      label: `Itinerary (${
        Object.values(state.itinerary).reduce((acc, arr) => acc + arr.length, 0)
      })`,
    },
  ];

  return (
    <div
      data-testid="panel-shell"
      className={`panel-shell ${isMobile ? 'panel-shell--mobile' : 'panel-shell--desktop'}`}
    >
      <div className="panel-shell__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={state.panelTab === t.id}
            className={`panel-shell__tab ${state.panelTab === t.id ? 'is-active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PANEL_TAB', tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="panel-shell__body">
        {state.panelTab === 'search' && (
          <SearchTab onAddToItinerary={setPendingForItinerary} />
        )}
        {state.panelTab === 'saved' && (
          <SavedTab onAddToItinerary={setPendingForItinerary} />
        )}
        {state.panelTab === 'itinerary' && <ItineraryTab />}
      </div>
      {pendingForItinerary && (
        <AddToItineraryPopover
          place={pendingForItinerary}
          onClose={() => setPendingForItinerary(null)}
        />
      )}
    </div>
  );
}
