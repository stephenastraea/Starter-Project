import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealSlot } from './MealSlot';
import { AppStateProvider, useAppDispatch } from '../state/AppStateProvider';
import { ToastProvider } from './Toast';
import type { Place } from '../types';
import { useEffect } from 'react';

const placeA: Place = {
  fsq_id: 'a',
  name: 'A',
  address: '1 A St',
  lat: 0,
  lng: 0,
  categories: ['Food'],
  googleUrl: 'https://example.com/a',
};
const placeB: Place = { ...placeA, fsq_id: 'b', name: 'B' };

function Seed({ places }: { places: Place[] }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    for (const p of places) dispatch({ type: 'ADD_TO_ITINERARY', place: p, slot: 'lunch' });
  }, [dispatch, places]);
  return null;
}

function renderSlot(places: Place[]) {
  render(
    <AppStateProvider>
      <ToastProvider>
        <Seed places={places} />
        <MealSlot slot="lunch" label="Lunch" />
      </ToastProvider>
    </AppStateProvider>,
  );
}

describe('<MealSlot>', () => {
  it('renders the items added to the slot', () => {
    renderSlot([placeA, placeB]);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('removes an item when Remove is clicked', () => {
    renderSlot([placeA, placeB]);
    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i });
    fireEvent.click(removeButtons[0]); // remove A
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('swaps items when the down arrow is clicked', () => {
    renderSlot([placeA, placeB]);
    const downA = screen.getAllByLabelText('Move down')[0];
    fireEvent.click(downA);
    const names = screen.getAllByTestId('meal-slot-name').map((n) => n.textContent);
    expect(names).toEqual(['B', 'A']);
  });

  it('moving an item to another slot via the slot picker fires the right action', () => {
    renderSlot([placeA]);
    fireEvent.click(screen.getByRole('button', { name: /move to/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dinner$/i }));
    // After moving to dinner, lunch should be empty.
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
