import { MealSlot } from './MealSlot';

export function ItineraryTab() {
  return (
    <div className="itinerary-tab">
      <MealSlot slot="breakfast" label="Breakfast" />
      <MealSlot slot="lunch" label="Lunch" />
      <MealSlot slot="dinner" label="Dinner" />
      <MealSlot slot="snacks" label="Snacks" />
    </div>
  );
}
