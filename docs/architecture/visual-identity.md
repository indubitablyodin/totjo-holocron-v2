# Visual Identity

## Design direction

Retro sci-fi terminal — Ghost in the Shell / 1990s cyberpunk archive interface.  
The app should feel like a sacred-tech field computer: calm, precise, and archival.

## Theme principles

1. **Structure stays modern and accessible.** The retro aesthetic is a visual skin, not a structural rewrite. All semantic HTML, landmarks, headings, labels, and focus outlines remain intact.

2. **Long-form reading stays comfortable.** Reader surfaces use a warm, parchment-like background with high-contrast body text. Neon-on-black is avoided for paragraphs.

3. **Weirdness belongs in chrome, not content.** Decorative motifs (corner brackets, double borders, grid backgrounds, monospace labels) appear on panels, nav, metadata, and controls — not inside reading text.

4. **Motion is optional.** Any animation is subtle and respects `prefers-reduced-motion`.

5. **High-contrast and forced-colors remain usable.** Decorative effects degrade gracefully.

## Token groups

### Color

The existing color system in `styles.css` `:root` block provides the base palette. Retro theme additions:

- `--glow-accent`, `--glow-amber`, `--glow-green` — subtle terminal glow
- `--border-double` — double border for key panels
- `--font-mono` — monospace stack for terminal-style labels

### Typography

- Body: system-ui stack (existing)
- Display: system-ui stack (existing)
- Mono: `SF Mono`, `Fira Code`, `Cascadia Code`, `Consolas`, monospace — used for panel titles, status chips, section labels

### Shape

- Double borders (`3px double`) on primary panels
- Inset shadows on control panels
- Corner bracket pseudo-elements on important surfaces

## Theme system

Three-way theme preference persisted to localStorage key `totjo-holocron:reading-settings` (field `theme`):

| Preference | Behavior |
|---|---|
| `system` (default) | Follows `prefers-color-scheme` media query; live-updates when OS theme changes |
| `dark` | Forces dark mode |
| `light` | Forces light mode |

### Flash prevention

An inline `<script>` in `index.html` reads the stored preference before React mounts and sets `data-theme` on `<html>` immediately. This prevents a white flash on first paint for dark-mode users.

### `data-theme` attribute

The resolved (actual) theme is always `dark` or `light` on `document.documentElement.dataset.theme`. The raw preference is stored in `data-theme-preference` (`system`, `dark`, or `light`).

### Dark mode (default)

Deep navy/black background with cyan/amber terminal accents. Hardware shadows use strong dark insets (0.6 alpha black). See `--hw-*` CSS variables in `:root` / `:root[data-theme='dark']`.

### Light mode

Warm parchment/archive terminal inspired by sunlit Jedi workstations. Background `#efe6d5` with cream panels and teal/amber accents. Hardware shadows use warm brown insets (0.12–0.2 alpha). See `--hw-*` variables in `:root[data-theme='light']`.

## What is decorative vs meaningful

| Element | Treatment | Notes |
|---|---|---|
| Panel borders | `--border-double` | Decorative; not required for comprehension |
| Corner brackets | `::before`/`::after` on `.holocron-frame` | Decorative; hidden in forced-colors mode |
| Grid background | `background-image` on body | Decorative; does not affect layout |
| Status chips | `.holocron-chip` | Meaningful; has text content |
| Active nav chip | `.holocron-nav-chip` | Meaningful; uses `--glow-accent` for emphasis |
| Divider lines | `.holocron-divider` gradient | Decorative; hidden in forced-colors mode |
| Screw/rivet dots | `::after`/`::before` on hero, action panel, reader header | Decorative; `pointer-events: none` |
| Corner brackets | `.holocron-frame` | Decorative; hidden in forced-colors mode |
| Hardware bevel shadows | `box-shadow` on panels, buttons, nav | Decorative; uses `--hw-*` variables |
| Data plate rails | `::before` on `.library-card`, `.settings-link-card` | Decorative; 2px vertical rule |
| LED indicators | `::before` on `.holocron-status-line`, `.stat-card` | Decorative; colored dots |

## Accessibility guardrails

- All decorative pseudo-elements have `pointer-events: none`
- Decorative elements do not create overflow at 320px or affect layout
- Focus outlines remain visible on all interactive elements
- Text contrast ratios are unchanged from the baseline system
- `prefers-reduced-motion` disables all animations
- `forced-colors: active` hides decorative pseudo-elements, glows, and shadows

## Reduced-motion policy

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Forced-colors / high-contrast policy

In forced-colors mode (Windows High Contrast, etc.):

- Decorative corner brackets, dividers, screw dots, panel glows are hidden
- Hardware bevel shadows are removed (`forced-colors` overrides box-shadow)
- Active nav items use a `2px solid Highlight` border instead of accent background + glow
- All `--hw-*` decorative CSS variables are overridden by forced-colors

No information is conveyed through color alone without a text or shape fallback.

## CSS primitives

| Class | Purpose |
|---|---|
| `.holocron-label` | Monospace uppercase section label |
| `.holocron-panel` | Standard panel surface |
| `.holocron-panel--inset` | Inset shadow panel |
| `.holocron-frame` | Corner bracket decoration |
| `.holocron-chip` | Terminal-style status chip |
| `.holocron-chip--accent` | Accent-colored chip |
| `.holocron-divider` | Gradient divider line |
| `.holocron-grid` | Subtle grid background |
| `.holocron-nav-chip` | Active nav/accent chip with glow |
| `.holocron-status-line` | Recessed data plate strip with LED dot |
| `.holocron-data-plate` | (unused class) Replaced by direct selector binding |
| `.holocron-screw` | (unused class) Replaced by ::before/::after on panels |

## Hardware skin — `--hw-*` CSS variables

All hardware bevel/screw/panel/shadow values are theme-adaptable via `--hw-*` custom properties:

| Variable | Dark (default) | Light |
|---|---|---|
| `--hw-shadow-recessed` | Strong black inner shadow | Warm brown inner shadow |
| `--hw-shadow-raised` | Cyan top edge + black bottom | Cream top + warm bottom |
| `--hw-shadow-button-pressed` | Deep inset shadow | Warm pressed shadow |
| `--hw-shadow-tab-active` | Dark latch shadow | Warm latch shadow |
| `--hw-screw` | Cyan-tinged | Teal-tinged |
| `--hw-seam` | Black line | Warm brown line |
| `--hw-data-rail` | Subtle cyan | Subtle teal |
| `--hw-led-cyan` | Bright cyan | Deep teal |
| `--hw-status-line-bg` | Near-black | Warm beige |
| `--hw-timer-well-bg` | Very dark screen | Cream well |
| `--hw-panel-border-recessed` | Black inset | Warm brown inset |

## Manual QA checklist

- 320px mobile viewport — no overflow
- Keyboard-only navigation — focus visible through all routes
- Reduced motion emulation — no lingering animations
- Forced colors mode — no missing information
- Long reader page — body text comfortable
- /daily — hero, meditation panel, quick lanes
- /library — search, section links, cards
- /timer — presets, controls, progress
- /settings — all panels, export, restore preview
- Dark mode — all routes visually correct
- Light mode — all routes visually correct, no white-only surfaces, text readable
- System mode — follows OS preference, live-updates on preference change
- Theme preference persists after reload (dark, light, system)
- Hardware bevels/screws visible in both modes
- <code>prefers-reduced-motion</code> disables all transitions
- <code>forced-colors: active</code> hides decorative elements
