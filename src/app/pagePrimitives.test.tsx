import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from './pagePrimitives';

describe('PageLayout', () => {
  it('renders the technical eyebrow and descriptive copy when provided', () => {
    render(
      <PageLayout description="Local settings stay on this device." eyebrow="Settings" title="About">
        <p>Content</p>
      </PageLayout>,
    );

    expect(screen.getByText('Settings')).toBeVisible();
    expect(screen.getByText('Local settings stay on this device.')).toBeVisible();
    expect(screen.getByTestId('page-title')).toHaveTextContent('About');
  });
});
