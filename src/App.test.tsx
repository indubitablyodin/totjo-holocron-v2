import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from './App';

describe('App shell', () => {
  it('renders the required navigation test ids and lands on Focus by default', async () => {
    render(<AppTestRouter />);

    expect(screen.getByTestId('nav-library')).toBeVisible();
    expect(screen.getByTestId('nav-daily')).toBeVisible();
    expect(screen.getByTestId('nav-timer')).toBeVisible();
    expect(screen.getByTestId('nav-settings')).toBeVisible();
    expect(screen.getByTestId('bottom-nav')).toBeVisible();
    expect(screen.getByTestId('install-cta')).toBeInTheDocument();
    expect(screen.getByTestId('creator-home-link')).toHaveTextContent('Home');
    expect(screen.getByTestId('creator-donate-link')).toHaveTextContent('Support');
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeVisible();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Daily Focus');
    expect(screen.getByTestId('page-content')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId('daily-focus-card')).toBeVisible();
      expect(screen.getByTestId('daily-meditation-card')).toBeVisible();
    });
  });

  it('renders the placeholder route heading for the requested page', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-group-reading-display')).toBeVisible();
    expect(screen.getByTestId('settings-group-focus-practice')).toBeVisible();
    expect(screen.getByTestId('settings-group-timer-defaults')).toBeVisible();
    expect(screen.getByTestId('settings-group-about-legal')).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
  });
});
