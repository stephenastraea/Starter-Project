import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { __resetPhotoCacheForTests, usePhoto } from './usePhoto';
import * as apiClient from '../lib/api-client';

class FakeIntersectionObserver {
  static lastInstance: FakeIntersectionObserver | null = null;
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    FakeIntersectionObserver.lastInstance = this;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting, target: document.createElement('div') } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function renderUsePhoto(fsqId: string | undefined, initialPhotoUrl?: string) {
  return renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(null);
    // Attach a real element so the observer has something to track.
    if (!ref.current) ref.current = document.createElement('div');
    const photoUrl = usePhoto(fsqId, { initialPhotoUrl, ref });
    return { photoUrl, ref };
  });
}

describe('usePhoto', () => {
  beforeEach(() => {
    __resetPhotoCacheForTests();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns the initial photoUrl immediately and does not fetch', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto');
    const { result } = renderUsePhoto('abc', 'https://existing.example/p.jpg');
    expect(result.current.photoUrl).toBe('https://existing.example/p.jpg');
    expect(spy).not.toHaveBeenCalled();
  });

  it('fetches once when the element intersects and returns the URL', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto').mockResolvedValue('https://fresh.example/p.jpg');
    const { result } = renderUsePhoto('abc');
    expect(result.current.photoUrl).toBeNull();

    FakeIntersectionObserver.lastInstance?.trigger(true);

    await waitFor(() => {
      expect(result.current.photoUrl).toBe('https://fresh.example/p.jpg');
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('abc');
  });

  it('returns the cached URL without refetching on a second hook for the same id', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto').mockResolvedValue('https://cached.example/p.jpg');
    const first = renderUsePhoto('abc');
    FakeIntersectionObserver.lastInstance?.trigger(true);
    await waitFor(() => expect(first.result.current.photoUrl).toBe('https://cached.example/p.jpg'));

    const second = renderUsePhoto('abc');
    expect(second.result.current.photoUrl).toBe('https://cached.example/p.jpg');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when fsqId is undefined', async () => {
    const spy = vi.spyOn(apiClient, 'fetchPhoto');
    const { result } = renderUsePhoto(undefined);
    FakeIntersectionObserver.lastInstance?.trigger(true);
    expect(result.current.photoUrl).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
