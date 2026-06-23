import { Link } from 'react-router-dom';
import type { LibraryCounts } from '@/lib/content';

type LibrarySectionLinksProps = {
  counts: LibraryCounts | null;
  bookmarkCount: number;
};

export function LibrarySectionLinks({ counts, bookmarkCount }: LibrarySectionLinksProps) {
  return (
    <div className="library-lane-grid" data-testid="library-section-links">
      <Link className="first-order-link" data-testid="nav-doctrine" to="/library/doctrine/code">
        Doctrine ({counts?.canonical ?? '…'})
      </Link>
      <Link className="first-order-link" data-testid="nav-supplemental" to="/library/supplemental/knights-code">
        Supplemental ({counts?.supplemental ?? '…'})
      </Link>
      <Link className="first-order-link" data-testid="nav-sermons" to="/library/sermons">
        Sermons ({counts?.sermon ?? 0})
      </Link>
      <Link className="first-order-link" data-testid="nav-bookmarks" to="/library/bookmarks">
        Bookmarks ({bookmarkCount})
      </Link>
    </div>
  );
}
