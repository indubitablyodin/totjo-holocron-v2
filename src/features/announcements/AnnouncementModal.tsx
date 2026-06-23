import { useState } from 'react';
import { Link } from 'react-router-dom';

type Announcement = {
  id: string;
  title: string;
  body: string;
  ctaText: string;
  ctaLink: string;
};

const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'welcome-dashboard-2026',
  title: 'A renewed Holocron',
  body: 'The dashboard has been rebuilt with a clearer focus: meditation first, then your library, sermons, and practice. Everything scales with your preferences.',
  ctaText: 'Explore the library',
  ctaLink: '/library',
};

const STORAGE_KEY = 'holocron_dismissed_announcement';

export function AnnouncementModal() {
  const [isVisible, setIsVisible] = useState(false);

  const storage = window.localStorage as Partial<Storage> | undefined;
  const dismissedId = storage?.getItem?.(STORAGE_KEY);
  const isDismissed = dismissedId === CURRENT_ANNOUNCEMENT.id;

  if (!isVisible) {
    if (isDismissed) {
      return null;
    }

    return (
      <button
        className="announcement-badge"
        aria-label="Show announcement"
        data-testid="announcement-badge"
        onClick={() => {
          setIsVisible(true);
        }}
        type="button"
      >
        <span aria-hidden="true">&#9432;</span>
      </button>
    );
  }

  const handleDismiss = () => {
    storage?.setItem?.(STORAGE_KEY, CURRENT_ANNOUNCEMENT.id);
    setIsVisible(false);
  };

  return (
    <div
      className="announcement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      onClick={handleDismiss}
    >
      <div
        className="announcement-card"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          className="announcement-close"
          aria-label="Close announcement"
          onClick={handleDismiss}
          type="button"
        >
          &times;
        </button>

        <div className="announcement-content">
          <h2 id="announcement-title">{CURRENT_ANNOUNCEMENT.title}</h2>
          <p>{CURRENT_ANNOUNCEMENT.body}</p>

          <div className="announcement-actions">
            <Link
              className="primary-button button-inline"
              onClick={handleDismiss}
              to={CURRENT_ANNOUNCEMENT.ctaLink}
            >
              {CURRENT_ANNOUNCEMENT.ctaText}
            </Link>
            <button
              className="secondary-button button-inline"
              onClick={handleDismiss}
              type="button"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
