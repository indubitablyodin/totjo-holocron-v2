import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { resetPersonalizationRules } from '@/features/personalization/personalizationRules';
import { clearReadingSettingsStorage } from '@/features/settings/readingSettings';

async function resetReaderState() {
  document.body.className = '';
  document.body.removeAttribute('data-font-scale');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
  document.documentElement.style.colorScheme = '';
  clearReadingSettingsStorage();
  await resetPersonalizationRules();
}

describe('personalization', () => {
  beforeEach(async () => {
    await resetReaderState();
  });

  it('applies the saved pronoun preference as a display overlay', async () => {
    const user = userEvent.setup();
    const firstRender = render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    await user.selectOptions(screen.getByTestId('pronoun-mode'), 'they');

    firstRender.unmount();

    render(<AppTestRouter initialEntries={['/library/doctrine/code']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('The Code');
    });

    expect(
      screen.getByText('The Jedi Code comes in two versions that offer different ways of understanding the same teaching.'),
    ).toBeVisible();
    expect(
      screen.queryByText('The Jedi Code comes in two versions which are different ways of understanding the same teaching.'),
    ).not.toBeInTheDocument();
  });

  it('hydrates the settings control from the stored pronoun preference', async () => {
    const user = userEvent.setup();
    const firstRender = render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    await user.selectOptions(screen.getByTestId('pronoun-mode'), 'they');

    firstRender.unmount();

    render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    await waitFor(() => {
      expect(screen.getByTestId('pronoun-mode')).toHaveValue('they');
    });
  });

  it('applies a saved she/her preference without needing a separate page toggle', async () => {
    const user = userEvent.setup();
    const firstRender = render(<AppTestRouter initialEntries={['/settings/reading-display']} />);

    await user.selectOptions(screen.getByTestId('pronoun-mode'), 'she');

    firstRender.unmount();

    render(<AppTestRouter initialEntries={['/library/doctrine/three-tenets']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('The Three Tenets');
    });

    expect(
      screen.getByText(
        'When used correctly, the Jedi Tenets allow her to better herself and overcome any obstacle. They help her improve the world around her and fulfil her purpose in life as a Jedi.',
      ),
    ).toBeVisible();
  });
});
