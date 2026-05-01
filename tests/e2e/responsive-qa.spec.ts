import { expect, test, type Page, type TestInfo } from '@playwright/test';

function requirePhoneProject(testInfo: TestInfo) {
  test.skip(!testInfo.project.name.startsWith('phone-'), 'Phone viewport matrix only runs in the phone project.');
}

function requireDesktopProject(testInfo: TestInfo) {
  test.skip(!testInfo.project.name.startsWith('desktop-'), 'Large-screen matrix only runs in the desktop project.');
}

async function expectNoHorizontalOverflow(page: Page, selector: string) {
  const overflowingTexts = await page.locator(selector).evaluateAll((elements) =>
    elements
      .map((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      }))
      .filter((item) => item.scrollWidth > item.clientWidth),
  );

  expect(overflowingTexts).toEqual([]);
}

test.describe('responsive QA matrix', () => {
  test('mobile-nav phone matrix keeps the wheel rail labeled and reachable', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await expect(page.getByTestId('nav-daily')).toHaveText('Today');
    await expect(page.getByTestId('nav-library')).toHaveText('Read');
    await expect(page.getByTestId('nav-timer')).toHaveText('Timer');
    await expect(page.getByTestId('nav-settings')).toHaveText('Settings');

    const navMetrics = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="primary-nav"]');
      const main = document.querySelector('[data-testid="shell-main"]');

      if (!nav || !main) {
        throw new Error('Primary navigation rail is missing.');
      }

      const navRect = nav.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();

      return {
        navLeft: navRect.left,
        navRight: navRect.right,
        mainLeft: mainRect.left,
        navHeight: navRect.height,
        viewportHeight: window.innerHeight,
      };
    });

    expect(navMetrics.navLeft).toBeGreaterThanOrEqual(0);
    expect(navMetrics.navRight).toBeLessThan(navMetrics.mainLeft + 12);
    expect(navMetrics.navHeight).toBeGreaterThan(navMetrics.viewportHeight * 0.55);
    await expectNoHorizontalOverflow(page, '.nav-link');

    await page.screenshot({ path: '.sisyphus/evidence/task-8-mobile-nav-phone.png' });
  });

  test('mobile-nav desktop matrix keeps the larger-screen rail labeled and route-complete', async ({ page }, testInfo) => {
    requireDesktopProject(testInfo);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Read');

    const navMetrics = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="primary-nav"]');
      const main = document.querySelector('[data-testid="shell-main"]');

      if (!nav || !main) {
        throw new Error('Expected shell navigation and main content to exist.');
      }

      const navRect = nav.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();

      return {
        navRight: navRect.right,
        mainLeft: mainRect.left,
      };
    });

    expect(navMetrics.navRight).toBeLessThan(navMetrics.mainLeft + 24);
    await expect(page.getByTestId('nav-daily')).toBeVisible();
    await expect(page.getByTestId('nav-library')).toBeVisible();
    await expect(page.getByTestId('nav-timer')).toBeVisible();
    await expect(page.getByTestId('nav-settings')).toBeVisible();

    await page.getByTestId('nav-daily').click();
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByTestId('page-title')).toHaveText('Today');

    await page.getByTestId('nav-library').click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('nav-timer').click();
    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByTestId('page-title')).toHaveText('Timer');

    await page.getByTestId('nav-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');

    await page.screenshot({ path: '.sisyphus/evidence/task-8-mobile-nav-desktop.png' });
  });

  test('reader-mobile phone matrix keeps large text, contrast, and reader actions usable under keyboard pressure', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/settings/reading-display');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-contrast').selectOption('high');

    await expect(page.locator('body')).toHaveClass(/large-reading/);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

    await page.goto('/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('reader-control-strip')).toBeVisible();
    await expect(page.getByTestId('reader-controls-toggle')).toBeVisible();

    await page.getByTestId('reader-controls-toggle').click();

    await expect(page.getByTestId('reader-control-font-scale')).toBeVisible();
    await expect(page.getByTestId('reader-control-contrast')).toBeVisible();
    await expect(page.getByTestId('reader-control-bookmark')).toBeVisible();
    await expect(page.getByTestId('reader-control-note')).toBeVisible();
    await expectNoHorizontalOverflow(page, '.reader-control-button');

    await page.getByTestId('reader-control-bookmark').click();
    await expect(page.getByTestId('reader-control-panel-bookmark')).toBeVisible();
    await page.getByTestId('reader-bookmark-label-input').fill('Jedi Believe return point for responsive QA');

    await page.setViewportSize({ width: 390, height: 560 });
    await page.getByTestId('reader-bookmark-label-input').focus();
    await page.evaluate(() => {
      document.querySelector('[data-testid="reader-bookmark-label-input"]')?.scrollIntoView({ block: 'center' });
    });

    const keyboardMetrics = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="reader-bookmark-label-input"]');
      const nav = document.querySelector('[data-testid="primary-nav"]');

      if (!input || !nav) {
        throw new Error('Expected bookmark input and mobile nav to exist.');
      }

      const inputRect = input.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();

      return {
        inputLeft: inputRect.left,
        navRight: navRect.right,
      };
    });

    expect(keyboardMetrics.inputLeft).toBeGreaterThanOrEqual(keyboardMetrics.navRight - 1);

    await page.getByTestId('reader-bookmark-save').click();
    await expect(page.getByTestId('reader-bookmark-status')).toContainText('Bookmark saved for this page.');

    await page.getByTestId('reader-control-note').click();
    await expect(page.getByTestId('reader-control-panel-note')).toBeVisible();
    await page.getByTestId('reader-note-body-input').fill('Phone-width note state stays editable and visible.');
    await page.getByTestId('reader-note-save').click();
    await expect(page.getByTestId('reader-note-status')).toContainText('Note saved for this page.');

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-reader-mobile-phone.png' });
  });

  test('settings-mobile phone matrix keeps larger text and high contrast readable on narrow widths', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/settings/reading-display');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-contrast').selectOption('high');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Settings');
    await expect(page.getByTestId('settings-group-reading-display')).toBeVisible();
    await expect(page.getByTestId('settings-group-timer-defaults')).toBeVisible();
    await expect(page.getByTestId('settings-group-about-legal')).toBeVisible();
    await expect(page.getByTestId('settings-group-account-sync')).toHaveCount(0);
    await expect(page.locator('body')).toHaveClass(/large-reading/);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expectNoHorizontalOverflow(page, '.settings-link-card');

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-settings-mobile.png' });
  });

  test('copy-pass phone matrix keeps saved reader state copy visible on phone widths', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('library-card-knights-code')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supplemental' })).toBeVisible();

    await page.getByTestId('library-card-jedi-believe').getByRole('link', { name: 'Read doctrine' }).click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('reader-controls-toggle').click();
    await page.getByTestId('reader-control-bookmark').click();
    await page.getByTestId('reader-bookmark-label-input').fill('State copy remains readable on phone');
    await page.getByTestId('reader-bookmark-save').click();

    await expect(page.getByTestId('reader-bookmark-status')).toContainText('Bookmark saved for this page.');
    await expect(page.getByTestId('reader-bookmark-item')).toContainText('State copy remains readable on phone');

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-copy-state-phone.png' });
  });
});
