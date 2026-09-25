import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { BUNDLED_ANNOUNCEMENTS } from './announcementRegistry';
import {
  getVisibleAnnouncements,
  selectPrimaryAnnouncement,
  type Announcement,
  type DismissedMap,
} from './announcementTypes';
import { loadDismissedAnnouncements, dismissAnnouncement } from './announcementDismissal';
import { setAnnouncementAppBadge, clearAnnouncementAppBadge } from './appBadge';
import { parseRemoteAnnouncementFeed, mergeAnnouncements } from './remoteAnnouncements';
import { loadCachedRemoteAnnouncements, cacheRemoteAnnouncements } from './remoteAnnouncementCache';
import { fetchRuntimeConfig, resolveAnnouncementsFeedUrl } from '@/config/runtimeConfig';

const KIND_LABELS: Record<string, string> = {
  totjo: 'TOTJO',
  sermon: 'Sermon',
  doctrine: 'Doctrine',
  event: 'Event',
  app: 'App update',
  practice: 'Practice',
  support: 'Support',
};

export function AnnouncementModal() {
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
  const [remoteAnnouncements, setRemoteAnnouncements] = useState<Announcement[]>(() => loadCachedRemoteAnnouncements());
  const [dismissedMap, setDismissedMap] = useState<DismissedMap>(() => loadDismissedAnnouncements());
  const closeRef = useRef<HTMLButtonElement>(null);
  const announcementCardRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);

  const allAnnouncements = useMemo(
    () => mergeAnnouncements(BUNDLED_ANNOUNCEMENTS, remoteAnnouncements),
    [remoteAnnouncements],
  );

  const visible = useMemo(
    () => getVisibleAnnouncements(allAnnouncements, dismissedMap, now),
    [allAnnouncements, dismissedMap, now],
  );

  const primary = useMemo(() => selectPrimaryAnnouncement(visible), [visible]);

  useEffect(() => {
    if (visible.length > 0) {
      setAnnouncementAppBadge(visible.length);
    } else {
      clearAnnouncementAppBadge();
    }
  }, [visible]);

  // Fetch remote announcements in background
  useEffect(() => {
    const doFetch = async () => {
      try {
        const runtimeConfig = await fetchRuntimeConfig();
        const resolved = resolveAnnouncementsFeedUrl(runtimeConfig);

        const response = await fetch(resolved.url, { cache: 'no-store' });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const parsed = parseRemoteAnnouncementFeed(data);

        if (!parsed) {
          return;
        }

        cacheRemoteAnnouncements(parsed.updatedAt, parsed.announcements);
        setRemoteAnnouncements(parsed.announcements);
      } catch {
        // Fetch failure is silent — keep bundled + cached announcements.
      }
    };

    void doFetch();
  }, []);

  const handleDismiss = useCallback((announcement: Announcement) => {
    dismissAnnouncement(announcement.id, announcement.version);
    setDismissedMap((current) => ({
      ...current,
      [announcement.id]: { version: announcement.version, dismissedAt: new Date().toISOString() },
    }));
    setModalAnnouncement(null);
  }, []);

  const handleBadgeClick = useCallback(() => {
    if (primary) {
      setModalAnnouncement(primary);
    }
  }, [primary]);

  useEffect(() => {
    if (!modalAnnouncement) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss(modalAnnouncement);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        announcementCardRef.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [handleDismiss, modalAnnouncement]);

  // Show modal for high/urgent announcements automatically
  useEffect(() => {
    if (primary && (primary.priority === 'high' || primary.priority === 'urgent') && !modalAnnouncement) {
      const timeoutId = window.setTimeout(() => {
        setModalAnnouncement(primary);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [primary, modalAnnouncement]);

  if (modalAnnouncement) {
    const a = modalAnnouncement;

    return (
      <div
        className="announcement-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        onClick={() => {
          if (a.dismissible) {
            handleDismiss(a);
          }
        }}
      >
        <div
          className="announcement-card"
          onClick={(event) => {
            event.stopPropagation();
          }}
          ref={announcementCardRef}
        >
          <button
            className="announcement-close"
            aria-label="Close announcement"
            onClick={() => {
              handleDismiss(a);
            }}
            ref={closeRef}
            type="button"
          >
            &times;
          </button>

          <div className="announcement-content">
            <span className="announcement-kind">{KIND_LABELS[a.kind] ?? a.kind}</span>
            <h2 id="announcement-title">{a.title}</h2>
            <p>{a.body}</p>

            {a.action ? (
              <div className="announcement-actions">
                {a.action.external ? (
                  <a
                    className="primary-button button-inline"
                    href={a.action.href}
                    onClick={() => {
                      if (a.dismissible) {
                        handleDismiss(a);
                      }
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {a.action.label}
                  </a>
                ) : (
                  <Link
                    className="primary-button button-inline"
                    onClick={() => {
                      if (a.dismissible) {
                        handleDismiss(a);
                      }
                    }}
                    to={a.action.href}
                  >
                    {a.action.label}
                  </Link>
                )}
                {a.dismissible ? (
                  <button
                    className="secondary-button button-inline"
                    onClick={() => {
                      handleDismiss(a);
                    }}
                    type="button"
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            ) : null}

            {!a.action && a.dismissible ? (
              <div className="announcement-actions">
                <button
                  className="primary-button button-inline"
                  onClick={() => {
                    handleDismiss(a);
                  }}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (visible.length > 0) {
    return (
      <button
        className="announcement-badge"
        aria-label={`${visible.length} announcement${visible.length === 1 ? '' : 's'}`}
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
