import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';
import { RestaurantCard } from './RestaurantCard';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) {
    return (
      <ul className="result-list" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="result-list__shimmer">
            <div className="result-list__shimmer-photo" />
            <div className="result-list__shimmer-body">
              <div className="result-list__shimmer-line result-list__shimmer-line--medium" />
              <div className="result-list__shimmer-line result-list__shimmer-line--short" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (state.searchError) {
    return <div className="result-list result-list--empty">{state.searchError}</div>;
  }
  if (state.results.length === 0 && state.query) {
    return (
      <div className="result-list result-list--empty">
        No spots matched. Try a wider term, or pan the map.
      </div>
    );
  }
  if (state.results.length === 0) {
    return <div className="result-list result-list--empty">Where are you eating?</div>;
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <ul className="result-list">
      {state.results.map((p) => {
        const isSaved = state.saved.some((s) => s.fsq_id === p.fsq_id);
        return (
          <RestaurantCard
            key={p.fsq_id}
            place={p}
            actions={
              <>
                <button
                  className="is-primary"
                  onClick={() => dispatch({ type: 'SAVE_PLACE', place: p })}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </>
            }
          />
        );
      })}
    </ul>
  );
}
