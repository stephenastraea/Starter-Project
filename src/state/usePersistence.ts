import { useEffect, useRef } from 'react';
import { EMPTY_ITINERARY, MEAL_SLOTS, type Itinerary, type Place } from '../types';
import { useAppDispatch, useAppState } from './AppStateProvider';

const STORAGE_KEY = 'meal-planner:v1';

type Persisted = { saved: Place[]; itinerary: Itinerary };

function readFromStorage(): Persisted | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.saved)) return null;
    if (!obj.itinerary || typeof obj.itinerary !== 'object') return null;
    const itinerary: Itinerary = { ...EMPTY_ITINERARY };
    for (const slot of MEAL_SLOTS) {
      const arr = (obj.itinerary as Record<string, unknown>)[slot];
      if (Array.isArray(arr)) itinerary[slot] = arr as Place[];
    }
    return { saved: obj.saved as Place[], itinerary };
  } catch {
    return null;
  }
}

export function usePersistence(): void {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const hydratedRef = useRef(false);
  const writeFailedRef = useRef(false);

  // Hydrate once on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const persisted = readFromStorage();
    if (persisted) {
      dispatch({ type: 'HYDRATE', saved: persisted.saved, itinerary: persisted.itinerary });
    }
  }, [dispatch]);

  // Write on change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (writeFailedRef.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ saved: state.saved, itinerary: state.itinerary }),
      );
    } catch {
      writeFailedRef.current = true;
      console.warn('meal-planner: localStorage write failed; data will not persist.');
    }
  }, [state.saved, state.itinerary]);
}
