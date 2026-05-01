import { expect, test, type Page } from '@playwright/test';

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

  expect(elementBox).not.toBeNull();
  expect(bottomNavBox).not.toBeNull();

  if (!elementBox || !bottomNavBox) {
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
    await page.goto('/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Daily Focus');
    await expect(page.getByTestId('daily-focus-card')).toBeVisible();
    await expect(page.getByTestId('daily-focus-card')).toContainText('Jediism is a religion based on the observance of the Force. We believe:');
    await expect(page.getByTestId('daily-focus-source')).toHaveText('Jedi Believe #1');
    await expect(page.getByTestId('daily-focus-card')).not.toContainText('Daily Focus');
    await expect(page.getByTestId('daily-focus-source')).not.toContainText('from Jedi Believe');
    await expect(page.getByTestId('daily-open-source')).toHaveAttribute('href', '/library/doctrine/jedi-believe');
    await expect(page.getByTestId('reader-controls-toggle')).toHaveCount(0);

    const focusBox = await page.getByTestId('daily-focus-card').boundingBox();
    const meditationBox = await page.getByTestId('daily-meditation-card').boundingBox();

    expect(focusBox).not.toBeNull();
    expect(meditationBox).not.toBeNull();

    if (!focusBox || !meditationBox) {
      throw new Error('Expected Daily Focus and meditation card bounds to be available.');
    }

    expect(focusBox.y).toBeLessThan(meditationBox.y);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-focus-phone.png' });
  });

  test('daily focus changes only when the UTC day changes', async ({ page }) => {
    await mockDailyClock(page, '2026-04-27T04:55:00.000Z');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('daily-focus-day')).toContainText('UTC 2026-04-27');

    const firstFocus = (await page.getByTestId('daily-focus-text').textContent()) ?? '';

    await page.evaluate(() => {
      (window as DailyPracticeTestWindow).__setDailyPracticeNow?.('2026-04-27T05:05:00.000Z');
    });
    await page.reload();

    await expect(page.getByTestId('daily-focus-text')).toHaveText(firstFocus);
    await expect(page.getByTestId('daily-focus-day')).toContainText('UTC 2026-04-27');

    await page.evaluate(() => {
      (window as DailyPracticeTestWindow).__setDailyPracticeNow?.('2026-04-28T00:05:00.000Z');
    });
    await page.reload();

    await expect(page.getByTestId('daily-focus-day')).toContainText('UTC 2026-04-28');
    await expect(page.getByTestId('daily-focus-text')).not.toHaveText(firstFocus);
  });

  test('daily meditation card opens timer with quick preset and shows quick access', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');

    const meditationCard = page.getByTestId('daily-meditation-card');

    await expect(meditationCard).toContainText('Center yourself.');
    await expect(meditationCard.getByText('Center yourself.', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Center yourself.', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Quick meditation', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('meditation-total-days')).toContainText('0 days');
    await expect(page.getByTestId('meditation-current-streak')).toContainText('0 days');
    await expect(meditationCard).not.toContainText(/Duration|1 minute|5 minutes|30 minutes|Cancel/);
    await expect(page.getByTestId('daily-meditation-presets')).toHaveCount(0);
    await expect(page.getByTestId('daily-meditation-preset-60')).toHaveCount(0);
    await expect(page.getByTestId('daily-meditation-preset-300')).toHaveCount(0);
    await expect(page.getByTestId('daily-meditation-preset-1800')).toHaveCount(0);
    await expect(page.getByTestId('daily-cancel-meditation')).toHaveCount(0);
    await expect(page.getByTestId('daily-quick-access-jedi-code')).toHaveAttribute('href', '/library/doctrine/code');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveText('Default slot');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/settings/focus-practice');
    await expect(page.getByTestId('daily-quick-access-bookmarks')).toHaveAttribute('href', '/library/bookmarks');
    await expectBottomNavDoesNotOverlay(page, 'daily-begin-meditation');
    await expectBottomNavDoesNotOverlay(page, 'daily-quick-access-bookmarks');

    await page.getByTestId('daily-begin-meditation').click();

    await expect(page).toHaveURL(/\/timer$/);
    await expect(page.getByTestId('timer-meditation-presets')).toBeVisible();
  });

  test('focus settings picks, persists, and clears the quick access middle slot', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.goto('/settings/focus-practice');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('setting-daily-quick-access-middle-slot').selectOption('document:canon-three-tenets');

    await expect(page.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('document:canon-three-tenets');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveText('The Three Tenets');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/doctrine/three-tenets');

    await page.reload();

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveText('The Three Tenets');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/doctrine/three-tenets');

    await page.goto('/settings/focus-practice');
    await page.getByTestId('setting-daily-quick-access-clear').click();
    await page.goto('/daily');

    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveText('Default slot');
    await expect(page.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/settings/focus-practice');
  });
});
