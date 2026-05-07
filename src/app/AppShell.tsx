import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';

import { BackToTopButton } from '@/app/BackToTopButton';
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
    icon: 'focus',
    id: 'focus',
    path: '/daily',
    title: 'Focus',
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
    icon: 'focus',
    id: 'focus-practice',
    path: '/settings/focus-practice',
    title: 'Focus & Practice',
    navTestId: 'nav-focus-practice',
    match: (pathname) => pathname === '/settings/focus-practice',
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

const BOTTOM_NAV_BACK_ICON = '←';
const FALLBACK_BACK_PATH = '/daily';
const IN_APP_HISTORY_LIMIT = 24;

const NAV_ICON_GLYPHS: Record<PageDefinition['icon'], string> = {
  focus: '☼',
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

function getRoutePath(location: { hash: string; pathname: string; search: string }) {
  return `${location.pathname}${location.search}${location.hash}`;
}

  function createNavLinkClickHandler(page: PageDefinition) {
    return (event: React.MouseEvent) => {
      const url = new URL(page.path, window.location.origin);
      const currentUrl = new URL(window.location.href);

      // If clicking a hash link on the same page, scroll to the element
      if (url.pathname === currentUrl.pathname && url.hash && url.hash !== currentUrl.hash) {
        event.preventDefault();
        const targetElement = document.querySelector(url.hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
  }

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const pwaUpdate = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot, getPwaUpdateSnapshot);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const inAppHistoryRef = useRef<string[]>([]);
  const wheelScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelSegmentRef = useRef<HTMLDivElement | null>(null);
  const currentRoutePath = getRoutePath(location);
  const handleNavLinkClick = createNavLinkClickHandler;
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
    const historyStack = inAppHistoryRef.current;
    const lastRoutePath = historyStack[historyStack.length - 1];

    if (lastRoutePath === currentRoutePath) {
      return;
    }

    if (navigationType === 'POP') {
      const existingIndex = historyStack.lastIndexOf(currentRoutePath);

      inAppHistoryRef.current = existingIndex >= 0 ? historyStack.slice(0, existingIndex + 1) : [currentRoutePath];
      return;
    }

    if (navigationType === 'REPLACE') {
      inAppHistoryRef.current = historyStack.length > 0 ? [...historyStack.slice(0, -1), currentRoutePath] : [currentRoutePath];
      return;
    }

    inAppHistoryRef.current = [...historyStack, currentRoutePath].slice(-IN_APP_HISTORY_LIMIT);
  }, [currentRoutePath, navigationType]);

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
  const bottomNavPages = useMemo(
    () => navGroups.core.filter((page) => page.id === 'focus' || page.id === 'read' || page.id === 'settings'),
    [navGroups.core],
  );

  // Scroll to element when hash changes (for in-page navigation like /library#read-doctrine)
  useEffect(() => {
    if (location.hash) {
      const targetElement = document.querySelector(location.hash);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.hash]);

  const handleBottomNavBack = () => {
    const historyStack = inAppHistoryRef.current;
    const previousRoutePath = historyStack.length > 1 ? historyStack[historyStack.length - 2] : null;

    if (previousRoutePath && previousRoutePath !== currentRoutePath) {
      void navigate(-1);
      return;
    }

    void navigate(FALLBACK_BACK_PATH, { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="brand-block">
          <p className="shell-kicker">Temple of the Jedi Order</p>
          <p className="shell-title">TOTJO Holocron</p>
          <p className="shell-subtitle">Practice daily, serve willingly, and let the Force guide you.</p>
        </div>
        <div className="shell-support">
          <div className="creator-support" aria-label="Creator links">
            <a
              aria-label="Open creator homepage at odinhalvorson.com"
              className="creator-link creator-link--home"
              data-testid="creator-home-link"
              href="https://odinhalvorson.com"
              rel="noreferrer"
              target="_blank"
            >
              <span className="creator-link__eyebrow">Creator home</span>
              <span className="creator-link__label">odinhalvorson.com</span>
            </a>
            <a
              aria-label="Support the creator on Ko-fi"
              className="creator-link creator-link--donate creator-donate-link"
              data-testid="creator-donate-link"
              href="https://ko-fi.com/indubitablyodin"
              rel="noreferrer"
              target="_blank"
            >
              <span className="creator-link__eyebrow">Support</span>
              <span className="creator-link__label">Ko-fi</span>
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

      <nav aria-label="Quick destinations" className="bottom-nav" data-testid="bottom-nav">
        <button className="bottom-nav__link bottom-nav__button" data-testid="bottom-nav-back" onClick={handleBottomNavBack} type="button">
          <span aria-hidden="true" className="bottom-nav__icon" data-icon={BOTTOM_NAV_BACK_ICON} />
          <span>Back</span>
        </button>
        {bottomNavPages.map((page) => {
          const isActive = page.match(location.pathname, location.hash);

          return (
            <Link
              className={`bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`}
              data-testid={`bottom-${page.navTestId}`}
              key={page.id}
              to={page.path}
            >
              <span aria-hidden="true" className="bottom-nav__icon" data-icon={NAV_ICON_GLYPHS[page.icon]} />
              <span>{page.title === 'Read' ? 'Library' : page.title}</span>
            </Link>
          );
        })}
      </nav>

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
                      onClick={handleNavLinkClick(page)}
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
                                  onClick={handleNavLinkClick(page)}
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
                                onClick={handleNavLinkClick(page)}
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
        <BackToTopButton />
      </div>
    </div>
  );
}
