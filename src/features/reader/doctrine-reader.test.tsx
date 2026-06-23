import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { resetPersonalizationRules } from '@/features/personalization/personalizationRules';
import { clearReadingSettingsStorage } from '@/features/settings/readingSettings';
import { appDb, ensureStorageReady } from '@/lib/db';

async function resetReadingDocumentState() {
  document.body.className = '';
  document.body.removeAttribute('data-font-scale');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
  document.documentElement.style.colorScheme = '';
  clearReadingSettingsStorage();
  await resetPersonalizationRules();
  await ensureStorageReady(appDb);
  await Promise.all([appDb.bookmarks.clear(), appDb.notes.clear()]);
}

describe('doctrine-reader', () => {
  beforeEach(async () => {
    await resetReadingDocumentState();
  });

  it('renders bundled doctrine from local storage with the authority badge', async () => {
    render(<AppTestRouter initialEntries={['/library/doctrine/jedi-believe']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Jedi Believe');
    });

    expect(screen.getByTestId('authority-badge')).toHaveTextContent('Doctrine Text');
    expect(screen.getByTestId('reader-controls-toggle')).toBeVisible();
    expect(screen.getByText('In the Force, and in the inherent worth of all life within it.')).toBeVisible();
    expect(screen.getByTestId('page-content')).toBeVisible();
    expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument();
    expect(screen.queryByText(/Library\s*›/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Doctrine\s*›/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('doctrine-sibling-toggle')).toBeVisible();
    expect(screen.queryByTestId('doctrine-sibling-nav')).not.toBeInTheDocument();
  });

  it('shows doctrine sibling navigation behind a compact toggle', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/library/doctrine/jedi-believe']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Jedi Believe');
    });

    await user.click(screen.getByTestId('doctrine-sibling-toggle'));
    expect(screen.getByTestId('doctrine-sibling-nav')).toBeVisible();

    await user.click(screen.getByTestId('doctrine-sibling-toggle'));
    expect(screen.queryByTestId('doctrine-sibling-nav')).not.toBeInTheDocument();
  });

  it('lets the reader adjust display settings from the contextual reader controls', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/library/doctrine/jedi-believe']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Jedi Believe');
    });

    await user.click(screen.getByTestId('reader-controls-toggle'));
    await user.click(screen.getByTestId('reader-control-font-scale'));
    await user.click(screen.getByRole('button', { name: 'Large' }));
    expect(document.body).toHaveClass('large-reading');

    await user.click(screen.getByTestId('reader-control-theme'));
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByTestId('reader-control-contrast'));
    await user.click(screen.getByRole('button', { name: 'High' }));
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
  });

  it('keeps both Code formulations available in side-by-side and single-column views', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/library/doctrine/code']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('The Code');
    });

    expect(screen.getByTestId('code-view-side-by-side')).toBeVisible();
    expect(screen.getByText('Emotion, yet Peace.')).toBeVisible();
    expect(screen.getByText('There is no Emotion, there is Peace.')).toBeVisible();

    await user.click(screen.getByTestId('reader-controls-toggle'));
    await user.click(screen.getByTestId('reader-control-code-view'));
    await user.selectOptions(screen.getByTestId('code-view-mode'), 'single-column');

    expect(screen.queryByTestId('code-view-side-by-side')).not.toBeInTheDocument();
    expect(screen.getByTestId('code-view-single-column')).toBeVisible();
    expect(screen.getByText('Emotion, yet Peace.')).toBeVisible();
    expect(screen.getByText('There is no Emotion, there is Peace.')).toBeVisible();
  });

  it('creates a bookmark and note through the doctrine reader UI', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/library/doctrine/jedi-believe']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Jedi Believe');
    });

    await user.click(screen.getByTestId('reader-controls-toggle'));
    await user.click(screen.getByTestId('reader-control-bookmark'));

    await waitFor(() => {
      expect(screen.getByTestId('reader-bookmark-save')).toBeEnabled();
    });

    const bookmarkInput = screen.getByTestId('reader-bookmark-label-input');
    await user.type(bookmarkInput, '{selectall}Opening bookmark');
    await user.click(screen.getByTestId('reader-bookmark-save'));

    await waitFor(() => {
      expect(screen.getByTestId('reader-bookmark-item')).toHaveTextContent('Opening bookmark');
    });

    await user.click(screen.getByTestId('reader-control-note'));
    await user.type(screen.getByTestId('reader-note-body-input'), 'Anonymous sync note');
    await user.click(screen.getByTestId('reader-note-save'));

    await waitFor(() => {
      expect(screen.getByTestId('reader-note-item')).toHaveTextContent('Anonymous sync note');
    });
  });
});
