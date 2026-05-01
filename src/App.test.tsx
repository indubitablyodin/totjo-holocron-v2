import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from './App';

describe('App shell', () => {
  it('renders the required navigation test ids and seeded library counts', async () => {
    render(<AppTestRouter />);

    expect(screen.getByTestId('nav-library')).toBeVisible();
    expect(screen.getByTestId('nav-daily')).toBeVisible();
    expect(screen.getByTestId('nav-timer')).toBeVisible();
    expect(screen.getByTestId('nav-settings')).toBeVisible();
    expect(screen.getByTestId('install-cta')).toBeInTheDocument();
    expect(screen.getByTestId('creator-home-link')).toHaveTextContent('odinhalvorson.com');
    expect(screen.getByTestId('creator-donate-link')).toHaveTextContent('Support on Ko-fi');
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeVisible();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Read');
    expect(screen.getByTestId('page-content')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId('library-count-canon')).toHaveTextContent(/^[1-9]\d*$/);
      expect(screen.getByTestId('library-count-supplemental')).toHaveTextContent(/^[1-9]\d*$/);
      expect(screen.getByTestId('library-card-knights-code')).toBeVisible();
    });
  });

  it('renders the placeholder route heading for the requested page', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-group-reading-display')).toBeVisible();
    expect(screen.getByTestId('settings-group-timer-defaults')).toBeVisible();
    expect(screen.getByTestId('settings-group-about-legal')).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
  });
});
