import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { applyPwaUpdate, dismissPwaUpdate, getPwaUpdateSnapshot, subscribePwaUpdate } from '@/app/pwaUpdate';

type PageDefinition = {
  group: 'core' | 'library' | 'settings';
  icon: string;
  id: string;
  path: string;
  title: string;
  navTestId: string;
  match: (pathname: string, hash: string) => boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const PRIMARY_PAGES: PageDefinition[] = [
  {
    group: 'core',
    icon: 'today',
    id: 'today',
    path: '/daily',
    title: 'Today',
    navTestId: 'nav-daily',
    match: (pathname) => pathname === '/daily',
  },
  {
    group: 'core',
    icon: 'read',
    id: 'read',
    path: '/library',
    title: 'Read',
    navTestId: 'nav-library',
    match: (pathname) => pathname.startsWith('/library'),
  },
  {
    group: 'core',
    icon: 'timer',
    id: 'timer',
    path: '/timer',
    title: 'Timer',
    navTestId: 'nav-timer',
    match: (pathname) => pathname === '/timer',
  },
  {
    group: 'core',
    icon: 'settings',
    id: 'settings',
    path: '/settings',
    title: 'Settings',
    navTestId: 'nav-settings',
    match: (pathname) => pathname.startsWith('/settings'),
  },
  {
    group: 'library',
    icon: 'doctrine',
    id: 'doctrine',
    path: '/library#read-doctrine',
    title: 'Doctrine',
    navTestId: 'nav-doctrine',
    match: (pathname, hash) => pathname.startsWith('/library/doctrine') || (pathname === '/library' && hash === '#read-doctrine'),
  },
  {
    group: 'library',
    icon: 'supplemental',
    id: 'supplemental',
    path: '/library#read-supplemental',
    title: 'Supplemental',
    navTestId: 'nav-supplemental',
    match: (pathname, hash) => pathname.startsWith('/library/supplemental') || (pathname === '/library' && hash === '#read-supplemental'),
  },
  {
    group: 'library',
    icon: 'sermons',
    id: 'sermons',
    path: '/library/sermons',
    title: 'Sermons',
    navTestId: 'nav-sermons',
    match: (pathname, hash) => pathname.startsWith('/library/sermons') || (pathname === '/library' && hash === '#read-sermons'),
  },
  {
    group: 'library',
    icon: 'bookmarks',
    id: 'bookmarks',
    path: '/library/bookmarks',
    title: 'Bookmarks',
    navTestId: 'nav-bookmarks',
    match: (pathname) => pathname === '/library/bookmarks',
  },
  {
    group: 'settings',
    icon: 'display',
    id: 'reading-display',
    path: '/settings/reading-display',
    title: 'Reading & Display',
    navTestId: 'nav-reading-display',
    match: (pathname) => pathname === '/settings/reading-display',
  },
  {
    group: 'settings',
    icon: 'timer-defaults',
    id: 'timer-defaults',
    path: '/settings/timer-defaults',
    title: 'Timer Defaults',
    navTestId: 'nav-timer-defaults',
    match: (pathname) => pathname === '/settings/timer-defaults',
  },
  {
    group: 'settings',
    icon: 'about',
    id: 'about-legal',
    path: '/settings/about-legal',
    title: 'About & Legal',
    navTestId: 'nav-about-legal',
    match: (pathname) => pathname === '/settings/about-legal',
  },
];

const NAV_GROUP_LABELS: Record<PageDefinition['group'], string> = {
  core: 'Core',
  library: 'Library',
  settings: 'Settings',
};

const NAV_ICON_GLYPHS: Record<PageDefinition['icon'], string> = {
  today: '☼',
  read: '✦',
  timer: '◴',
  settings: '⚙',
  doctrine: '✧',
  supplemental: '◈',
  sermons: '☰',
  bookmarks: '❋',
  display: '◫',
  'timer-defaults': '⏳',
  about: '◎',
  account: '⬢',
};

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const syncStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);

    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  return isOnline;
}

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const pwaUpdate = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot, getPwaUpdateSnapshot);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const wheelScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelSegmentRef = useRef<HTMLDivElement | null>(null);
  const navGroups = useMemo(
    () => ({
      core: PRIMARY_PAGES.filter((page) => page.group === 'core'),
      library: PRIMARY_PAGES.filter((page) => page.group === 'library'),
      settings: PRIMARY_PAGES.filter((page) => page.group === 'settings'),
    }),
    [],
  );
  const secondaryPages = useMemo(() => [...navGroups.library, ...navGroups.settings], [navGroups.library, navGroups.settings]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const clearPrompt = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', clearPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', clearPrompt);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = wheelScrollRef.current;
    const loopSegment = wheelSegmentRef.current;

    if (!scrollContainer || !loopSegment) {
      return;
    }

    const segmentHeight = loopSegment.offsetHeight;

    if (segmentHeight <= 0) {
      return;
    }

    scrollContainer.scrollTop = segmentHeight;

    const handleScroll = () => {
      const loopHeight = loopSegment.offsetHeight;

      if (loopHeight <= 0) {
        return;
      }

      if (scrollContainer.scrollTop < loopHeight * 0.25) {
        scrollContainer.scrollTop += loopHeight;
      } else if (scrollContainer.scrollTop > loopHeight * 1.75) {
        scrollContainer.scrollTop -= loopHeight;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [secondaryPages]);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const showUpdatePrompt = pwaUpdate.updateAvailable && !pwaUpdate.dismissed;

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="brand-block">
          <p className="shell-kicker">Temple of the Jedi Order</p>
          <p className="shell-title">TOTJO Holocron</p>
          <p className="shell-subtitle">Read the doctrine, keep a daily practice, and use the timer when you need it.</p>
        </div>
        <div className="shell-support">
          <div className="creator-support" aria-label="Creator links">
            <a className="creator-link" data-testid="creator-home-link" href="https://odinhalvorson.com" rel="noreferrer" target="_blank">
              odinhalvorson.com
            </a>
            <a className="creator-donate-link" data-testid="creator-donate-link" href="https://ko-fi.com/indubitablyodin" rel="noreferrer" target="_blank">
              Support on Ko-fi
            </a>
          </div>
          <button
            className="primary-button"
            data-testid="install-cta"
            hidden={!installPrompt}
            onClick={() => {
              void handleInstall();
            }}
            type="button"
          >
            Install on this device
          </button>
        </div>
      </header>

      <div className="shell-status-stack">
        <div className="offline-banner" data-testid="offline-banner" hidden={isOnline} role="status">
          You’re offline. Reading and settings still work with saved content.
        </div>
        {showUpdatePrompt ? (
          <div aria-live="polite" className="app-update-card" data-testid="app-update-prompt" role="status">
            <div className="app-update-card__copy">
              <p className="app-update-card__title">New version ready</p>
              <p className="app-update-card__description">A fresh Holocron is waiting. Apply it when you are ready; your local reading stays here.</p>
              {pwaUpdate.errorMessage ? (
                <p className="surface-error" data-testid="app-update-error">
                  {pwaUpdate.errorMessage}
                </p>
              ) : null}
            </div>
            <div className="app-update-card__actions">
              <button
                className="primary-button button-inline"
                data-testid="app-update-apply"
                disabled={pwaUpdate.isApplyingUpdate}
                onClick={() => {
                  void applyPwaUpdate();
                }}
                type="button"
              >
                {pwaUpdate.isApplyingUpdate ? 'Applying…' : 'Update now'}
              </button>
              <button
                className="secondary-button button-inline"
                data-testid="app-update-later"
                onClick={dismissPwaUpdate}
                type="button"
              >
                Later
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shell-layout">
        <nav aria-label="Primary" className="primary-nav" data-testid="primary-nav">
          <div className="primary-nav__list primary-nav__list--wheel">
            <section className="nav-wheel__core" key="core">
              <p className="nav-wheel__label">{NAV_GROUP_LABELS.core}</p>
              <div className="nav-wheel__items nav-wheel__items--core">
                {navGroups.core.map((page) => {
                  const isActive = page.match(location.pathname, location.hash);

                  return (
                    <Link
                      className={`nav-link nav-link--wheel nav-link--wheel-core${isActive ? ' nav-link--active' : ''}`}
                      data-testid={page.navTestId}
                      key={page.id}
                      to={page.path}
                    >
                      <span aria-hidden="true" className="nav-link__icon" data-icon={NAV_ICON_GLYPHS[page.icon]} />
                      <span className="nav-link__title">{page.title}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="nav-wheel__scroll" ref={wheelScrollRef}>
              <div className="nav-wheel__track">
                {[0, 1, 2].map((segmentIndex) => (
                  <div className="nav-wheel__segment" key={`wheel-segment-${segmentIndex}`} ref={segmentIndex === 1 ? wheelSegmentRef : undefined}>
                    {(['library', 'settings'] as const).map((groupKey) => (
                      <section className={`nav-wheel__section nav-wheel__section--${groupKey}`} key={`${segmentIndex}-${groupKey}`}>
                        <p className="nav-wheel__label">{NAV_GROUP_LABELS[groupKey]}</p>
                        <div className="nav-wheel__items">
                          {navGroups[groupKey].map((page) => {
                            const isActive = page.match(location.pathname, location.hash);

                            if (segmentIndex !== 1) {
                              return (
                                <Link
                                  aria-hidden="true"
                                  className={`nav-link nav-link--wheel nav-link--wheel-ghost${isActive ? ' nav-link--active' : ''}`}
                                  key={`${segmentIndex}-${page.id}`}
                                  tabIndex={-1}
                                  to={page.path}
                                >
                                  <span aria-hidden="true" className="nav-link__icon" data-icon={NAV_ICON_GLYPHS[page.icon]} />
                                  <span className="nav-link__title">{page.title}</span>
                                </Link>
                              );
                            }

                            return (
                              <Link
                                className={`nav-link nav-link--wheel${isActive ? ' nav-link--active' : ''}`}
                                data-testid={page.navTestId}
                                key={`${segmentIndex}-${page.id}`}
                                to={page.path}
                              >
                                <span aria-hidden="true" className="nav-link__icon" data-icon={NAV_ICON_GLYPHS[page.icon]} />
                                <span className="nav-link__title">{page.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <main className="shell-main" data-testid="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
