import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { clearAuthStorageForTests, saveStoredAuthSession, writeRawAuthStorageForTests } from '@/features/auth/authStorage';

describe('auth account flow', () => {
  beforeEach(() => {
    clearAuthStorageForTests();
  });

  it('redirects the dormant account route to local-only settings', async () => {
    render(<AppTestRouter initialEntries={['/settings/account']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.getByText(/private and local-only/i)).toBeVisible();
    expect(screen.queryByTestId('account-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('email-magic-link-input')).not.toBeInTheDocument();
  });

  it('keeps dormant account controls out of the settings index', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('settings-group-reading-display')).toBeVisible();
    expect(screen.getByTestId('settings-group-timer-defaults')).toBeVisible();
    expect(screen.getByTestId('settings-group-about-legal')).toBeVisible();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-account-sync')).not.toBeInTheDocument();
  });

  it('redirects dormant callback links without exposing auth feedback UI', async () => {
    render(<AppTestRouter initialEntries={['/auth/callback?mode=test&token=bad-token&email=reader@example.test']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('account-status')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeVisible();
  });

  it('keeps signed-in dormant sessions out of visible settings', async () => {
    saveStoredAuthSession({
      user: {
        id: 'test-user:reader@example.test',
        email: 'reader@example.test',
      },
      signedInAt: '2026-04-27T00:00:00.000Z',
    });

    render(<AppTestRouter initialEntries={['/settings']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.queryByText(/reader@example.test/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/signed in/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
  });

  it('treats malformed persisted auth storage as signed out', async () => {
    writeRawAuthStorageForTests('session', JSON.stringify({ user: { nope: true } }));

    render(<AppTestRouter initialEntries={['/settings/account']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    expect(screen.queryByTestId('account-status')).not.toBeInTheDocument();
  });
});
