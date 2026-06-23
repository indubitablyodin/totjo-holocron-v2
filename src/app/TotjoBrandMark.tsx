type TotjoBrandMarkProps = {
  variant?: 'compact' | 'full';
  decorative?: boolean;
  className?: string;
};

/**
 * Temple of the Jedi Order brand mark.
 * Uses the canonical app icon (apple-touch-icon.png) as the logo image.
 *
 * - `compact`: small 36px emblem for dashboard hero or nav.
 * - `full`: larger 48px emblem with label for Settings/About.
 * - `decorative`: when true, renders alt="" and aria-hidden="true".
 *   Use when adjacent visible text already says Temple of the Jedi Order.
 */
export function TotjoBrandMark({ variant = 'compact', decorative = true, className }: TotjoBrandMarkProps) {
  const size = variant === 'full' ? 48 : 36;

  return (
    <span className={`totjo-brand totjo-brand--${variant}${className ? ` ${className}` : ''}`}>
      <img
        src="/apple-touch-icon.png"
        alt={decorative ? '' : 'Temple of the Jedi Order logo'}
        width={size}
        height={size}
        className="totjo-brand__img"
        aria-hidden={decorative || undefined}
      />
      {variant === 'full' ? <span className="totjo-brand__label">Temple of the Jedi Order</span> : null}
    </span>
  );
}
