import { Link } from 'react-router-dom';
import type { HolocronSearchResult } from './librarySearchTypes';

type LibraryResultsProps = {
  query: string;
  results: HolocronSearchResult[];
};

export function LibraryResults({ query, results }: LibraryResultsProps) {
  if (!query.trim()) {
    return null;
  }

  return (
    <section className="library-search-results" aria-labelledby="library-search-results-heading">
      <h2 id="library-search-results-heading">Search results</h2>
      {results.length > 0 ? (
        <div className="library-grid" role="list">
          {results.map((result) => (
            <article className="library-card" key={result.id} role="listitem">
              <span className="authority-badge">{result.scopeLabel}</span>
              <h3 className="library-card__title">
                <Link className="library-card__link" to={result.href}>
                  {result.title}
                </Link>
              </h3>
              <p className="library-card__summary">{result.excerpt}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="support-copy">No results matched the current search.</p>
      )}
    </section>
  );
}
