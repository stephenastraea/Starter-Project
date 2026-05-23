import { useRef, type ReactNode } from 'react';
import type { Place } from '../types';
import { usePhoto } from './usePhoto';

export function RestaurantCard({
  place,
  actions,
}: {
  place: Place;
  actions: ReactNode;
}) {
  const photoRef = useRef<HTMLDivElement | null>(null);
  const photoUrl = usePhoto(place.fsq_id, {
    initialPhotoUrl: place.photoUrl,
    ref: photoRef,
  });

  return (
    <li className="result-list__item">
      <div
        ref={photoRef}
        className="result-list__photo"
        data-initial={photoUrl ? undefined : place.name.charAt(0)}
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
        aria-hidden="true"
      />
      <div className="result-list__body">
        <h3 className="result-list__name">{place.name}</h3>
        <p className="result-list__meta">{place.categories[0] ?? 'Restaurant'}</p>
        <div className="result-list__actions">{actions}</div>
      </div>
    </li>
  );
}
