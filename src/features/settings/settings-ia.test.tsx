import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';

describe('settings information architecture', () => {
  it('shows a short local-only settings index with the three focused groups', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-index')).toBeVisible();
    expect(screen.getByTestId('settings-group-reading-display')).toHaveTextContent('Reading & Display');
    expect(screen.getByTestId('settings-group-timer-defaults')).toHaveTextContent('Timer Defaults');
    expect(screen.getByTestId('settings-group-about-legal')).toHaveTextContent('About & Legal');
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-font-scale')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-timer-sound-profile')).not.toBeInTheDocument();
  });

  it('opens a focused reading settings page from the settings index', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await user.click(screen.getByTestId('settings-group-reading-display'));

    expect(screen.getByTestId('page-title')).toHaveTextContent('Reading & Display');
    expect(screen.getByTestId('setting-font-scale')).toBeVisible();
    expect(screen.getByText('Back to settings')).toBeVisible();
  });
});
