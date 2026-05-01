import { expect, test } from '@playwright/test';

test.describe('sync account state', () => {
  test('settings exposes local-only groups without sync status or previews', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();
    await expect(page.getByTestId('settings-group-timer-defaults')).toBeVisible();
    await expect(page.getByTestId('settings-group-about-legal')).toBeVisible();
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.getByTestId('sync-status')).toHaveCount(0);
    await expect(page.getByTestId('sync-preview-bookmark')).toHaveCount(0);
  });
});
