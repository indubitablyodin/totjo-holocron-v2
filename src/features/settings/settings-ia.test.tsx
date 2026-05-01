import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { clearDailyPracticeClockOverride } from '@/features/practice/dailyPracticeClock';
import { clearDailyQuickAccessMiddleSlot } from '@/features/practice/dailyQuickAccess';

describe('settings information architecture', () => {
  beforeEach(() => {
    clearDailyPracticeClockOverride();
    clearDailyQuickAccessMiddleSlot();
  });

  it('shows a short local-only settings index with focused groups', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-index')).toBeVisible();
    expect(screen.getByTestId('settings-group-reading-display')).toHaveTextContent('Reading & Display');
    expect(screen.getByTestId('settings-group-focus-practice')).toHaveTextContent('Focus & Practice');
    expect(screen.getByTestId('settings-group-timer-defaults')).toHaveTextContent('Timer Defaults');
    expect(screen.getByTestId('settings-group-about-legal')).toHaveTextContent('About & Legal');
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-font-scale')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-timer-sound-profile')).not.toBeInTheDocument();
  });

  it('opens focus settings and saves a manual local time override', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await user.click(screen.getByTestId('settings-group-focus-practice'));

    expect(screen.getByTestId('page-title')).toHaveTextContent('Focus & Practice');
    await user.click(screen.getByTestId('setting-daily-clock-override-toggle'));
    await user.clear(screen.getByTestId('setting-daily-clock-override-input'));
    await user.type(screen.getByTestId('setting-daily-clock-override-input'), '2026-04-27T00:05');
    await user.clear(screen.getByTestId('setting-daily-clock-override-time-zone'));
    await user.type(screen.getByTestId('setting-daily-clock-override-time-zone'), 'America/Chicago');

    expect(screen.getByTestId('setting-daily-clock-override-input')).toHaveValue('2026-04-27T00:05');
    expect(screen.getByTestId('setting-daily-clock-override-time-zone')).toHaveValue('America/Chicago');
  });

  it('lets Focus settings choose and clear the Daily Focus middle quick-access slot', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings/focus-practice']} />);

    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Knight’s Code' })).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('setting-daily-quick-access-middle-slot'), 'knights-code');
    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('knights-code');

    await user.click(screen.getByText('Back to settings'));
    await user.click(screen.getByTestId('nav-daily'));

    expect(await screen.findByTestId('daily-quick-access-middle-slot')).toHaveTextContent('Knight’s Code');
    expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/supplemental/knights-code');

    await user.click(screen.getByTestId('nav-focus-practice'));
    await user.click(screen.getByTestId('setting-daily-quick-access-clear'));
    await user.click(screen.getByTestId('nav-daily'));

    expect(await screen.findByTestId('daily-quick-access-middle-slot')).toHaveTextContent('Default slot');
    expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/settings/focus-practice');
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
