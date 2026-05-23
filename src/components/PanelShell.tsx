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

export function PanelShell({ onShareClick }: { onShareClick: () => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [pendingForItinerary, setPendingForItinerary] = useState<Place | null>(null);

  const itineraryCount = Object.values(state.itinerary).reduce((acc, arr) => acc + arr.length, 0);

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: 'search', label: 'Search' },
    { id: 'saved', label: 'Saved', count: state.saved.length },
    { id: 'itinerary', label: 'Itinerary', count: itineraryCount },
  ];

  return (
    <div
      data-testid="panel-shell"
      className={`panel-shell ${isMobile ? 'panel-shell--mobile' : 'panel-shell--desktop'}`}
    >
      <div className="panel-shell__header">
        <h1 className="panel-shell__trip-name">Your trip</h1>
        <button
          type="button"
          className="panel-shell__share"
          onClick={onShareClick}
        >
          Share
        </button>
      </div>
      <div className="panel-shell__tabs" role="tablist">
        {tabs.map((t) => {
          const accName = t.count !== undefined ? `${t.label} (${t.count})` : t.label;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={state.panelTab === t.id}
              aria-label={accName}
              className={`panel-shell__tab ${state.panelTab === t.id ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_PANEL_TAB', tab: t.id })}
            >
              <span className="panel-shell__tab-label">{t.label}</span>
              {t.count !== undefined && (
                <span className="panel-shell__tab-count"> · {t.count}</span>
              )}
            </button>
          );
        })}
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
