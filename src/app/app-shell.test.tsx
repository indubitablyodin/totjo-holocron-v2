import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTestRouter } from '@/App';
import { notifyPwaUpdateAvailable, resetPwaUpdateStateForTests, setPwaUpdater } from '@/app/pwaUpdate';
import { clearReadingSettingsStorage } from '@/features/settings/readingSettings';

function resetReadingDocumentState() {
  document.body.className = '';
  document.body.removeAttribute('data-font-scale');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
  document.documentElement.style.colorScheme = '';
  clearReadingSettingsStorage();
}

function getBottomNavLabels() {
  const nav = screen.getByTestId('bottom-nav');
  const links = Array.from(nav.querySelectorAll('.bottom-nav__back, .bottom-nav__link'));
  return links.map((link) => link.textContent?.trim());
}

describe('app-shell routes', () => {
  beforeEach(() => {
    resetReadingDocumentState();
    resetPwaUpdateStateForTests();
  });

  it('navigates across primary routes and keeps shared page test ids stable', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('daily-focus-card')).toBeVisible();
    });

    expect(screen.getByTestId('page-header')).toBeVisible();

    expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
    expect(screen.getByTestId('page-header')).toBeVisible();
    expect(screen.getByTestId('page-content')).toBeVisible();
    expect(screen.getByTestId('bottom-nav')).toBeVisible();
    expect(getBottomNavLabels()).toEqual(['Back', 'Focus', 'Library', 'Sermons', 'Timer', 'Settings']);

    await user.click(screen.getByTestId('bottom-nav-daily'));
    expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
    expect(screen.getByTestId('page-content')).toBeVisible();

    await user.click(screen.getByTestId('bottom-nav-timer'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Timer');
    expect(screen.getByTestId('page-content')).toBeVisible();

    await user.click(screen.getByTestId('bottom-nav-settings'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-group-reading-display')).toBeVisible();
    expect(screen.getByTestId('settings-group-timer-defaults')).toBeVisible();
    expect(screen.getByTestId('settings-group-about-legal')).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('bottom-nav-library'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Library');
  });

  it('uses the in-app route stack for Back before falling back', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter />);

    await waitFor(() => {
      expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
    });

    await user.click(screen.getByTestId('bottom-nav-library'));

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Library');
    });

    await user.click(screen.getByTestId('bottom-nav-back'));

    await waitFor(() => {
      expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
    });
  });

  it('falls Back to Daily Focus when no useful in-app route is known', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    await user.click(screen.getByTestId('bottom-nav-back'));

    await waitFor(() => {
      expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
    });
  });

  it('renders a quiet app update prompt when the PWA has a waiting update', async () => {
    const user = userEvent.setup();
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);

    setPwaUpdater(updateServiceWorker);
    notifyPwaUpdateAvailable();

    render(<AppTestRouter />);

    expect(screen.getByTestId('app-update-prompt')).toBeVisible();
    expect(screen.getByText('New version ready')).toBeVisible();

    await user.click(screen.getByTestId('app-update-apply'));

    await waitFor(() => {
      expect(updateServiceWorker).toHaveBeenCalledWith(true);
    });
  });
});
