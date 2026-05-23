import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';

const SAMPLE_PLACE = {
  fsq_id: 'fsq-1',
  name: 'Joe\'s Pizza',
  address: '7 Carmine St',
  lat: 40.73,
  lng: -74.0,
  categories: ['Pizza'],
  rating: 8.4,
  tipsCount: 27,
  googleUrl: 'https://www.google.com/maps/search/?api=1&query=Joe%27s%20Pizza%207%20Carmine%20St',
};

const mockGeolocation = {
  getCurrentPosition: vi.fn((success) =>
    success({ coords: { latitude: 40.73, longitude: -74.0 } } as GeolocationPosition),
  ),
};

beforeEach(() => {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: mockGeolocation,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/places')) {
        return new Response(JSON.stringify({ results: [SAMPLE_PLACE] }), { status: 200 });
      }
      if (url.includes('/api/geocode')) {
        return new Response(
          JSON.stringify({ lat: 40.73, lng: -74.0, displayName: 'NYC' }),
          { status: 200 },
        );
      }
      // Pass-through for OSM tiles — return 200 OK empty body.
      return new Response('', { status: 200 });
    }),
  );
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('full meal-planner flow', () => {
  it('search → save → itinerary → share URL round-trip', async () => {
    const { unmount } = render(<App />);

    // Wait for geolocation grant + initial render.
    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    // Type into search and wait for debounce.
    const searchInput = await screen.findByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(searchInput, { target: { value: 'pizza' } });

    // Result appears in result list.
    await waitFor(() => {
      expect(screen.getAllByText(/Joe's Pizza/i).length).toBeGreaterThan(0);
    });

    // Save the place.
    const saveBtn = screen.getAllByRole('button', { name: /save/i })[0];
    fireEvent.click(saveBtn);

    // Switch to Saved tab.
    fireEvent.click(screen.getByRole('tab', { name: /saved/i }));
    expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();

    // Add to itinerary (Dinner).
    fireEvent.click(screen.getByRole('button', { name: /\+ itinerary/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dinner$/i }));

    // Switch to Itinerary tab and confirm Dinner has the item.
    fireEvent.click(screen.getByRole('tab', { name: /itinerary/i }));
    expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();

    // Open Share dialog.
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
    const textarea = (await screen.findByLabelText(
      /share itinerary/i,
    )).querySelector('textarea') as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toContain('#s='));
    const shareUrl = textarea.value;

    unmount();

    // Now re-mount the app with the share URL as the location hash, and an empty localStorage.
    localStorage.clear();
    const hashIdx = shareUrl.indexOf('#');
    window.history.replaceState(null, '', shareUrl.slice(hashIdx));

    render(<App />);

    // The hydrated state should show the saved + itinerary entry.
    fireEvent.click(await screen.findByRole('tab', { name: /itinerary/i }));
    await waitFor(() => {
      expect(screen.getByText(/Joe's Pizza/i)).toBeInTheDocument();
    });
  });
});
