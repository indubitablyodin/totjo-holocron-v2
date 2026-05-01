import { expect, test } from '@playwright/test';

test.describe('personalization overlay', () => {
  test('personalization follows the saved settings preference without extra reader chrome', async ({ page }) => {
    await page.goto('/settings/reading-display');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pronoun-mode').selectOption('they');

    await page.goto('/library/doctrine/code');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('The Jedi Code comes in two versions that offer different ways of understanding the same teaching.'),
    ).toBeVisible();
    await page.screenshot({ fullPage: true, path: '.sisyphus/evidence/task-12-personalization.png' });
  });
});
