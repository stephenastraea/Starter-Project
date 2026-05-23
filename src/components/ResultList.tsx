import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) {
    return <div className="result-list result-list--empty">Looking nearby…</div>;
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
          <li key={p.fsq_id} className="result-list__item">
            <div className="result-list__photo" aria-hidden="true">
              {p.name.charAt(0)}
            </div>
            <div className="result-list__body">
              <h3 className="result-list__name">{p.name}</h3>
              <p className="result-list__meta">{p.categories[0] ?? 'Restaurant'}</p>
              <div className="result-list__actions">
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
