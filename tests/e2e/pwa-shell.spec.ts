import { expect, test } from '@playwright/test';

test.describe('PWA shell', () => {
  test('mobile-nav phone layout gives content room and keeps dock destinations reachable', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const installEvent = new Event('beforeinstallprompt');

      Object.defineProperty(installEvent, 'prompt', {
        value: async () => undefined,
      });
      Object.defineProperty(installEvent, 'userChoice', {
        value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      });

      window.dispatchEvent(installEvent);
    });

    await expect(page.getByTestId('bottom-nav')).toContainText('Focus');
    await expect(page.getByTestId('bottom-nav')).toContainText('Library');
    await expect(page.getByTestId('bottom-nav')).toContainText('Settings');
    await expect(page.getByTestId('bottom-nav')).toBeVisible();
    await expect(page.getByTestId('primary-nav')).toBeHidden();
    await expect(page.getByTestId('creator-home-link')).toHaveAttribute('href', 'https://odinhalvorson.com');
    await expect(page.getByTestId('creator-home-link')).toContainText('Creator home');
    await expect(page.getByTestId('creator-donate-link')).toHaveAttribute('href', 'https://ko-fi.com/indubitablyodin');
    await expect(page.getByTestId('creator-donate-link')).toContainText('Ko-fi');
    await expect(page.getByTestId('install-cta')).toBeVisible();
    await expect(page.locator('[data-testid="primary-nav"] [data-testid="install-cta"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="primary-nav"] [data-testid="offline-banner"]')).toHaveCount(0);
    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await expect(page.getByTestId('page-content')).toBeVisible();
    await expect(page.getByTestId('offline-banner')).toHaveCount(1);

    const mainBox = await page.getByTestId('shell-main').boundingBox();
    const bottomNavBox = await page.getByTestId('bottom-nav').boundingBox();
    const viewport = page.viewportSize();

    expect(mainBox).not.toBeNull();
    expect(bottomNavBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!mainBox || !bottomNavBox || !viewport) {
      throw new Error('Expected mobile content, dock, and viewport dimensions to be available.');
    }

    expect(mainBox.width).toBeGreaterThan(viewport.width * 0.8);
    expect(bottomNavBox.width).toBeGreaterThan(viewport.width * 0.8);
    expect(bottomNavBox.y + bottomNavBox.height).toBeLessThanOrEqual(mainBox.y + 1);
    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: '.sisyphus/evidence/task-2-mobile-nav-phone.png' });
  });

  test('mobile-nav desktop adaptation preserves labels and route reachability', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('nav-daily')).toHaveText('Focus');
    await expect(page.getByTestId('nav-library')).toHaveText('Read');
    await expect(page.getByTestId('nav-timer')).toHaveText('Timer');
    await expect(page.getByTestId('nav-settings')).toHaveText('Settings');
    await expect(page.getByTestId('nav-sermons')).toHaveText('Sermons');
    await expect(page.getByTestId('nav-bookmarks')).toHaveText('Bookmarks');
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    const navBox = await page.getByTestId('primary-nav').boundingBox();
    const mainBox = await page.getByTestId('shell-main').boundingBox();

    expect(navBox).not.toBeNull();
    expect(mainBox).not.toBeNull();

    if (!navBox || !mainBox) {
      throw new Error('Expected desktop shell bounds to be available.');
    }

    expect(navBox.x + navBox.width).toBeLessThan(mainBox.x + 24);

    await page.getByTestId('nav-daily').click();
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByTestId('page-title')).toHaveText('Daily Focus');
    await expect(page.getByTestId('page-content')).toBeVisible();

    await page.getByTestId('nav-library').click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('nav-timer').click();
    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByTestId('page-title')).toHaveText('Timer');
    await expect(page.getByTestId('page-content')).toBeVisible();

    await page.getByTestId('nav-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();

    await page.getByTestId('nav-library').click();
    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await page.screenshot({ path: '.sisyphus/evidence/task-2-mobile-nav-desktop.png' });
  });

  test('settings-mobile phone layout shows a short settings index with focused groups', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();
    await expect(page.getByTestId('settings-group-focus-practice')).toBeVisible();
    await expect(page.getByTestId('settings-group-timer-defaults')).toBeVisible();
    await expect(page.getByTestId('settings-group-about-legal')).toBeVisible();
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.getByTestId('setting-font-scale')).toHaveCount(0);
    await expect(page.getByTestId('setting-timer-sound-profile')).toHaveCount(0);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-3-settings-mobile.png' });
  });

  test('settings-mobile redirects dormant account and callback routes to settings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.getByTestId('nav-account-sync')).toHaveCount(0);

    await page.goto('/auth/callback?mode=test&token=expired-token&email=playwright@example.test');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-3-settings-local-only.png' });
  });

  test('reloads the cached shell while offline after the first online load', async ({ context, page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('bottom-nav-library')).toBeVisible();
    await expect(page.getByTestId('page-title')).toHaveText('Daily Focus');
    await expect(page.getByTestId('offline-banner')).toContainText('You’re offline. Reading and settings still work with saved content.');
    await expect(page.locator('body')).not.toContainText('ERR_INTERNET_DISCONNECTED');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-2-pwa-shell-offline.png' });
  });

  test('persists reading settings across reloads', async ({ page }) => {
    await page.goto('/settings/reading-display');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-theme').selectOption('dark');

    await page.goto('/library');
    await page.reload();

    await expect(page.locator('body')).toHaveClass(/large-reading/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.goto('/settings/reading-display');
    await expect(page.getByTestId('setting-font-scale')).toHaveValue('large');
    await expect(page.getByTestId('setting-theme')).toHaveValue('dark');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-4-shell-settings.png' });
  });

  test('bootstraps seeded library counts without manual sync', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('library-count-canon')).toHaveText(/^[1-9]\d*$/);
    await expect(page.getByTestId('library-count-supplemental')).toHaveText(/^[1-9]\d*$/);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-3-storage-bootstrap.png' });
  });

  test('read-surface stays compact and authority-safe on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await expect(page.getByRole('heading', { name: 'Doctrine' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supplemental' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sermons' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open sermons' })).toBeVisible();
    await expect(page.getByTestId('library-card-jedi-believe').getByRole('link', { name: 'Read doctrine' })).toBeVisible();
    await expect(page.getByTestId('library-card-knights-code').getByRole('link', { name: 'Read text' })).toBeVisible();

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-5-read-surface-phone.png' });
  });

  test('renders distinct authority badges for doctrine and supplemental routes', async ({ page }) => {
    await page.goto('/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('authority-badge')).toHaveText('Doctrine Text');
    const doctrineBadgeColor = await page.getByTestId('authority-badge').evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.goto('/library/supplemental/knights-code');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('authority-badge')).toHaveText('Study Text');
    await expect(page.getByText('Public TOTJO text included here for reflection and study.')).toBeVisible();
    const supplementalBadgeColor = await page
      .getByTestId('authority-badge')
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(supplementalBadgeColor).not.toBe(doctrineBadgeColor);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-6-authority-labels.png' });
  });

  test('read-surface keeps doctrine and supplemental cards available on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('library-card-knights-code')).toBeVisible();
    await expect(page.getByTestId('library-card-jedi-believe')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Supplemental' })).toBeVisible();
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-5-read-filter.png' });
  });
});
