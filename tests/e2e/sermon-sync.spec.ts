import { expect, test } from '@playwright/test';

async function waitForServiceWorker(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
  });
}

test.describe('sermon sync flows', () => {
  test('sermon-sync saves a sermon for offline reading', async ({ context, page }) => {
    await page.goto('/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    await expect(page.getByTestId('sermon-card-the-force-works-all-things-out')).toBeVisible();

    await page.getByRole('link', { name: 'The Force Works All Things Out' }).click();
    await expect(page.getByTestId('sermon-save-offline')).toBeVisible();
    await page.getByTestId('sermon-save-offline').click();
    await expect(page.getByText(/Before I begin, I’d like us all to take a moment/i).first()).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByText(/Before I begin, I’d like us all to take a moment/i).first()).toBeVisible();
  });

  test('sermon-offline shows a clear message for uncached sermons', async ({ context, page }) => {
    await page.goto('/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    await expect(page.getByTestId('sermon-card-resilience-and-integration-of-practice')).toBeVisible();

    await context.setOffline(true);
    await page.getByRole('link', { name: 'Resilience and integration of practice' }).click();

    await expect(page.getByTestId('offline-sermon-message')).toHaveText('Connect to load this sermon');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-9-sermon-offline.png' });
  });

  test('reader-mobile keeps sermon save controls in the compact reader on phone', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto('/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    await expect(page.getByTestId('sermon-card-the-force-works-all-things-out')).toBeVisible();

    await page.getByRole('link', { name: 'The Force Works All Things Out' }).click();
    await expect(page.getByTestId('reader-control-strip')).toBeVisible();
    await expect(page.getByTestId('sermon-save-offline')).toBeVisible();

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-4-sermon-reader-mobile.png' });
  });
});
