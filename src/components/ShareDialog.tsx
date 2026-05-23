import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppStateProvider';
import { encodeShareState } from '../lib/share-codec';
import { useToast } from './Toast';

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const showToast = useToast();
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const encoded = await encodeShareState({ saved: state.saved, itinerary: state.itinerary });
      if (cancelled) return;
      const base = `${window.location.origin}${window.location.pathname}`;
      setUrl(`${base}#s=${encoded}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, state.saved, state.itinerary]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied.');
    } catch {
      showToast('Could not copy automatically — select and copy the link.');
    }
  }

  return (
    <div
      className="add-itinerary-overlay"
      role="dialog"
      aria-label="Share itinerary"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-itinerary-popover">
        <div className="add-itinerary-popover__title"><em>Share your trip</em></div>
        <textarea readOnly value={url} className="share-dialog__url" rows={3} />
        <div className="add-itinerary-popover__slots">
          <button onClick={copy} className="is-primary">Copy link</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
