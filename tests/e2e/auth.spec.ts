import { expect, test } from '@playwright/test';

test.describe('auth account', () => {
  test('dormant account route redirects to private local-only settings', async ({ page }) => {
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.getByTestId('email-magic-link-input')).toHaveCount(0);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-10-auth-hidden-account.png' });
  });

  test('dormant auth callback redirects without exposing auth UI', async ({ page }) => {
    await page.goto('/auth/callback?mode=test&token=expired-token&email=playwright@example.test');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('auth-error')).toHaveCount(0);
    await expect(page.getByTestId('account-status')).toHaveCount(0);

    await page.goto('/library');
    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-10-auth-hidden-callback.png' });
  });
});
