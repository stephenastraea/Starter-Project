export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEAL_SLOTS: readonly MealSlot[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
] as const;

export type LatLng = {
  lat: number;
  lng: number;
};

export type Place = {
  fsq_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  rating?: number;
  tipsCount?: number;
  googleUrl: string;
};

export type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied';

export type PanelTab = 'search' | 'saved' | 'itinerary';

export type Itinerary = Record<MealSlot, Place[]>;

export const EMPTY_ITINERARY: Itinerary = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
};

export type AppState = {
  center: LatLng | null;
  geolocationStatus: GeolocationStatus;
  query: string;
  results: Place[];
  searching: boolean;
  searchError: string | null;
  saved: Place[];
  itinerary: Itinerary;
  panelTab: PanelTab;
};

export const INITIAL_STATE: AppState = {
  center: null,
  geolocationStatus: 'idle',
  query: '',
  results: [],
  searching: false,
  searchError: null,
  saved: [],
  itinerary: EMPTY_ITINERARY,
  panelTab: 'search',
};
