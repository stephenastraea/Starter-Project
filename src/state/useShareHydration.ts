import { useEffect, useRef } from 'react';
import { decodeShareState } from '../lib/share-codec';
import { useAppDispatch } from './AppStateProvider';
import { useToast } from '../components/Toast';

const HASH_PREFIX = '#s=';

export function useShareHydration(): void {
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash.startsWith(HASH_PREFIX)) return;

    const payload = hash.slice(HASH_PREFIX.length);
    (async () => {
      const decoded = await decodeShareState(payload);
      if (decoded) {
        dispatch({ type: 'HYDRATE', saved: decoded.saved, itinerary: decoded.itinerary });
      } else {
        showToast('That share link looks broken. Showing your saved data instead.');
      }
      // Clean the hash from the URL so reloads don't re-trigger.
      if (typeof window !== 'undefined') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    })();
  }, [dispatch, showToast]);
}
