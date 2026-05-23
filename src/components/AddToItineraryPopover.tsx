import { useAppDispatch } from '../state/AppStateProvider';
import { MEAL_SLOTS, type MealSlot, type Place } from '../types';

const LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function AddToItineraryPopover({
  place,
  onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  return (
    <div
      className="add-itinerary-overlay"
      role="dialog"
      aria-label={`Add ${place.name} to itinerary`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-itinerary-popover">
        <div className="add-itinerary-popover__title">
          Add "<em>{place.name}</em>" to…
        </div>
        <div className="add-itinerary-popover__slots">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => {
                dispatch({ type: 'ADD_TO_ITINERARY', place, slot });
                onClose();
              }}
            >
              {LABELS[slot]}
            </button>
          ))}
        </div>
        <button className="add-itinerary-popover__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
