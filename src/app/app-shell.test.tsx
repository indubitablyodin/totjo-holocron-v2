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

describe('app-shell routes', () => {
  beforeEach(() => {
    resetReadingDocumentState();
    resetPwaUpdateStateForTests();
  });

  it('navigates across primary routes and keeps shared page test ids stable', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('library-count-canon')).toHaveTextContent(/^[1-9]\d*$/);
      expect(screen.getByTestId('library-count-supplemental')).toHaveTextContent(/^[1-9]\d*$/);
    });

    const primaryNav = screen.getByTestId('primary-nav');
    expect(within(primaryNav).getAllByRole('link').map((link) => link.querySelector('.nav-link__title')?.textContent?.trim())).toEqual([
      'Today',
      'Read',
      'Timer',
      'Settings',
      'Doctrine',
      'Supplemental',
      'Sermons',
      'Bookmarks',
      'Reading & Display',
      'Timer Defaults',
      'About & Legal',
    ]);
    expect(within(primaryNav).queryByTestId('nav-account-sync')).not.toBeInTheDocument();
    expect(within(primaryNav).queryByTestId('install-cta')).not.toBeInTheDocument();
    expect(within(primaryNav).queryByTestId('offline-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('creator-home-link')).toHaveAttribute('href', 'https://odinhalvorson.com');
    expect(screen.getByTestId('creator-donate-link')).toHaveAttribute('href', 'https://ko-fi.com/indubitablyodin');

    expect(screen.getByTestId('page-title')).toHaveTextContent('Read');
    expect(screen.getByTestId('page-header')).toBeVisible();
    expect(screen.getByTestId('page-content')).toBeVisible();

    await user.click(screen.getByTestId('nav-daily'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Today');
    expect(screen.getByTestId('page-content')).toBeVisible();

    await user.click(screen.getByTestId('nav-timer'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Timer');
    expect(screen.getByTestId('page-content')).toBeVisible();

    await user.click(screen.getByTestId('nav-settings'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-group-reading-display')).toBeVisible();
    expect(screen.getByTestId('settings-group-timer-defaults')).toBeVisible();
    expect(screen.getByTestId('settings-group-about-legal')).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('nav-library'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Read');
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
