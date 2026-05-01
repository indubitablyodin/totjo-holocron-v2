import { expect, test } from '@playwright/test';

test.describe('doctrine reader', () => {
  test('offline-reader keeps bundled doctrine readable after first online load', async ({ context, page }) => {
    await page.goto('/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('authority-badge')).toHaveText('Doctrine Text');
    await expect(page.getByText('In the Force, and in the inherent worth of all life within it.')).toBeVisible();
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-5-doctrine-offline-reader.png' });
  });

  test('doctrine code reader preserves both formulations across layout modes', async ({ page }) => {
    await page.goto('/library/doctrine/code');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('code-view-side-by-side')).toBeVisible();
    await expect(page.getByText('Emotion, yet Peace.')).toBeVisible();
    await expect(page.getByText('There is no Emotion, there is Peace.')).toBeVisible();

    await page.getByTestId('reader-controls-toggle').click();
    await page.getByTestId('reader-control-code-view').click();
    await page.getByTestId('code-view-mode').selectOption('single-column');

    await expect(page.getByTestId('code-view-single-column')).toBeVisible();
    await expect(page.getByText('Emotion, yet Peace.')).toBeVisible();
    await expect(page.getByText('There is no Emotion, there is Peace.')).toBeVisible();
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-5-doctrine-code.png' });
  });

  test('reader-mobile keeps doctrine content-first on phone', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto('/library/doctrine/jedi-believe');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('reader-shell')).toBeVisible();
    await expect(page.getByTestId('reader-control-strip')).toBeVisible();
    await expect(page.getByText('In the Force, and in the inherent worth of all life within it.')).toBeVisible();

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-4-reader-mobile.png' });
  });
});
