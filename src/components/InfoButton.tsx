import { useState } from 'react';

export function InfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="info-button"
        onClick={() => setOpen(true)}
        aria-label="How to use this app"
        title="How to use this app"
      >
        i
      </button>
      {open && (
        <div
          className="add-itinerary-overlay"
          role="dialog"
          aria-label="How to use this meal planner"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="info-dialog">
            <h2 className="info-dialog__title">How to use this meal planner</h2>
            <p className="info-dialog__intro">
              Plan vacation meals on an interactive map. Search for restaurants nearby,
              save the picks you like, organize them by meal slot, and share your plan
              with a link.
            </p>
            <ol className="info-dialog__list">
              <li>
                <strong>Set a location.</strong> Allow geolocation when prompted, type
                a city or address into the location bar, or click anywhere on the map
                to drop a center pin.
              </li>
              <li>
                <strong>Search restaurants.</strong> Type a cuisine or restaurant name
                (e.g. "tacos", "Shake Shack") in the search bar. Up to 20 distinct red
                pins appear within ~10 miles of your center; the same list lives in the
                Search tab.
              </li>
              <li>
                <strong>Explore.</strong> Click a pin to see details. Use
                <em> Open in Google Maps</em> from the popup to see real reviews and
                ratings.
              </li>
              <li>
                <strong>Save favorites.</strong> Click <em>☆ Save</em> on any pin or
                list item. Saved places show up in the <strong>Saved</strong> tab.
              </li>
              <li>
                <strong>Build an itinerary.</strong> Click <em>+ Itinerary</em> on any
                pin or saved item, then pick Breakfast, Lunch, Dinner, or Snacks. The
                <strong> Itinerary</strong> tab groups your day; reorder with ▲▼, move
                between slots, or remove.
              </li>
              <li>
                <strong>Share.</strong> Click <strong>Share</strong> (top-right) to copy
                a URL that encodes your saved list and itinerary. Opening that link in
                any browser loads the same plan.
              </li>
            </ol>
            <p className="info-dialog__note">
              Your data lives in this browser. Switching devices or clearing site data
              starts you over — use a Share link to move a plan between devices.
            </p>
            <button className="info-dialog__close" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
