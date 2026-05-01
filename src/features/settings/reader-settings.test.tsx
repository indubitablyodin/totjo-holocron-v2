import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { resetPersonalizationRules } from '@/features/personalization/personalizationRules';

import {
  clearReadingSettingsStorage,
  loadReadingSettings,
  saveReadingSettings,
  type ReadingSettings,
} from './readingSettings';

async function resetReadingDocumentState() {
  document.body.className = '';
  document.body.removeAttribute('data-font-scale');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
  document.documentElement.style.colorScheme = '';
  clearReadingSettingsStorage();
  await resetPersonalizationRules();
}

describe('reader-settings persistence', () => {
  beforeEach(async () => {
    await resetReadingDocumentState();
  });

  it('persists theme and font scale across remounts and applies them to the library shell', async () => {
    const user = userEvent.setup();
    const firstRender = render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    await user.selectOptions(screen.getByTestId('setting-font-scale'), 'large');
    await user.selectOptions(screen.getByTestId('setting-theme'), 'dark');
    await user.selectOptions(screen.getByTestId('setting-contrast'), 'high');

    expect(loadReadingSettings()).toEqual<ReadingSettings>({
      fontScale: 'large',
      theme: 'dark',
      contrast: 'high',
    });

    firstRender.unmount();

    render(<AppTestRouter initialEntries={['/library']} />);

    await waitFor(() => {
      expect(document.body).toHaveClass('large-reading');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    });

    expect(screen.getByTestId('page-title')).toHaveTextContent('Read');
  });

  it('hydrates the settings controls from persisted storage', () => {
    saveReadingSettings({ fontScale: 'large', theme: 'dark', contrast: 'high' });

    render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    expect(screen.getByTestId('setting-font-scale')).toHaveValue('large');
    expect(screen.getByTestId('setting-theme')).toHaveValue('dark');
    expect(screen.getByTestId('setting-contrast')).toHaveValue('high');
  });
});
