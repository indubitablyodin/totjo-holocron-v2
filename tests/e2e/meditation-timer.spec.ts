import { expect, test } from '@playwright/test';

function parseClockToSeconds(clockText: string): number {
  const [minutes, seconds] = clockText.split(':').map((value) => Number.parseInt(value, 10));
  return minutes * 60 + seconds;
}

async function expectBottomNavDoesNotOverlay(page: import('@playwright/test').Page, testId: string) {
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

test.describe('meditation timer', () => {
  test('timer-phone keeps live controls primary and hides session setup until requested', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/timer');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('page-title')).toHaveText('Timer');
    await expect(page.getByRole('heading', { name: 'Start a session' })).toBeVisible();
    await expect(page.getByTestId('timer-panel')).toBeVisible();
    await expect(page.getByTestId('timer-defaults')).toHaveCount(0);
    await expect(page.getByTestId('timer-meditation-preset-60')).toHaveText('1 minute');
    await expect(page.getByTestId('timer-meditation-preset-300')).toHaveText('5 minutes');
    await expect(page.getByTestId('timer-meditation-preset-1800')).toHaveText('30 minutes');
    await expect(page.getByTestId('timer-start')).toHaveText('Start timer');
    await expect(page.getByTestId('timer-reset')).toHaveText('Reset session');
    await expect(page.getByTestId('timer-cancel')).toHaveText('Cancel');
    await expect(page.getByTestId('timer-settings-toggle')).toBeVisible();
    await page.getByTestId('timer-meditation-preset-60').click();
    await expect(page.getByTestId('timer-remaining')).toHaveText('01:00');
    await expectBottomNavDoesNotOverlay(page, 'timer-start');
    await expectBottomNavDoesNotOverlay(page, 'timer-reset');

    await page.getByTestId('timer-settings-toggle').click();

    await expect(page.getByTestId('timer-defaults')).toBeVisible();
    await expect(page.getByTestId('timer-sound-profile')).toBeVisible();

    await page.getByTestId('timer-start').click();

    await expect(page.getByTestId('timer-pause')).toHaveText('Pause timer');
    await expect(page.getByTestId('timer-reset')).toHaveText('Reset session');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-6-timer-phone.png' });
  });

  test('timer cancel clears the session and returns to Daily', async ({ page }) => {
    await page.goto('/timer');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('timer-meditation-preset-60').click();
    await expect(page.getByTestId('timer-remaining')).toHaveText('01:00');

    await page.getByTestId('timer-cancel').click();

    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByTestId('page-title')).toHaveText('Daily Focus');

    await page.goto('/timer');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('timer-remaining')).toHaveText('05:00');
  });

  test('timer completes offline with bundled default-gong cues', async ({ context, page }) => {
    await page.goto('/timer');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('timer-settings-toggle').click();
    await page.getByTestId('timer-duration-seconds').fill('5');
    await page.getByTestId('timer-sound-profile').selectOption('default-gong');

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    await context.setOffline(true);

    const bundledCueAvailableOffline = await page.evaluate(async () => {
      const response = await fetch('/audio/default-gong-complete.mp3');
      return response.ok;
    });

    expect(bundledCueAvailableOffline).toBe(true);

    await page.getByTestId('timer-start').click();

    await expect(page.getByTestId('timer-status')).toHaveText('Complete', { timeout: 10000 });
    await expectBottomNavDoesNotOverlay(page, 'timer-details-toggle');
    await page.getByTestId('timer-details-toggle').click();
    await expect(page.getByTestId('timer-last-cue')).toContainText('Complete cue');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-timer-offline.png' });
  });

  test('timer reflects elapsed duration after background and resume', async ({ context, page }) => {
    await page.goto('/timer');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('timer-settings-toggle').click();
    await page.getByTestId('timer-duration-seconds').fill('10');
    await page.getByTestId('timer-start').click();

    const backgroundPage = await context.newPage();
    await backgroundPage.goto('/settings');
    await backgroundPage.waitForLoadState('networkidle');
    await backgroundPage.waitForTimeout(3200);

    await page.bringToFront();

    const remainingSeconds = parseClockToSeconds(await page.getByTestId('timer-remaining').innerText());

    expect(remainingSeconds).toBeLessThanOrEqual(7);
    expect(remainingSeconds).toBeGreaterThanOrEqual(6);
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-timer-background.png' });

    await backgroundPage.close();
  });

  test('audio-rights settings surface bundled cue provenance', async ({ page }) => {
    await page.goto('/settings/timer-defaults');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('setting-timer-sound-profile')).toHaveValue('default-gong');

    await page.goto('/settings/about-legal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('audio-rights-default-gong')).toContainText('CC0-1.0');
    await expect(page.getByTestId('audio-rights-default-gong')).toContainText('Approved');
    await expect(page.getByTestId('audio-rights-default-gong')).toContainText('Recorded');
    await expect(page.getByTestId('audio-rights-default-gong')).toContainText('/audio/default-gong-complete.mp3');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-8-audio-rights.png' });
  });
});
