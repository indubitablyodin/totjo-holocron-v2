import { expect, test, type Page } from './base';

async function openMyDocuments(page: Page) {
  await page.goto('/#/library/mydocs');
  await expect(page.getByTestId('my-documents-title')).toBeVisible();
}

async function addViaForm(page: Page, title: string, body = 'A custom reading body.') {
  await openMyDocuments(page);

  await page.getByTestId('my-documents-title').fill(title);
  await page.getByTestId('my-documents-body').fill(body);
  await page.getByTestId('my-documents-save').click();

  await expect(page.getByTestId('my-documents-status')).toContainText('Document added to your library.');
}

test.describe('my documents', () => {
  test.beforeEach(async ({ page }) => {
    await openMyDocuments(page);
  });

  test('shows an empty state and adds a pasted document', async ({ page }) => {
    await expect(page.getByTestId('my-documents-empty')).toBeVisible();

    await page.getByTestId('my-documents-title').fill('My Practice Journal');
    await page.getByTestId('my-documents-summary').fill('A private reflection.');
    await page.getByTestId('my-documents-body').fill('## Entry one\n\nToday I practiced.');

    await page.getByTestId('my-documents-save').click();

    await expect(page.getByTestId('my-documents-status')).toContainText('Document added to your library.');
    await expect(page.getByTestId('my-document-card-my-practice-journal')).toBeVisible();
  });

  test('imports a markdown file and titles it from the first heading', async ({ page }) => {
    await page.getByTestId('my-documents-import-button').click();
    await page.getByTestId('my-documents-file-input').setInputFiles({
      name: 'notes.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Daily Notes\n\nSome preferred reading.'),
    });

    await expect(page.getByTestId('my-documents-status')).toContainText('File loaded');
    await expect(page.getByTestId('my-documents-title')).toHaveValue('Daily Notes');
    await expect(page.getByTestId('my-documents-body')).toContainText('Some preferred reading.');

    await page.getByTestId('my-documents-save').click();
    await expect(page.getByTestId('my-documents-status')).toContainText('Document added to your library.');
    await expect(page.getByTestId('my-document-card-daily-notes')).toBeVisible();
  });

  test('shows the custom document in the Library lane and reader with full controls', async ({ page }) => {
    await addViaForm(page, 'Reader Test');

    await page.goto('/#/library');
    await expect(page.getByTestId('nav-my-documents')).toContainText('My documents (1)');
    await expect(page.getByTestId('library-card-reader-test')).toContainText('My Doc');

    await page.getByTestId('library-card-reader-test').getByRole('link', { name: 'Reader Test' }).click();

    await expect(page).toHaveURL(/\/library\/mydocs\/reader-test$/);
    await expect(page.getByTestId('authority-badge')).toContainText('My Doc');
    await expect(page.getByText('A custom reading body.')).toBeVisible();

    await page.getByTestId('reader-controls-toggle').click();
    await page.getByTestId('reader-control-markers').click();
    await page.getByTestId('reader-bookmark-label-input').fill('My bookmark');
    await page.getByTestId('reader-bookmark-save').click();
    await expect(page.getByTestId('reader-bookmark-status')).toContainText('Bookmark saved for this page.');

    await page.getByTestId('reader-control-notes').click();
    await page.getByTestId('reader-note-body-input').fill('My reading note.');
    await page.getByTestId('reader-note-save').click();
    await expect(page.getByTestId('reader-note-status')).toContainText('Note saved for this page.');
  });

  test('deletes a custom document and its user state', async ({ page }) => {
    await addViaForm(page, 'Doomed Document', 'Body one.');

    page.on('dialog', (dialog) => void dialog.accept());

    await page.getByTestId('my-document-delete-doomed-document').click();

    await expect(page.getByTestId('my-documents-status')).toContainText('Document deleted.');
    await expect(page.getByTestId('my-documents-empty')).toBeVisible();
  });
});