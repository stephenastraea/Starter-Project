import type { Place } from '../types';
import { SavedList } from './SavedList';

export function SavedTab({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  return <SavedList onAddToItinerary={onAddToItinerary} />;
}
