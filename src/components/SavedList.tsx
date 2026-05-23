import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import type { Place } from '../types';
import { useToast } from './Toast';
import { RestaurantCard } from './RestaurantCard';

export function SavedList({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  if (state.saved.length === 0) {
    return (
      <>
        <header className="section-header">
          <h2 className="section-header__title"><em>Saved spots</em></h2>
        </header>
        <div className="result-list result-list--empty">
          Search and tap Save to start your list.
        </div>
      </>
    );
  }

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  return (
    <>
      <header className="section-header">
        <h2 className="section-header__title"><em>Saved spots</em></h2>
        <span className="section-header__count">
          {state.saved.length} {state.saved.length === 1 ? 'place' : 'places'}
        </span>
      </header>
      <ul className="result-list">
        {state.saved.map((p) => (
          <RestaurantCard
            key={p.fsq_id}
            place={p}
            actions={
              <>
                <button onClick={() => onAddToItinerary(p)}>+ Itinerary</button>
                <button onClick={() => dispatch({ type: 'REMOVE_SAVED', placeId: p.fsq_id })}>
                  Remove
                </button>
                <button className="is-text" onClick={() => openGoogle(p)}>
                  Maps
                </button>
              </>
            }
          />
        ))}
      </ul>
    </>
  );
}
