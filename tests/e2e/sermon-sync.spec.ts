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
    await page.goto('/#/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    const sermonCard = page.getByTestId('sermon-card-bruised-and-bleeding');
    await expect(sermonCard).toBeVisible();

    await sermonCard.getByRole('link', { name: 'Read sermon' }).click();
    await expect(page.getByTestId('reader-shell')).toBeVisible();
    await expect(page.getByTestId('sermon-save-offline')).toBeVisible();
    await page.getByTestId('sermon-save-offline').click();
    await expect(page.getByText('Saved offline')).toBeVisible();
    await expect(page.getByText(/Let me begin with a little story time/i).first()).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByText(/Let me begin with a little story time/i).first()).toBeVisible();
  });

  test('sermon-offline shows a clear message for uncached sermons', async ({ context, page }) => {
    await page.goto('/#/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    const sermonCard = page.getByTestId('sermon-card-small-meditation');
    await expect(sermonCard).toBeVisible();

    await context.setOffline(true);
    await sermonCard.getByRole('link', { name: 'Read sermon' }).click();

    await expect(page.getByTestId('offline-sermon-message')).toHaveText('Needs connection');
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-9-sermon-offline.png' });
  });

  test('reader-mobile keeps sermon save controls in the compact reader on phone', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto('/#/library/sermons');
    await page.waitForLoadState('networkidle');
    await waitForServiceWorker(page);

    await page.getByTestId('sermon-sync-button').click();
    const sermonCard = page.getByTestId('sermon-card-bruised-and-bleeding');
    await expect(sermonCard).toBeVisible();

    await sermonCard.getByRole('link', { name: 'Read sermon' }).click();
    await expect(page.getByTestId('reader-shell')).toBeVisible();
    await expect(page.getByTestId('reader-controls-toggle')).toBeVisible();
    await expect(page.getByTestId('sermon-save-offline')).toBeVisible();

    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-4-sermon-reader-mobile.png' });
  });
});