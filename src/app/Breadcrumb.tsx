import { Link } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

/**
 * Breadcrumb navigation component
 * Renders a path like: Library > Supplemental > Knight's Code
 * The last item is rendered as plain text (current page), others as links
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb" data-testid="breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="breadcrumb__item" key={item.label}>
              {isLast ? (
                <span className="breadcrumb__label" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link className="breadcrumb__link" to={item.href ?? '#'}>
                  {item.label}
                </Link>
              )}
              {index < items.length - 1 ? <span className="breadcrumb__separator" aria-hidden="true">›</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
