import { describe, it, expect } from 'vitest';
import { reducer, type Action } from './reducer';
import { INITIAL_STATE, EMPTY_ITINERARY, type Place, type AppState } from '../types';

function placeFactory(id: string, name = `Place ${id}`): Place {
  return {
    fsq_id: id,
    name,
    address: '1 Test St',
    lat: 40,
    lng: -74,
    categories: ['Test'],
    googleUrl: `https://example.com/${id}`,
  };
}

function dispatch(state: AppState, action: Action): AppState {
  return reducer(state, action);
}

describe('reducer', () => {
  it('SET_CENTER updates center and clears results', () => {
    const state = { ...INITIAL_STATE, results: [placeFactory('1')] };
    const next = dispatch(state, { type: 'SET_CENTER', center: { lat: 1, lng: 2 } });
    expect(next.center).toEqual({ lat: 1, lng: 2 });
    expect(next.results).toEqual([]);
  });

  it('SEARCH_START sets searching and clears prior error', () => {
    const state = { ...INITIAL_STATE, searchError: 'old' };
    const next = dispatch(state, { type: 'SEARCH_START' });
    expect(next.searching).toBe(true);
    expect(next.searchError).toBeNull();
  });

  it('SEARCH_SUCCESS replaces results and unsets searching', () => {
    const results = [placeFactory('1'), placeFactory('2')];
    const next = dispatch({ ...INITIAL_STATE, searching: true }, { type: 'SEARCH_SUCCESS', results });
    expect(next.results).toEqual(results);
    expect(next.searching).toBe(false);
  });

  it('SAVE_PLACE adds a place; second SAVE_PLACE removes it (toggle)', () => {
    const p = placeFactory('1');
    const added = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    expect(added.saved).toEqual([p]);
    const removed = dispatch(added, { type: 'SAVE_PLACE', place: p });
    expect(removed.saved).toEqual([]);
  });

  it('SAVE_PLACE dedupes by fsq_id', () => {
    const p1 = placeFactory('1');
    const p1Renamed = { ...p1, name: 'Updated' };
    const state = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p1 });
    const next = dispatch(state, { type: 'SAVE_PLACE', place: p1Renamed });
    // Toggle: same fsq_id means it un-saves.
    expect(next.saved).toEqual([]);
  });

  it('ADD_TO_ITINERARY appends to a slot', () => {
    const p = placeFactory('1');
    const next = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    expect(next.itinerary.lunch).toEqual([p]);
    expect(next.itinerary.breakfast).toEqual([]);
  });

  it('ADD_TO_ITINERARY moves a place from one slot to another instead of duplicating', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'dinner' });
    expect(s2.itinerary.lunch).toEqual([]);
    expect(s2.itinerary.dinner).toEqual([p]);
  });

  it('REMOVE_FROM_ITINERARY removes a place from a slot but leaves saved alone', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    const s3 = dispatch(s2, { type: 'REMOVE_FROM_ITINERARY', placeId: 'fsq-x', slot: 'lunch' });
    // wrong id: nothing changes
    expect(s3.itinerary.lunch).toEqual([p]);
    const s4 = dispatch(s3, { type: 'REMOVE_FROM_ITINERARY', placeId: p.fsq_id, slot: 'lunch' });
    expect(s4.itinerary.lunch).toEqual([]);
    expect(s4.saved).toEqual([p]);
  });

  it('REMOVE_SAVED leaves itinerary intact', () => {
    const p = placeFactory('1');
    const s1 = dispatch(INITIAL_STATE, { type: 'SAVE_PLACE', place: p });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: p, slot: 'dinner' });
    const s3 = dispatch(s2, { type: 'REMOVE_SAVED', placeId: p.fsq_id });
    expect(s3.saved).toEqual([]);
    expect(s3.itinerary.dinner).toEqual([p]);
  });

  it('MOVE_IN_ITINERARY swaps adjacent items', () => {
    const a = placeFactory('1');
    const b = placeFactory('2');
    const c = placeFactory('3');
    let s = INITIAL_STATE;
    for (const p of [a, b, c]) {
      s = dispatch(s, { type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
    }
    const moved = dispatch(s, { type: 'MOVE_IN_ITINERARY', placeId: b.fsq_id, slot: 'lunch', direction: 'up' });
    expect(moved.itinerary.lunch.map((x) => x.fsq_id)).toEqual(['2', '1', '3']);
  });

  it('MOVE_IN_ITINERARY is a no-op at the boundary', () => {
    const a = placeFactory('1');
    const b = placeFactory('2');
    const s1 = dispatch(INITIAL_STATE, { type: 'ADD_TO_ITINERARY', place: a, slot: 'lunch' });
    const s2 = dispatch(s1, { type: 'ADD_TO_ITINERARY', place: b, slot: 'lunch' });
    const s3 = dispatch(s2, { type: 'MOVE_IN_ITINERARY', placeId: a.fsq_id, slot: 'lunch', direction: 'up' });
    expect(s3.itinerary.lunch.map((x) => x.fsq_id)).toEqual(['1', '2']);
  });

  it('HYDRATE replaces saved and itinerary only', () => {
    const p = placeFactory('1');
    const state = { ...INITIAL_STATE, query: 'pre-existing', results: [placeFactory('2')] };
    const next = dispatch(state, {
      type: 'HYDRATE',
      saved: [p],
      itinerary: { ...EMPTY_ITINERARY, dinner: [p] },
    });
    expect(next.saved).toEqual([p]);
    expect(next.itinerary.dinner).toEqual([p]);
    // Non-persistent fields untouched
    expect(next.query).toBe('pre-existing');
    expect(next.results).toEqual([placeFactory('2')]);
  });
});
