import { useEffect, useRef, type ReactNode } from 'react';
import type { Place } from '../types';
import { usePhoto } from './usePhoto';
import { useAppDispatch } from '../state/AppStateProvider';

export function RestaurantCard({
  place,
  actions,
}: {
  place: Place;
  actions: ReactNode;
}) {
  const photoRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const photoUrl = usePhoto(place.fsq_id, {
    initialPhotoUrl: place.photoUrl,
    ref: photoRef,
  });

  useEffect(() => {
    if (photoUrl && !place.photoUrl) {
      dispatch({ type: 'SET_PLACE_PHOTO', placeId: place.fsq_id, photoUrl });
    }
  }, [photoUrl, place.photoUrl, place.fsq_id, dispatch]);

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
