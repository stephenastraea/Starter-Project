import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelShell } from './PanelShell';
import { AppStateProvider } from '../state/AppStateProvider';
import { ToastProvider } from './Toast';

function setMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderShell() {
  render(
    <AppStateProvider>
      <ToastProvider>
        <PanelShell onShareClick={() => {}} />
      </ToastProvider>
    </AppStateProvider>,
  );
}

describe('<PanelShell>', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders Search/Saved/Itinerary tabs', () => {
    setMatchMedia(false);
    renderShell();
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /saved/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /itinerary/i })).toBeInTheDocument();
  });

  it('uses the desktop class above the breakpoint', () => {
    setMatchMedia(false); // not mobile
    renderShell();
    const shell = screen.getByTestId('panel-shell');
    expect(shell.className).toContain('panel-shell--desktop');
  });

  it('uses the mobile class below the breakpoint', () => {
    setMatchMedia(true); // mobile
    renderShell();
    const shell = screen.getByTestId('panel-shell');
    expect(shell.className).toContain('panel-shell--mobile');
  });
});
