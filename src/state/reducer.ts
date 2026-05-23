import {
  EMPTY_ITINERARY,
  MEAL_SLOTS,
  type AppState,
  type Itinerary,
  type LatLng,
  type MealSlot,
  type Place,
  type PanelTab,
} from '../types';

export type Action =
  | { type: 'SET_CENTER'; center: LatLng }
  | { type: 'SET_GEO_STATUS'; status: AppState['geolocationStatus'] }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; results: Place[] }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'SAVE_PLACE'; place: Place }
  | { type: 'REMOVE_SAVED'; placeId: string }
  | { type: 'ADD_TO_ITINERARY'; place: Place; slot: MealSlot }
  | { type: 'REMOVE_FROM_ITINERARY'; placeId: string; slot: MealSlot }
  | { type: 'MOVE_IN_ITINERARY'; placeId: string; slot: MealSlot; direction: 'up' | 'down' }
  | { type: 'SET_PANEL_TAB'; tab: PanelTab }
  | { type: 'HYDRATE'; saved: Place[]; itinerary: Itinerary };

function removeFromAllSlots(itinerary: Itinerary, placeId: string): Itinerary {
  const next: Itinerary = { ...EMPTY_ITINERARY };
  for (const slot of MEAL_SLOTS) {
    next[slot] = itinerary[slot].filter((p) => p.fsq_id !== placeId);
  }
  return next;
}

function move<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= arr.length) return arr;
  const next = arr.slice();
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return next;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CENTER':
      return { ...state, center: action.center, results: [] };

    case 'SET_GEO_STATUS':
      return { ...state, geolocationStatus: action.status };

    case 'SET_QUERY':
      return { ...state, query: action.query };

    case 'SEARCH_START':
      return { ...state, searching: true, searchError: null };

    case 'SEARCH_SUCCESS':
      return { ...state, searching: false, results: action.results, searchError: null };

    case 'SEARCH_ERROR':
      return { ...state, searching: false, searchError: action.error };

    case 'SAVE_PLACE': {
      const already = state.saved.some((p) => p.fsq_id === action.place.fsq_id);
      const saved = already
        ? state.saved.filter((p) => p.fsq_id !== action.place.fsq_id)
        : [...state.saved, action.place];
      return { ...state, saved };
    }

    case 'REMOVE_SAVED':
      return { ...state, saved: state.saved.filter((p) => p.fsq_id !== action.placeId) };

    case 'ADD_TO_ITINERARY': {
      const cleared = removeFromAllSlots(state.itinerary, action.place.fsq_id);
      return {
        ...state,
        itinerary: { ...cleared, [action.slot]: [...cleared[action.slot], action.place] },
      };
    }

    case 'REMOVE_FROM_ITINERARY':
      return {
        ...state,
        itinerary: {
          ...state.itinerary,
          [action.slot]: state.itinerary[action.slot].filter((p) => p.fsq_id !== action.placeId),
        },
      };

    case 'MOVE_IN_ITINERARY': {
      const slot = state.itinerary[action.slot];
      const idx = slot.findIndex((p) => p.fsq_id === action.placeId);
      if (idx === -1) return state;
      return {
        ...state,
        itinerary: { ...state.itinerary, [action.slot]: move(slot, idx, action.direction) },
      };
    }

    case 'SET_PANEL_TAB':
      return { ...state, panelTab: action.tab };

    case 'HYDRATE':
      return { ...state, saved: action.saved, itinerary: action.itinerary };

    default:
      return state;
  }
}
