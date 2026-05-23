import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function ResultList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.searching) return <div className="result-list result-list--empty">Searching…</div>;
  if (state.searchError) {
    return <div className="result-list result-list--empty">{state.searchError}</div>;
  }
  if (state.results.length === 0 && state.query) {
    return (
      <div className="result-list result-list--empty">
        No places matched. Try a wider term or move the map.
      </div>
    );
  }
  if (state.results.length === 0) {
    return <div className="result-list result-list--empty">Search for restaurants nearby.</div>;
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
            <div className="result-list__name">{p.name}</div>
            <div className="result-list__meta">
              {p.categories[0] ?? 'Restaurant'}
              {p.rating !== undefined && <> · ★ {p.rating.toFixed(1)}</>}
              {p.tipsCount !== undefined && <> · {p.tipsCount} tips</>}
            </div>
            <div className="result-list__actions">
              <button onClick={() => openGoogle(p)}>Google Maps</button>
              <button onClick={() => dispatch({ type: 'SAVE_PLACE', place: p })}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </button>
              <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
