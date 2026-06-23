import type { ReactNode } from 'react';

type PageLayoutProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  headerBadge?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
};

type PageSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

function toSectionId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function PageLayout({ title, headerBadge, headerActions, children, }: PageLayoutProps) {
  return (
    <article className="page-layout">
      <header className="page-header" data-testid="page-header">
        <div className="page-header-row">
          <div className="page-header-text">
            <h1 className="page-title" data-testid="page-title">
              {title}
            </h1>
            {headerBadge ? <div className="page-header-badge">{headerBadge}</div> : null}
          </div>
          {headerActions ? <div className="page-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <div className="page-content-stack" data-testid="page-content">
        {children}
      </div>
    </article>
  );
}

export function PageSection({ title, description, children }: PageSectionProps) {
  const sectionId = title ? toSectionId(title) : undefined;

  return (
    <section aria-labelledby={sectionId} className="content-section content-section--page">
      {title ? (
        <div className="section-heading">
          <h2 id={sectionId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}
      <div className="section-body">{children}</div>
    </section>
  );
}
