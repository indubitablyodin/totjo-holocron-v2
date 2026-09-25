import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';

import { AnnouncementModal } from '@/features/announcements/AnnouncementModal';
import { TotjoBrandMark } from '@/app/TotjoBrandMark';
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
    icon: 'supplemental',
    id: 'my-documents',
    path: '/library/mydocs',
    title: 'My documents',
    navTestId: 'nav-my-documents',
    match: (pathname) => pathname.startsWith('/library/mydocs'),
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

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const pwaUpdate = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot, getPwaUpdateSnapshot);
  const inAppHistoryRef = useRef<string[]>([]);
  const [hasInAppHistory, setHasInAppHistory] = useState(false);
  const bottomNavRef = useRef<HTMLElement | null>(null);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const navGroups = useMemo(
    () => ({
      core: PRIMARY_PAGES.filter((page) => page.group === 'core'),
      library: PRIMARY_PAGES.filter((page) => page.group === 'library'),
      settings: PRIMARY_PAGES.filter((page) => page.group === 'settings'),
    }),
    [],
  );

  useEffect(() => {
    const historyStack = inAppHistoryRef.current;
    const lastRoutePath = historyStack[historyStack.length - 1];
    const commitHistory = (nextHistoryStack: string[]) => {
      inAppHistoryRef.current = nextHistoryStack;
      setHasInAppHistory(nextHistoryStack.length > 1 && nextHistoryStack[nextHistoryStack.length - 2] !== currentPath);
    };

    if (lastRoutePath === currentPath) {
      setHasInAppHistory(historyStack.length > 1 && historyStack[historyStack.length - 2] !== currentPath);
      return;
    }

    if (navigationType === 'POP') {
      const existingIndex = historyStack.lastIndexOf(currentPath);

      commitHistory(existingIndex >= 0 ? historyStack.slice(0, existingIndex + 1) : [currentPath]);
      return;
    }

    if (navigationType === 'REPLACE') {
      commitHistory(historyStack.length > 0 ? [...historyStack.slice(0, -1), currentPath] : [currentPath]);
      return;
    }

    commitHistory([...historyStack, currentPath].slice(-IN_APP_HISTORY_LIMIT));
  }, [currentPath, navigationType]);

  useEffect(() => {
    if (location.hash) {
      const targetElement = document.querySelector(location.hash);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.hash]);

  useEffect(() => {
    const nav = bottomNavRef.current;
    const shell = appShellRef.current;

    if (!nav) {
      return;
    }

    const updateFade = () => {
      const canScrollLeft = nav.scrollLeft > 1;
      const canScrollRight = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1;

      nav.style.setProperty('--bottom-nav-fade-start', canScrollLeft ? '1.5rem' : '0px');
      nav.style.setProperty('--bottom-nav-fade-end', canScrollRight ? '1.5rem' : '0px');
    };

    const updateNavMetrics = () => {
      updateFade();

      const navHeight = nav.getBoundingClientRect().height;
      const navIsVisible = getComputedStyle(nav).display !== 'none' && navHeight > 0;

      if (!navIsVisible) {
        document.documentElement.style.removeProperty('--shell-bottom-nav-clearance');
        shell?.style.removeProperty('--shell-bottom-nav-clearance');
        return;
      }

      const clearance = Math.max(0, window.innerHeight - nav.getBoundingClientRect().top) + 16;
      const clearanceValue = `${Math.ceil(clearance)}px`;
      document.documentElement.style.setProperty('--shell-bottom-nav-clearance', clearanceValue);
      shell?.style.setProperty('--shell-bottom-nav-clearance', clearanceValue);
    };

    updateNavMetrics();
    nav.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateNavMetrics);

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateNavMetrics);
    resizeObserver?.observe(nav);

    return () => {
      nav.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateNavMetrics);
      resizeObserver?.disconnect();
      document.documentElement.style.removeProperty('--shell-bottom-nav-clearance');
      shell?.style.removeProperty('--shell-bottom-nav-clearance');
    };
  }, []);

  useEffect(() => {
    const nav = bottomNavRef.current;
    const activeLink = nav?.querySelector('.bottom-nav__link--active');

    if (typeof activeLink?.scrollIntoView === 'function') {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [location.pathname]);

  const showUpdatePrompt = pwaUpdate.updateAvailable && !pwaUpdate.dismissed;
  const bottomNavPages = navGroups.core;
  const canNavigateBack = hasInAppHistory || currentPath !== FALLBACK_BACK_PATH;

  const handleBottomNavBack = () => {
    const latestHistoryStack = inAppHistoryRef.current;
    const latestPreviousRoutePath = latestHistoryStack.length > 1 ? latestHistoryStack[latestHistoryStack.length - 2] : null;

    if (latestPreviousRoutePath && latestPreviousRoutePath !== currentPath) {
      inAppHistoryRef.current = latestHistoryStack.slice(0, -1);
      void navigate(latestPreviousRoutePath, { replace: true });
      return;
    }

    if (currentPath !== FALLBACK_BACK_PATH) {
      void navigate(FALLBACK_BACK_PATH, { replace: true });
    }
  };

  return (
    <div className="app-shell" ref={appShellRef}>
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

      <nav aria-label="Quick destinations" className="bottom-nav" data-testid="bottom-nav" ref={bottomNavRef}>
        <button
          aria-label={canNavigateBack ? 'Back' : 'Back (no previous page)'}
          className="bottom-nav__back"
          data-testid="bottom-nav-back"
          disabled={!canNavigateBack}
          onClick={handleBottomNavBack}
          title={canNavigateBack ? undefined : 'No previous page'}
          type="button"
        >
          <span aria-hidden="true" className="bottom-nav__back-icon" data-icon={BOTTOM_NAV_BACK_ICON} />
          <span>Back</span>
        </button>
        {bottomNavPages.map((page) => (
          <NavLink
            className={({ isActive }) => `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`}
            data-testid={`bottom-${page.navTestId}`}
            key={page.id}
            to={page.path}
          >
            <span aria-hidden="true" className="bottom-nav__icon" data-icon={NAV_ICON_GLYPHS[page.icon]} />
            <span>{page.title}</span>
          </NavLink>
        ))}
      </nav>

      <nav aria-label="App" className="app-nav" data-testid="app-nav">
        <span className="app-nav__brand" aria-label="Temple of the Jedi Order">
          <TotjoBrandMark variant="compact" decorative={true} />
          <span className="app-nav__brand-text">TOTJO</span>
        </span>
        {bottomNavPages.map((page) => (
          <NavLink
            className={({ isActive }) => `app-nav__link${isActive ? ' app-nav__link--active' : ''}`}
            data-testid={`app-${page.navTestId}`}
            key={page.id}
            to={page.path}
          >
            {page.title}
          </NavLink>
        ))}
      </nav>

      <AnnouncementModal />

      <div className="shell-layout">
        <main className="shell-main" data-testid="shell-main">
          <Outlet />
        </main>
        <BackToTopButton />
      </div>
    </div>
  );
}
