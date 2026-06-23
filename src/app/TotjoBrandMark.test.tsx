import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TotjoBrandMark } from './TotjoBrandMark';

function getImg() {
  return document.querySelector('.totjo-brand__img') as HTMLImageElement | null;
}

describe('TotjoBrandMark', () => {
  it('renders an img with src containing apple-touch-icon.png', () => {
    render(<TotjoBrandMark />);

    const img = getImg();
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/apple-touch-icon.png');
  });

  it('uses alt="" and aria-hidden when decorative', () => {
    render(<TotjoBrandMark decorative={true} />);

    const img = getImg();
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses descriptive alt text when not decorative', () => {
    render(<TotjoBrandMark decorative={false} />);

    const img = getImg();
    expect(img).toHaveAttribute('alt', 'Temple of the Jedi Order logo');
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  it('renders the label only for full variant', () => {
    const { rerender } = render(<TotjoBrandMark variant="compact" />);

    expect(screen.queryByText('Temple of the Jedi Order')).not.toBeInTheDocument();

    rerender(<TotjoBrandMark variant="full" />);

    expect(screen.getByText('Temple of the Jedi Order')).toBeVisible();
  });

  it('compact variant uses 36x36 image', () => {
    render(<TotjoBrandMark variant="compact" />);

    const img = getImg();
    expect(img).toHaveAttribute('width', '36');
    expect(img).toHaveAttribute('height', '36');
  });

  it('full variant uses 48x48 image', () => {
    render(<TotjoBrandMark variant="full" />);

    const img = getImg();
    expect(img).toHaveAttribute('width', '48');
    expect(img).toHaveAttribute('height', '48');
  });
});
