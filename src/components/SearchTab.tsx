import { useCallback } from 'react';
import { useAppDispatch, useAppState } from '../state/AppStateProvider';
import { ApiError, fetchPlaces } from '../lib/api-client';
import { LocationBar } from './LocationBar';
import { SearchBar } from './SearchBar';
import { ResultList } from './ResultList';
import { useToast } from './Toast';
import type { Place } from '../types';

export function SearchTab({ onAddToItinerary }: { onAddToItinerary: (place: Place) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const showToast = useToast();

  const runSearch = useCallback(
    async (query: string) => {
      if (!state.center) {
        showToast('Set a location first (use the location bar above or click the map).');
        return;
      }
      dispatch({ type: 'SET_QUERY', query });
      dispatch({ type: 'SEARCH_START' });
      try {
        const results = await fetchPlaces({
          lat: state.center.lat,
          lng: state.center.lng,
          q: query,
        });
        dispatch({ type: 'SEARCH_SUCCESS', results });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          showToast('Searching a bit too fast — try again in a moment.');
        } else {
          showToast('Search failed. Please try again.');
        }
        dispatch({ type: 'SEARCH_ERROR', error: 'Search failed.' });
      }
    },
    [state.center, dispatch, showToast],
  );

  return (
    <div className="search-tab">
      <LocationBar />
      <SearchBar onSearch={runSearch} disabled={!state.center || state.searching} />
      <ResultList onAddToItinerary={onAddToItinerary} />
    </div>
  );
}
