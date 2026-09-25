import { expect, test, type Page, type TestInfo } from './base';

const EXPECTED_BOTTOM_NAV_LABELS = ['Focus', 'Read', 'Timer', 'Settings'];

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
  test('mobile-nav phone matrix keeps content wide and dock reachable', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Read');
    await expect(page.locator('[data-testid="bottom-nav"] .bottom-nav__link')).toHaveText(EXPECTED_BOTTOM_NAV_LABELS);
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
    await expect(page.getByTestId('app-nav')).toBeHidden();

    const navMetrics = await page.evaluate(() => {
      const main = document.querySelector('[data-testid="shell-main"]');

      if (!main) {
        throw new Error('Main content is missing.');
      }

      const mainRect = main.getBoundingClientRect();

      return {
        mainLeft: mainRect.left,
        mainWidth: mainRect.width,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    });

    expect(navMetrics.mainLeft).toBeGreaterThanOrEqual(0);
    expect(navMetrics.mainWidth).toBeGreaterThan(navMetrics.viewportWidth * 0.8);
    const bottomNavMetrics = await page.getByTestId('bottom-nav').boundingBox();
    expect(bottomNavMetrics).not.toBeNull();
    if (!bottomNavMetrics) {
      throw new Error('Expected bottom navigation bounds to be available.');
    }
    expect(bottomNavMetrics.width).toBeGreaterThan(navMetrics.viewportWidth * 0.8);
    expect(bottomNavMetrics.y + bottomNavMetrics.height).toBeLessThanOrEqual(navMetrics.viewportHeight);
    await expectNoHorizontalOverflow(page, '.bottom-nav__link');

    await page.screenshot({ path: '.sisyphus/evidence/task-8-mobile-nav-phone.png' });
  });

  test('mobile-nav still shows every destination at the 320px baseline', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    const navMetrics = await page.getByTestId('bottom-nav').evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(navMetrics.scrollWidth).toBeLessThanOrEqual(navMetrics.clientWidth);

    const navBox = await page.getByTestId('bottom-nav').boundingBox();
    const linkBoxes = await page.locator('[data-testid="bottom-nav"] .bottom-nav__link').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    );

    expect(navBox).not.toBeNull();
    if (!navBox) {
      throw new Error('Expected the mobile navigation bounds to be available.');
    }

    expect(linkBoxes).toHaveLength(4);
    expect(linkBoxes.every((box) => box.left >= navBox.x - 1 && box.right <= navBox.x + navBox.width + 1)).toBe(true);
    await expect(page.getByTestId('bottom-nav-settings')).toBeVisible();
  });

  test('timer primary action stays clear of the dock at phone and tablet-like widths', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 695, height: 734 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/#/timer');
      await page.waitForLoadState('networkidle');

      const geometry = await page.evaluate(() => {
        const start = document.querySelector('[data-testid="timer-start"]');
        const nav = document.querySelector('[data-testid="bottom-nav"]');

        if (!start || !nav) {
          throw new Error('Expected Timer primary action and mobile dock to exist.');
        }

        const startRect = start.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();

        return {
          startBottom: startRect.bottom,
          startTop: startRect.top,
          navBottom: navRect.bottom,
          navLeft: navRect.left,
          navRight: navRect.right,
          navTop: navRect.top,
        };
      });

      expect(geometry.startTop).toBeGreaterThanOrEqual(0);
      expect(geometry.startBottom).toBeLessThanOrEqual(geometry.navTop - 4);
      expect(geometry.navLeft).toBeGreaterThanOrEqual(-1);
      expect(geometry.navRight).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.navBottom).toBeLessThanOrEqual(viewport.height + 1);
    }
  });

  test('reader navigation can be scrolled fully above the mobile dock', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.setViewportSize({ width: 695, height: 734 });
    await page.goto('/#/library/doctrine/three-tenets');
    await page.waitForLoadState('networkidle');

    const readerNavigation = page.getByRole('navigation', { name: 'Doctrine documents' });
    await readerNavigation.scrollIntoViewIfNeeded();

    const geometry = await page.evaluate(() => {
      const reader = document.querySelector('.reader-navigation');
      const nav = document.querySelector('[data-testid="bottom-nav"]');

      if (!reader || !nav) {
        throw new Error('Expected reader navigation and mobile dock to exist.');
      }

      const readerRect = reader.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return { readerBottom: readerRect.bottom, navTop: navRect.top };
    });

    expect(geometry.readerBottom).toBeLessThanOrEqual(geometry.navTop - 4);
  });

  test('mobile-nav desktop matrix keeps the larger-screen rail labeled and route-complete', async ({ page }, testInfo) => {
    requireDesktopProject(testInfo);

    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Read');

    const navMetrics = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="app-nav"]');
      const main = document.querySelector('[data-testid="shell-main"]');

      if (!nav || !main) {
        throw new Error('Expected shell navigation and main content to exist.');
      }

      const navRect = nav.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();

      return {
        navBottom: navRect.top + navRect.height,
        mainTop: mainRect.top,
      };
    });

    expect(navMetrics.navBottom).toBeLessThanOrEqual(navMetrics.mainTop + 8);
    await expect(page.getByTestId('app-nav-daily')).toBeVisible();
    await expect(page.getByTestId('app-nav-library')).toBeVisible();
    await expect(page.getByTestId('app-nav-timer')).toBeVisible();
    await expect(page.getByTestId('app-nav-settings')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"] .bottom-nav__link')).toHaveText(EXPECTED_BOTTOM_NAV_LABELS);
    await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');

    await page.getByTestId('app-nav-daily').click();
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByRole('heading', { name: "Today’s Practice" })).toBeVisible();

    await page.getByTestId('app-nav-library').click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByTestId('page-title')).toHaveText('Read');

    await page.getByTestId('app-nav-timer').click();
    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByTestId('page-title')).toHaveText('Timer');

    await page.getByTestId('app-nav-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('page-title')).toHaveText('Settings');

    await page.screenshot({ path: '.sisyphus/evidence/task-8-mobile-nav-desktop.png' });
  });

  test('catalog and Timer control density stay bounded on a 1440px desktop', async ({ page }, testInfo) => {
    requireDesktopProject(testInfo);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/library');
    await page.waitForLoadState('networkidle');

    const catalogMetrics = await page.locator('.page-layout--catalog .page-content-stack').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });

    expect(catalogMetrics.width).toBeLessThanOrEqual(1152);
    expect(catalogMetrics.left).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: '.sisyphus/evidence/ux-catalog-desktop-1440.png' });

    await page.goto('/#/timer');
    await page.waitForLoadState('networkidle');

    const timerMetrics = await page.locator('[data-testid="timer-panel"]').evaluate((element) => {
      const controls = element.querySelector('[data-testid="timer-mode-toggle"]');

      if (!controls) {
        throw new Error('Expected the Timer control cluster to exist.');
      }

      return { width: controls.getBoundingClientRect().width };
    });

    expect(timerMetrics.width).toBeLessThanOrEqual(960);
    await page.screenshot({ path: '.sisyphus/evidence/ux-timer-desktop-1440.png' });
  });

  test('reader-mobile phone matrix keeps large text, contrast, and reader actions usable under keyboard pressure', async ({ page }, testInfo) => {
    requirePhoneProject(testInfo);

    await page.goto('/#/settings/reading-display');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-contrast').selectOption('high');

    await expect(page.locator('body')).toHaveClass(/large-reading/);
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

    await page.goto('/#/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('reader-shell')).toBeVisible();
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
      const nav = document.querySelector('[data-testid="app-nav"]');

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

    await page.goto('/#/settings/reading-display');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('setting-font-scale').selectOption('large');
    await page.getByTestId('setting-contrast').selectOption('high');

    await page.goto('/#/settings');
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

    await page.goto('/#/library');
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
