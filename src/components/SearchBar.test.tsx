import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('<SearchBar>', () => {
  const onSearch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onSearch.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onSearch once for fast typing after the debounce window', () => {
    render(<SearchBar onSearch={onSearch} disabled={false} />);
    const input = screen.getByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(input, { target: { value: 'p' } });
    fireEvent.change(input, { target: { value: 'pi' } });
    fireEvent.change(input, { target: { value: 'piz' } });
    fireEvent.change(input, { target: { value: 'pizz' } });
    fireEvent.change(input, { target: { value: 'pizza' } });

    expect(onSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('pizza');
  });

  it('does not fire onSearch for an empty query', () => {
    render(<SearchBar onSearch={onSearch} disabled={false} />);
    const input = screen.getByPlaceholderText(/restaurant or cuisine/i);
    fireEvent.change(input, { target: { value: 'pizza' } });
    fireEvent.change(input, { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onSearch).not.toHaveBeenCalled();
  });
});
