type TotjoBrandMarkProps = {
  variant?: 'compact' | 'full';
};

/**
 * Temple of the Jedi Order brand mark.
 * Uses an inline SVG to avoid external image dependencies.
 *
 * - `compact` (default): small emblem, suitable for dashboard hero or nav.
 * - `full`: larger emblem with text, for Settings/About.
 */
export function TotjoBrandMark({ variant = 'compact' }: TotjoBrandMarkProps) {
  const svgSize = variant === 'full' ? 48 : 36;

  return (
    <span className={`totjo-brand totjo-brand--${variant}`} aria-hidden="true">
      <svg
        className="totjo-brand__svg"
        width={svgSize}
        height={svgSize}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        {/* Outer ring */}
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
        {/* Inner ring */}
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" />
        {/* Center dot */}
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        {/* Cardinal rays */}
        <line x1="24" y1="2" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="24" y1="40" x2="24" y2="46" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="24" x2="8" y2="24" stroke="currentColor" strokeWidth="1.5" />
        <line x1="40" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {variant === 'full' ? <span className="totjo-brand__label">Temple of the Jedi Order</span> : null}
    </span>
  );
}
