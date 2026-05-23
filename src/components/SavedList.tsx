import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';

export function SavedList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.saved.length === 0) {
    return (
      <div className="result-list result-list--empty">
        Save places from search to build your list.
      </div>
    );
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <ul className="result-list">
      {state.saved.map((p) => (
        <li key={p.fsq_id} className="result-list__item">
          <div className="result-list__name">{p.name}</div>
          <div className="result-list__meta">
            {p.categories[0] ?? 'Restaurant'}
            {p.rating !== undefined && <> · ★ {p.rating.toFixed(1)}</>}
            {p.tipsCount !== undefined && <> · {p.tipsCount} tips</>}
          </div>
          <div className="result-list__actions">
            <button onClick={() => openGoogle(p)}>Google Maps</button>
            <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
            <button onClick={() => dispatch({ type: 'REMOVE_SAVED', placeId: p.fsq_id })}>
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
