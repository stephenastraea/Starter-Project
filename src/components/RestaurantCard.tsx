import type { ReactNode } from 'react';
import type { Place } from '../types';

export function RestaurantCard({
  place,
  actions,
}: {
  place: Place;
  actions: ReactNode;
}) {
  return (
    <li className="result-list__item">
      <div
        className="result-list__photo"
        data-initial={place.name.charAt(0)}
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
