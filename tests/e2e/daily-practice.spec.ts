import { expect, test, type Page } from './base';

type DailyPracticeTestWindow = Window & {
  __setDailyPracticeNow?: (value: string) => void;
};

async function mockDailyClock(page: Page, initialIsoString: string) {
  await page.addInitScript(({ storageKey, initialValue }) => {
    const RealDate = Date;

    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, initialValue);
    }

    const getNow = () => {
      const storedValue = window.localStorage.getItem(storageKey) ?? initialValue;

      return new RealDate(storedValue).valueOf();
    };

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        if (value === undefined) {
          super(getNow());
          return;
        }

        super(value);
      }

      static now() {
        return getNow();
      }

      static parse(value: string) {
        return RealDate.parse(value);
      }

      static UTC(...args: Parameters<typeof RealDate.UTC>) {
        return RealDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(MockDate, RealDate);
    window.Date = MockDate as DateConstructor;
    (window as DailyPracticeTestWindow).__setDailyPracticeNow = (value: string) => {
      window.localStorage.setItem(storageKey, value);
    };
  }, { initialValue: initialIsoString, storageKey: '__daily-practice-test-now__' });
}

async function expectBottomNavDoesNotOverlay(page: Page, testId: string) {
  await expect(page.getByTestId('bottom-nav')).toHaveCSS('position', 'fixed');
  await page.getByTestId(testId).scrollIntoViewIfNeeded();

  const elementBox = await page.getByTestId(testId).boundingBox();
  const bottomNavBox = await page.getByTestId('bottom-nav').boundingBox();

  if (!bottomNavBox) {
    // The bottom dock is only rendered on phone-sized viewports.
    return;
  }

  expect(elementBox).not.toBeNull();

  if (!elementBox) {
    throw new Error(`Expected ${testId} bounds to be available.`);
  }

  expect(elementBox.y).toBeGreaterThanOrEqual(0);
  expect(elementBox.y + elementBox.height).toBeLessThanOrEqual(bottomNavBox.y);
}

test.describe('daily focus route', () => {
  test.use({ timezoneId: 'America/Chicago' });

  test('focus-phone shows Daily Focus first without reader controls', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: "Today’s Practice" })).toBeVisible();
    await expect(page.getByTestId('daily-focus-card')).toBeVisible();
    await expect(page.getByTestId('daily-focus-card')).toContainText('Jediism is a religion based on the observance of the Force. We believe:');
    await expect(page.getByTestId('daily-focus-source')).toHaveText('Jedi Believe #1');
    await expect(page.getByTestId('daily-focus-card')).not.toContainText('Daily Focus');
    await expect(page.getByTestId('daily-open-source')).toHaveAttribute('href', '#/library/doctrine/jedi-believe');
    await expect(page.getByTestId('reader-controls-toggle')).toHaveCount(0);

    const focusBox = await page.getByTestId('daily-focus-card').boundingBox();
    const statsBox = await page.getByTestId('meditation-stats').boundingBox();

    expect(focusBox).not.toBeNull();
    expect(statsBox).not.toBeNull();

    if (!focusBox || !statsBox) {
      throw new Error('Expected Daily Focus and meditation stats bounds to be available.');
    }

    expect(focusBox.y).toBeLessThan(statsBox.y);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-focus-phone.png' });
  });

  test('daily focus changes only when the UTC day changes', async ({ page }) => {
    await mockDailyClock(page, '2026-04-27T04:55:00.000Z');

    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('daily-focus-card')).toBeVisible();

    const firstFocus = (await page.getByTestId('daily-practice-text').textContent()) ?? '';

    await page.evaluate(() => {
      (window as DailyPracticeTestWindow).__setDailyPracticeNow?.('2026-04-27T05:05:00.000Z');
    });
    await page.reload();

    await expect(page.getByTestId('daily-practice-text')).toHaveText(firstFocus);

    await page.evaluate(() => {
      (window as DailyPracticeTestWindow).__setDailyPracticeNow?.('2026-04-28T00:05:00.000Z');
    });
    await page.reload();

    await expect(page.getByTestId('daily-practice-text')).not.toHaveText(firstFocus);
  });

  test('daily meditation panel starts a quick preset and keeps quick access reachable', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('dashboard-meditation-timer')).toBeVisible();
    await expect(page.getByTestId('meditation-total-days')).toContainText('0 days');
    await expect(page.getByTestId('meditation-current-streak')).toContainText('0 days');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toContainText('Set a shortcut');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '#/settings/focus-practice');
    await expectBottomNavDoesNotOverlay(page, 'meditation-preset-5');
    await expectBottomNavDoesNotOverlay(page, 'daily-quick-access-bookmarks');

    await page.getByTestId('meditation-preset-5').click();

    await expect(page.getByTestId('timer-readout')).toContainText('05:00');
    await expect(page.getByTestId('timer-pause')).toBeVisible();
  });

  test('focus settings picks, persists, and clears the quick access middle slot', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.goto('/#/settings/focus-practice');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('setting-daily-quick-access-middle-slot').selectOption('document:canon-three-tenets');

    await expect(page.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('document:canon-three-tenets');

    await page.goto('/#/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toContainText('The Three Tenets');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '#/library/doctrine/three-tenets');

    await page.reload();

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toContainText('The Three Tenets');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '#/library/doctrine/three-tenets');

    await page.goto('/#/settings/focus-practice');
    await page.getByTestId('setting-daily-quick-access-clear').click();
    await page.goto('/#/daily');

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toContainText('Set a shortcut');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '#/settings/focus-practice');
  });
});