import { useState } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { MEAL_SLOTS, type MealSlot as MealSlotName, type Place } from '../types';
import { useToast } from './Toast';

const LABELS: Record<MealSlotName, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function MealSlot({ slot, label }: { slot: MealSlotName; label: string }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const [moveTarget, setMoveTarget] = useState<Place | null>(null);

  const items = state.itinerary[slot];

  function openGoogle(p: Place) {
    const win = window.open(p.googleUrl, '_blank', 'noopener');
    if (!win) showToast(`Your browser blocked a new tab. Link: ${p.googleUrl}`);
  }

  const countLabel =
    items.length === 0
      ? 'empty'
      : `${items.length} ${items.length === 1 ? 'spot' : 'spots'}`;

  return (
    <div className="meal-slot">
      <div className="meal-slot__head">
        <h3 className="meal-slot__heading"><em>{label}</em></h3>
        <span className="meal-slot__count">{countLabel}</span>
      </div>
      {items.length === 0 && (
        <div className="meal-slot__empty">Add a saved spot here, or use + Itinerary from Search.</div>
      )}
      <ul className="meal-slot__list">
        {items.map((p, index) => (
          <li key={p.fsq_id} className="meal-slot__item">
            <span className="meal-slot__num" aria-hidden="true">{index + 1}</span>
            <div
              className="meal-slot__thumb"
              data-initial={p.photoUrl ? undefined : p.name.charAt(0)}
              style={p.photoUrl ? { backgroundImage: `url(${p.photoUrl})` } : undefined}
              aria-hidden="true"
            />
            <div className="meal-slot__info">
              <div data-testid="meal-slot-name" className="meal-slot__name">
                {p.name}
              </div>
              <div className="meal-slot__meta">{p.categories[0] ?? 'Restaurant'}</div>
            </div>
            <div className="meal-slot__actions">
              <button
                aria-label="Move up"
                disabled={index === 0}
                onClick={() =>
                  dispatch({
                    type: 'MOVE_IN_ITINERARY',
                    placeId: p.fsq_id,
                    slot,
                    direction: 'up',
                  })
                }
              >
                ↑
              </button>
              <button
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() =>
                  dispatch({
                    type: 'MOVE_IN_ITINERARY',
                    placeId: p.fsq_id,
                    slot,
                    direction: 'down',
                  })
                }
              >
                ↓
              </button>
              <button onClick={() => openGoogle(p)}>Maps</button>
              <button onClick={() => setMoveTarget(p)}>Move to…</button>
              <button
                onClick={() =>
                  dispatch({ type: 'REMOVE_FROM_ITINERARY', placeId: p.fsq_id, slot })
                }
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {moveTarget && (
        <div
          className="add-itinerary-overlay"
          role="dialog"
          aria-label={`Move ${moveTarget.name} to another slot`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoveTarget(null);
          }}
        >
          <div className="add-itinerary-popover">
            <div className="add-itinerary-popover__title">
              Move "<em>{moveTarget.name}</em>" to:
            </div>
            <div className="add-itinerary-popover__slots">
              {MEAL_SLOTS.filter((s) => s !== slot).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    dispatch({ type: 'ADD_TO_ITINERARY', place: moveTarget, slot: s });
                    setMoveTarget(null);
                  }}
                >
                  {LABELS[s]}
                </button>
              ))}
            </div>
            <button
              className="add-itinerary-popover__cancel"
              onClick={() => setMoveTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
