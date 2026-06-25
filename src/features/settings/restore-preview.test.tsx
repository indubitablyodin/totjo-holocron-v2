import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';

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
});
