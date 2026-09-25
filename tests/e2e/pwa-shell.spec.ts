import { expect, test, type Page } from './base';

const EXPECTED_BOTTOM_NAV_LABELS = ['Focus', 'Read', 'Timer', 'Settings'];

async function expectBottomNavLabels(page: Page) {
  const bottomNav = page.getByTestId('bottom-nav');

  await expect(bottomNav.locator('.bottom-nav__link')).toHaveText(EXPECTED_BOTTOM_NAV_LABELS);
}

async function expectBottomNavDoesNotCover(page: Page, testId: string) {
  await page.getByTestId(testId).scrollIntoViewIfNeeded();

  const elementBox = await page.getByTestId(testId).boundingBox();
  const bottomNavBox = await page.getByTestId('bottom-nav').boundingBox();

  if (!bottomNavBox) {
    // The bottom dock is only rendered on phone-sized viewports.
    return;
  }

  expect(elementBox).not.toBeNull();

  if (!elementBox) {
    throw new Error(`Expected ${testId} and bottom dock bounds to be available.`);
  }

  expect(elementBox.y).toBeGreaterThanOrEqual(0);
  expect(elementBox.y + elementBox.height).toBeLessThanOrEqual(bottomNavBox.y);
}

test.describe('PWA shell', () => {
  test('mobile-nav phone layout gives content room and keeps dock destinations reachable', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/library');
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

    await expectBottomNavLabels(page);
    await expect(page.getByTestId('bottom-nav')).toBeVisible();
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
    await expect(page.getByTestId('app-nav')).toBeHidden();
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
    expect(bottomNavBox.y + bottomNavBox.height).toBeLessThanOrEqual(viewport.height);
    expect(bottomNavBox.y).toBeGreaterThan(viewport.height - bottomNavBox.height * 2);
    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: '.sisyphus/evidence/task-2-mobile-nav-phone.png' });
  });

  test('bottom dock leaves daily and timer actions clear on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');

    await expectBottomNavLabels(page);
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
    await expectBottomNavDoesNotCover(page, 'meditation-preset-5');
    await expectBottomNavDoesNotCover(page, 'daily-quick-access-bookmarks');

    await page.goto('/#/timer');
    await page.waitForLoadState('networkidle');

    await expectBottomNavLabels(page);
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
    await expectBottomNavDoesNotCover(page, 'timer-start');
    await expectBottomNavDoesNotCover(page, 'timer-reset');
  });

  test('mobile Back follows in-app route history and disables at the Daily root', async ({ page }) => {
    test.skip(test.info().project.name !== 'phone-chromium', 'The Back dock control is mobile-only.');

    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('bottom-nav-back')).toBeDisabled();
    await expect(page.getByTestId('bottom-nav-back')).toHaveAttribute('aria-label', 'Back (no previous page)');

    await page.getByTestId('bottom-nav-library').click();
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('bottom-nav-timer').click();
    await expect(page.getByTestId('page-title')).toHaveText('Timer');

    await page.getByTestId('bottom-nav-settings').click();
    await expect(page.getByTestId('page-title')).toHaveText('Settings');

    await page.getByTestId('bottom-nav-back').click();
    await expect(page.getByTestId('page-title')).toHaveText('Timer');

    await page.getByTestId('bottom-nav-back').click();
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('bottom-nav-back').click();
    await expect(page.getByRole('heading', { name: "Today’s Practice" })).toBeVisible();
    await expect(page.getByTestId('bottom-nav-back')).toBeDisabled();
  });

  test('mobile-nav desktop adaptation preserves labels and route reachability', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('app-nav-daily')).toHaveText('Focus');
    await expect(page.getByTestId('app-nav-library')).toHaveText('Read');
    await expect(page.getByTestId('app-nav-timer')).toHaveText('Timer');
    await expect(page.getByTestId('app-nav-settings')).toHaveText('Settings');
    await expectBottomNavLabels(page);
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    const navBox = await page.getByTestId('app-nav').boundingBox();
    const mainBox = await page.getByTestId('shell-main').boundingBox();

    expect(navBox).not.toBeNull();
    expect(mainBox).not.toBeNull();

    if (!navBox || !mainBox) {
      throw new Error('Expected desktop shell bounds to be available.');
    }

    expect(navBox.y + navBox.height).toBeLessThanOrEqual(mainBox.y + 8);

    await page.getByTestId('app-nav-daily').click();
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByRole('heading', { name: "Today’s Practice" })).toBeVisible();
    await expect(page.getByTestId('page-content')).toBeVisible();

    await page.getByTestId('app-nav-library').click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('app-nav-timer').click();
    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByTestId('page-title')).toHaveText('Timer');
    await expect(page.getByTestId('page-content')).toBeVisible();

    await page.getByTestId('app-nav-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();

    await page.getByTestId('app-nav-library').click();
    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await page.screenshot({ path: '.sisyphus/evidence/task-2-mobile-nav-desktop.png' });
  });

  test('settings-mobile phone layout shows a short settings index with focused groups', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/settings');
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
    await page.goto('/#/settings/account');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.getByTestId('app-nav-account-sync')).toHaveCount(0);

    await page.goto('/#/auth/callback?mode=test&token=expired-token&email=playwright@example.test');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-3-settings-local-only.png' });
  });

  test('reloads the cached shell while offline after the first online load', async ({ context, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('bottom-nav-library')).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today’s Practice" })).toBeVisible();
    await expect(page.getByTestId('offline-banner')).toContainText('You’re offline. Reading and settings still work with saved content.');
    await expect(page.locator('body')).not.toContainText('ERR_INTERNET_DISCONNECTED');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-2-pwa-shell-offline.png' });
  });

  test('persists reading settings across reloads', async ({ page }) => {
    await page.goto('/#/settings/reading-display');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-theme').selectOption('dark');

    await page.goto('/#/library');
    await page.reload();

    await expect(page.locator('body')).toHaveClass(/large-reading/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.goto('/#/settings/reading-display');
    await expect(page.getByTestId('setting-font-scale')).toHaveValue('large');
    await expect(page.getByTestId('setting-theme')).toHaveValue('dark');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-4-shell-settings.png' });
  });

  test('bootstraps seeded library counts without manual sync', async ({ page }) => {
    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('library-section-links')).toContainText(/Doctrine \(\d+\)/);
    await expect(page.getByTestId('library-section-links')).toContainText(/Supplemental \(\d+\)/);
    await expect(page.getByTestId('library-section-links')).toContainText(/Sermons \(\d+\)/);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-3-storage-bootstrap.png' });
  });

  test('read-surface stays compact and authority-safe on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/library');
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
    await page.goto('/#/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('authority-badge')).toHaveText('Doctrine Text');
    const doctrineBadgeColor = await page.getByTestId('authority-badge').evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.goto('/#/library/supplemental/knights-code');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('authority-badge')).toHaveText('Study Text');
    await expect(page.getByTestId('reader-shell')).toBeVisible();
    const supplementalBadgeColor = await page
      .getByTestId('authority-badge')
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(supplementalBadgeColor).not.toBe(doctrineBadgeColor);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-6-authority-labels.png' });
  });

  test('read-surface keeps doctrine and supplemental cards available on phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('library-card-knights-code')).toBeVisible();
    await expect(page.getByTestId('library-card-jedi-believe')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Supplemental' })).toBeVisible();
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-5-read-filter.png' });
  });
});
