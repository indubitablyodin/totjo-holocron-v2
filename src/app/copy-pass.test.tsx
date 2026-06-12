import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';

describe('copy pass', () => {
  it('keeps primary routes and route-entry actions user-facing', async () => {
    const libraryView = render(<AppTestRouter initialEntries={['/library']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Read');
    });

    expect(screen.getByRole('link', { name: 'Open sermons' })).toBeVisible();

    libraryView.unmount();

    const todayView = render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Daily Focus');
    });

    expect(screen.getByTestId('daily-focus-card')).toBeVisible();
    expect(screen.getByTestId('meditation-subtitle')).toHaveTextContent('Center yourself.');
    expect(screen.queryByTestId('reader-controls-toggle')).not.toBeInTheDocument();

    todayView.unmount();

    const timerView = render(<AppTestRouter initialEntries={['/timer']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Timer');
    });

    expect(screen.getByText('Start a session')).toBeVisible();
    expect(screen.getByTestId('timer-advanced-toggle')).toBeVisible();

    timerView.unmount();

    const settingsView = render(<AppTestRouter initialEntries={['/settings']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.getByTestId('settings-group-about-legal')).toHaveTextContent('Local-only privacy and app details');
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();

    settingsView.unmount();

    render(<AppTestRouter initialEntries={['/settings/account']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.getByText(/private and local-only/i)).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
  });

  it('keeps error and unavailable states free of implementation-facing wording', async () => {
    const doctrineView = render(<AppTestRouter initialEntries={['/library/doctrine/not-a-real-text']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Document not found');
    });

    expect(screen.getByText('Choose one of the doctrine texts in Read.')).toBeVisible();
    expect(screen.queryByText(/IndexedDB/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local-first/i)).not.toBeInTheDocument();

    doctrineView.unmount();

    render(<AppTestRouter initialEntries={['/auth/callback?mode=test&token=bad-token&email=reader@example.test']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument();
    expect(screen.getByText(/personal notes, bookmarks, and practice state stay in this browser/i)).toBeVisible();
    expect(screen.queryByText(/local mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/callback/i)).not.toBeInTheDocument();
  });
});
