import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';

describe('supplementary-library authority labels', () => {
  it('presents /library as the Read surface with distinct doctrine, supplemental, and sermon entry points', async () => {
    render(<AppTestRouter initialEntries={['/library']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Library');
      expect(screen.getByRole('heading', { name: 'Doctrine' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Supplemental' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Sermons' })).toBeVisible();
      expect(screen.getByTestId('library-card-jedi-believe')).toBeVisible();
      expect(screen.getByTestId('library-card-knights-code')).toBeVisible();
    });

    expect(screen.getByRole('link', { name: 'Open sermons' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Read doctrine' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Doctrine Text').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Study Text').length).toBeGreaterThan(0);
  });

  it('renders distinct authority copy for doctrine and supplemental detail routes', async () => {
    const doctrineView = render(<AppTestRouter initialEntries={['/library/doctrine/jedi-believe']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Jedi Believe');
      expect(screen.getByTestId('authority-badge')).toHaveTextContent('Doctrine Text');
    });

    doctrineView.unmount();

    render(<AppTestRouter initialEntries={['/library/supplemental/knights-code']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent("Knight's Code");
      expect(screen.getByTestId('authority-badge')).toHaveTextContent('Study Text');
    });

    expect(screen.getAllByText(/study text|supplemental reading/i).length).toBeGreaterThan(0);
  });
});
