import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';

function createJsonFile(content: unknown, filename = 'backup.json'): File {
  return new File([JSON.stringify(content)], filename, { type: 'application/json' });
}

const EMPTY_BACKUP = {
  schemaVersion: 1,
  exportedAt: '2026-06-24T00:00:00.000Z',
  data: {
    notes: [],
    bookmarks: [],
    practiceHistory: [],
    downloads: [],
  },
};

const BACKUP_WITH_RECORDS = {
  schemaVersion: 1,
  exportedAt: '2026-06-24T00:00:00.000Z',
  data: {
    notes: [{ id: 'note-new', documentId: 'doc-1', anchor: null, bodyMarkdown: 'Restored note.', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
    bookmarks: [{ id: 'bm-new', documentId: 'doc-1', anchor: '', label: 'Restored bookmark', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
    practiceHistory: [{ id: 'ph-new', documentId: null, practiceKind: 'meditation', completedAt: '2026-06-22T14:00:00.000Z', durationSeconds: 300 }],
    downloads: [{ id: 'dl-new', documentId: 'doc-1', status: 'ready', storedChecksum: 'abc', updatedAt: '2026-06-01T00:00:00.000Z' }],
    timerPreferences: { defaultDurationSeconds: 600 },
    readerSettings: { theme: 'light' },
  },
};

async function uploadFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  const input = screen.getByTestId('restore-file-input');
  await user.upload(input, file);
}

describe('restore preview UI', () => {
  it('renders the Preview JSON Restore control on the settings page', async () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    const label = await screen.findByTestId('restore-preview-label');
    expect(label).toBeVisible();
    expect(label).toHaveTextContent('Preview JSON Restore');
  });

  it('does not show a preview before a file is selected', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.queryByTestId('restore-preview')).not.toBeInTheDocument();
  });

  it('shows preview or error after uploading a valid empty backup', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await screen.findByTestId('restore-preview-label');
    await uploadFile(user, createJsonFile(EMPTY_BACKUP));

    await waitFor(() => {
      const preview = screen.queryByTestId('restore-preview');
      const error = screen.queryByTestId('restore-preview-error');
      expect(preview || error).toBeTruthy();
    });
  });

  it('shows preview or error after uploading a backup with records', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await screen.findByTestId('restore-preview-label');
    await uploadFile(user, createJsonFile(BACKUP_WITH_RECORDS));

    await waitFor(() => {
      const preview = screen.queryByTestId('restore-preview');
      const error = screen.queryByTestId('restore-preview-error');
      expect(preview || error).toBeTruthy();
    });
  });

  it('shows friendly error for invalid JSON', async () => {
    const user = userEvent.setup();
    const badFile = new File(['This is not JSON'], 'bad.json', { type: 'application/json' });

    render(<AppTestRouter initialEntries={['/settings']} />);

    await screen.findByTestId('restore-preview-label');
    await uploadFile(user, badFile);

    await waitFor(() => {
      expect(screen.getByTestId('restore-preview-error')).toBeVisible();
    });

    expect(screen.getByText(/could not be previewed/i)).toBeVisible();
  });

  it('shows friendly error for wrong schemaVersion', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await screen.findByTestId('restore-preview-label');
    await uploadFile(user, createJsonFile({ schemaVersion: 999, exportedAt: '2026-06-24T00:00:00.000Z', data: {} }));

    await waitFor(() => {
      expect(screen.getByTestId('restore-preview-error')).toBeVisible();
    });

    expect(screen.getByText(/could not be previewed/i)).toBeVisible();
  });

  it('does not show error or preview before file selection', async () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    await screen.findByTestId('restore-preview-label');

    expect(screen.queryByTestId('restore-preview-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('restore-preview')).not.toBeInTheDocument();
  });
});
