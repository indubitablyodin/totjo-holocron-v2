import { SEARCH_SCOPE_LABELS, type HolocronSearchScope } from './librarySearchTypes';

type LibrarySearchProps = {
  query: string;
  scopes: Record<HolocronSearchScope, boolean>;
  onQueryChange: (value: string) => void;
  onScopeChange: (scope: HolocronSearchScope, checked: boolean) => void;
};

export function LibrarySearch({ query, scopes, onQueryChange, onScopeChange }: LibrarySearchProps) {
  return (
    <search className="library-search" data-testid="library-search-region">
      <label className="field-card" htmlFor="library-search">
        <span className="field-label">Search the Holocron</span>
        <input
          className="search-input"
          data-testid="library-search"
          id="library-search"
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="Search doctrine, sermons, bookmarks, or notes"
          type="search"
          value={query}
        />
      </label>
      <fieldset className="field-card">
        <legend className="field-label">Search in</legend>
        <div className="filter-toggle-group">
          {(Object.keys(SEARCH_SCOPE_LABELS) as HolocronSearchScope[]).map((scope) => (
            <label className="filter-toggle" htmlFor={`library-search-scope-${scope}`} key={scope}>
              <input
                checked={scopes[scope]}
                id={`library-search-scope-${scope}`}
                onChange={(event) => {
                  onScopeChange(scope, event.target.checked);
                }}
                type="checkbox"
              />
              {SEARCH_SCOPE_LABELS[scope]}
            </label>
          ))}
        </div>
      </fieldset>
    </search>
  );
}
