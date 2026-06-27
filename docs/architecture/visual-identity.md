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

## What is decorative vs meaningful

| Element | Treatment | Notes |
|---|---|---|
| Panel borders | `--border-double` | Decorative; not required for comprehension |
| Corner brackets | `::before`/`::after` on `.holocron-frame` | Decorative; hidden in forced-colors mode |
| Grid background | `background-image` on body | Decorative; does not affect layout |
| Status chips | `.holocron-chip` | Meaningful; has text content |
| Active nav chip | `.holocron-nav-chip` | Meaningful; uses `--glow-accent` for emphasis |
| Divider lines | `.holocron-divider` gradient | Decorative; hidden in forced-colors mode |

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

- Decorative corner brackets are hidden
- Gradient dividers are hidden
- Glow shadows are hidden
- Active nav items use a `2px solid Highlight` border instead of accent background + glow

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
