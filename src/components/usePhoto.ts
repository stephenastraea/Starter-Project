import { useEffect, useRef, useState, type RefObject } from 'react';
import { fetchPhoto } from '../lib/api-client';

const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

export function __resetPhotoCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

type Options = {
  initialPhotoUrl?: string;
  ref?: RefObject<HTMLElement | null>;
};

export function usePhoto(
  fsqId: string | undefined,
  options: Options = {},
): string | null {
  const { initialPhotoUrl, ref } = options;
  const internalRef = useRef<HTMLElement | null>(null);
  const targetRef = ref ?? internalRef;
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (initialPhotoUrl) return initialPhotoUrl;
    if (fsqId && cache.has(fsqId)) return cache.get(fsqId) ?? null;
    return null;
  });

  useEffect(() => {
    if (!fsqId) return;
    if (initialPhotoUrl) return;
    if (cache.has(fsqId)) {
      Promise.resolve().then(() => setPhotoUrl(cache.get(fsqId) ?? null));
      return;
    }

    const target = targetRef.current;
    if (typeof IntersectionObserver === 'undefined' || !target) {
      // Fallback: fetch immediately if we can't observe.
      void load(fsqId).then((url) => setPhotoUrl(url));
      return;
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        observer.disconnect();
        void load(fsqId).then((url) => {
          if (!cancelled) setPhotoUrl(url);
        });
      },
      { rootMargin: '200px' },
    );
    observer.observe(target);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fsqId, initialPhotoUrl, targetRef]);

  return photoUrl;
}

async function load(fsqId: string): Promise<string | null> {
  if (cache.has(fsqId)) return cache.get(fsqId) ?? null;
  const existing = inFlight.get(fsqId);
  if (existing) return existing;
  const promise = fetchPhoto(fsqId).then((url) => {
    cache.set(fsqId, url);
    inFlight.delete(fsqId);
    return url;
  });
  inFlight.set(fsqId, promise);
  return promise;
}
