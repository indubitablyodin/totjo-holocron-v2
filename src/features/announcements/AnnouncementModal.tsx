import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export type AnnouncementKind =
  | 'first-run'
  | 'community-update'
  | 'fundraiser'
  | 'release-note'
  | 'urgent';

export type AnnouncementPresentation =
  | 'none'
  | 'inline-banner'
  | 'dashboard-card'
  | 'modal';

type Announcement = {
  id: string;
  kind: AnnouncementKind;
  presentation: AnnouncementPresentation;
  title: string;
  body: string;
  ctaText: string;
  ctaLink: string;
};

const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'release-dashboard-2026-2',
  kind: 'release-note',
  presentation: 'inline-banner',
  title: 'Updated dashboard',
  body: 'The daily dashboard now includes an in-place meditation timer, a month calendar for your streak, and quick-lane cards for doctrine, sermons, and bookmarks.',
  ctaText: 'Open Library',
  ctaLink: '/library',
};

const STORAGE_KEY = 'holocron_dismissed_announcement';

export function AnnouncementModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const storage = window.localStorage as Partial<Storage> | undefined;
  const dismissedId = storage?.getItem?.(STORAGE_KEY);
  const isDismissed = dismissedId === CURRENT_ANNOUNCEMENT.id;

  useEffect(() => {
    if (!isDismissed) {
      setShowBadge(true);
    }
  }, [isDismissed]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  });

  const handleDismiss = useCallback(() => {
    storage?.setItem?.(STORAGE_KEY, CURRENT_ANNOUNCEMENT.id);
    setIsVisible(false);
    setShowBadge(false);
  }, [storage]);

  const handleBadgeClick = useCallback(() => {
    setIsVisible(true);
  }, []);

  if (isVisible) {
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
            ref={closeRef}
            type="button"
          >
            &times;
          </button>

          <div className="announcement-content">
            <span className="announcement-kind">{CURRENT_ANNOUNCEMENT.kind.replace('-', ' ')}</span>
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
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showBadge) {
    return (
      <button
        className="announcement-badge"
        aria-label="Show announcement"
        data-testid="announcement-badge"
        onClick={handleBadgeClick}
        type="button"
      >
        <span aria-hidden="true">&#9432;</span>
      </button>
    );
  }

  return null;
}
