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

test.describe('daily practice route', () => {
  test.use({ timezoneId: 'America/Chicago' });

  test('today-phone emphasizes the next action on a phone layout', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Today');
    await expect(page.getByTestId('daily-open-source')).toHaveText(/read|open/i);
    await expect(page.getByTestId('daily-open-source')).toHaveClass(/primary-button/);
    await expect(page.getByTestId('daily-completion-flow')).toBeVisible();
    await expect(page.getByTestId('daily-completion-summary')).toContainText('Mark today complete');

    const sourceBox = await page.getByTestId('daily-open-source').boundingBox();
    const completionBox = await page.getByTestId('daily-completion-flow').boundingBox();

    expect(sourceBox).not.toBeNull();
    expect(completionBox).not.toBeNull();

    if (!sourceBox || !completionBox) {
      throw new Error('Expected Today CTA and completion flow bounds to be available.');
    }

    expect(sourceBox.y).toBeLessThan(completionBox.y + 1);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-6-today-phone.png' });
  });

  test('daily-practice keeps the same item selected and completed after reload on the same day', async ({ page }) => {
    await mockDailyClock(page, '2026-04-26T14:00:00.000Z');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('daily-status')).toHaveText('Ready');

    const selectedTitle = (await page.getByTestId('daily-practice-title').textContent()) ?? '';

    await page.getByTestId('daily-complete').click();
    await expect(page.getByTestId('daily-status')).toHaveText('Completed');

    await page.reload();

    await expect(page.getByTestId('daily-practice-title')).toHaveText(selectedTitle);
    await expect(page.getByTestId('daily-status')).toHaveText('Completed');
  });

  test('daily-rollover advances to the next deterministic item and clears the prior day completion state', async ({ page }) => {
    await mockDailyClock(page, '2026-04-27T04:55:00.000Z');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('daily-status')).toHaveText('Ready');

    const previousTitle = (await page.getByTestId('daily-practice-title').textContent()) ?? '';

    await page.getByTestId('daily-complete').click();
    await expect(page.getByTestId('daily-status')).toHaveText('Completed');

    await page.evaluate(() => {
      (window as DailyPracticeTestWindow).__setDailyPracticeNow?.('2026-04-27T05:05:00.000Z');
    });
    await page.reload();

    const nextTitle = (await page.getByTestId('daily-practice-title').textContent()) ?? '';

    expect(nextTitle).not.toBe(previousTitle);
    await expect(page.getByTestId('daily-status')).toHaveText('Ready');
  });

  test('daily-practice can open a bundled sermon reference from the deterministic rotation', async ({ page }) => {
    await mockDailyClock(page, '2026-05-03T14:00:00.000Z');

    await page.goto('/daily');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('daily-practice-kind')).toHaveText('Sermon reference');
    await page.getByTestId('daily-open-source').click();

    await expect(page.getByTestId('page-title')).toHaveText('The Force Works All Things Out');
    await expect(page.getByText(/What is one situation where we acted or didn’t act because we were afraid\?/i)).toBeVisible();
  });
});
