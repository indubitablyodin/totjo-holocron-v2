import { useMemo, useState, type ReactNode } from 'react';
import { Breadcrumb, type BreadcrumbItem } from '@/app/Breadcrumb';

export type CompactReaderControl = {
  id: string;
  label: string;
  panel: ReactNode;
  testId?: string;
  value?: string;
};

type CompactReaderShellProps = {
  actionAside?: ReactNode;
  badges?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  controls?: CompactReaderControl[];
  description: string;
  eyebrow: string;
  headerActions?: ReactNode;
  meta?: ReactNode;
  navigation?: ReactNode;
  title: string;
};

type ReaderOptionGroupProps<Option extends string> = {
  label: string;
  labels: Record<Option, string>;
  onChange: (option: Option) => void;
  options: readonly Option[];
  value: Option;
};

type ReaderMetaListProps = {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
};

type ReaderSurfaceProps = {
  children: ReactNode;
  muted?: boolean;
};

function getControlPanelId(controlId: string) {
  return `reader-control-panel-${controlId}`;
}

export function CompactReaderShell({
  actionAside,
  badges,
  breadcrumbs,
  children,
  controls = [],
  description,
  eyebrow,
  headerActions,
  meta,
  navigation,
  title,
}: CompactReaderShellProps) {
  const visibleControls = useMemo(() => controls.filter((control) => control.panel), [controls]);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [activeControlId, setActiveControlId] = useState<string | null>(null);
  const resolvedActiveControlId = activeControlId && visibleControls.some((control) => control.id === activeControlId) ? activeControlId : null;
  const activeControl = visibleControls.find((control) => control.id === resolvedActiveControlId) ?? null;

  return (
    <article className="reader-shell" data-testid="reader-shell">
      <header className="reader-shell__header" data-testid="page-header">
        {breadcrumbs?.length ? <Breadcrumb items={breadcrumbs} /> : null}
        <div className="page-header-row">
          <div className="page-header-text">
            <p className="page-eyebrow">{eyebrow}</p>
            <h1 className="reader-shell__title" data-testid="page-title">
              {title}
            </h1>
            {badges ? <div className="reader-shell__badges">{badges}</div> : null}
          </div>
          {headerActions ? <div className="page-header-actions">{headerActions}</div> : null}
        </div>
        <p className="reader-shell__description">{description}</p>
        {meta ? <div className="reader-shell__meta">{meta}</div> : null}
      </header>

      {navigation || visibleControls.length > 0 || actionAside ? (
        <section className="reader-shell__chrome">
          {navigation ? <div className="reader-shell__navigation">{navigation}</div> : null}

          {visibleControls.length > 0 || actionAside ? (
            <div className="reader-control-strip" data-testid="reader-control-strip">
              {visibleControls.length > 0 ? (
                <button
                  aria-expanded={controlsOpen}
                  className="secondary-button button-inline reader-controls-toggle"
                  data-testid="reader-controls-toggle"
                  onClick={() => {
                    setControlsOpen((currentValue) => {
                      if (currentValue) {
                        setActiveControlId(null);
                      }

                      return !currentValue;
                    });
                  }}
                  type="button"
                >
                  {controlsOpen ? 'Hide reader controls' : 'Reader controls'}
                </button>
              ) : null}

              {actionAside ? <div className="reader-control-strip__aside">{actionAside}</div> : null}
            </div>
          ) : null}

          {controlsOpen && visibleControls.length > 0 ? (
            <div className="reader-control-panel reader-control-panel--grouped" data-testid="reader-control-panel-group">
              <div className="reader-control-strip__buttons">
                {visibleControls.map((control) => {
                  const isActive = control.id === resolvedActiveControlId;

                  return (
                    <button
                      aria-controls={getControlPanelId(control.id)}
                      aria-expanded={isActive}
                      aria-pressed={isActive}
                      className={`reader-control-button${isActive ? ' reader-control-button--active' : ''}`}
                      data-testid={control.testId ?? `reader-control-${control.id}`}
                      key={control.id}
                      onClick={() => {
                        setActiveControlId((currentControlId) => (currentControlId === control.id ? null : control.id));
                      }}
                      type="button"
                    >
                      <span className="reader-control-button__label">{control.label}</span>
                      {control.value ? <span className="reader-control-button__value">{control.value}</span> : null}
                    </button>
                  );
                })}
              </div>

              {activeControl ? (
                <div className="reader-control-panel reader-control-panel--nested" data-testid={getControlPanelId(activeControl.id)} id={getControlPanelId(activeControl.id)}>
                  {activeControl.panel}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="reader-shell__body" data-testid="page-content">
        {children}
      </div>
    </article>
  );
}

export function ReaderOptionGroup<Option extends string>({ label, labels, onChange, options, value }: ReaderOptionGroupProps<Option>) {
  return (
    <div className="reader-option-group">
      <p className="reader-option-group__label">{label}</p>
      <div className="reader-option-group__choices">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <button
              aria-pressed={isActive}
              className={`reader-option-button${isActive ? ' reader-option-button--active' : ''}`}
              key={option}
              onClick={() => {
                onChange(option);
              }}
              type="button"
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReaderMetaList({ items }: ReaderMetaListProps) {
  return (
    <dl className="reader-meta-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReaderSurface({ children, muted = false }: ReaderSurfaceProps) {
  return <section className={`reader-surface${muted ? ' reader-surface--muted' : ''}`}>{children}</section>;
}
