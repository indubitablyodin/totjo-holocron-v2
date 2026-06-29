function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const THEMES = {
  light: {
    background: '#efe6d5',
    panel: '#f7f0e3',
    surface: 'rgba(250,245,236,0.9)',
    text: '#2c2420',
    textStrong: '#14100d',
    textMuted: '#5a5048',
    accent: '#1c5866',
    accentStrong: '#124956',
    heading: '#1c5866',
    link: '#124956',
    accentInk: '#f7fbff',
    navActiveBg: '#d6d0c4',
    navActiveText: '#124956',
    primaryBtnBg: '#1c5866',
    primaryBtnText: '#f7fbff',
    dataPlateText: '#5a5048',
    dataPlateBg: 'rgba(210,195,175,0.5)',
  },
  dark: {
    background: '#081019',
    panel: 'rgba(15,25,35,0.88)',
    surface: 'rgba(7,15,24,0.84)',
    text: '#edf3f8',
    textStrong: '#f5faff',
    textMuted: '#c0d0dd',
    accent: '#5daee0',
    accentStrong: '#8aecf5',
    accentInk: '#081019',
    heading: '#8aecf5',
    link: '#8aecf5',
    navActiveBg: 'rgba(90,210,230,0.85)',
    navActiveText: '#0b2234',
    primaryBtnBg: '#10202d',
    primaryBtnText: '#8aecf5',
    dataPlateText: 'rgba(90,210,230,0.5)',
    dataPlateBg: 'rgba(0,0,0,0.5)',
  },
};

const PAIRS = [
  // fg, bg, parentBg, label, threshold
  ['text', 'background', null, 'body text on page background', 4.5],
  ['textStrong', 'background', null, 'strong body text on page background', 4.5],
  ['text', 'panel', 'background', 'body text on panel background', 4.5],
  ['textMuted', 'panel', 'background', 'muted text on panel background', 4.5],
  ['heading', 'panel', 'background', 'heading on panel background', 3.0],
  ['heading', 'background', null, 'heading on page background', 3.0],
  ['link', 'panel', 'background', 'link text on panel background', 4.5],
  ['accentStrong', 'panel', 'background', 'strong accent on panel background', 3.0],
  ['navActiveText', 'navActiveBg', null, 'active nav label on nav background', 4.5],
  ['primaryBtnText', 'primaryBtnBg', 'background', 'primary button text on button bg', 3.0],
  ['dataPlateText', 'dataPlateBg', 'panel', 'data plate text on data plate bg', 3.0],
];

function getResolvedToken(tokenName, themeName) {
  const val = THEMES[themeName][tokenName];
  if (!val) return null;
  if (val.startsWith('#')) return hexToRgb(val);
  const bg = resolveColor('background', themeName, null);
  return resolveColor(tokenName, themeName, bg);
}

function blendAlpha(rgb, alpha, bg) {
  return {
    r: Math.round(rgb.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(rgb.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(rgb.b * alpha + bg.b * (1 - alpha)),
  };
}

function resolveColor(tokenName, theme, parentBg) {
  const val = THEMES[theme][tokenName];
  if (!val) return null;
  if (val.startsWith('#')) return hexToRgb(val);
  
  const rgbaMatch = val.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgbaMatch) {
    const rgb = { r: +rgbaMatch[1], g: +rgbaMatch[2], b: +rgbaMatch[3] };
    const alpha = +rgbaMatch[4];
    if (parentBg) {
      return blendAlpha(rgb, alpha, parentBg);
    }
    // Without parent bg, blend with white for light mode, black for dark
    const fallbackBg = theme === 'light' ? hexToRgb('#ffffff') : hexToRgb('#000000');
    return blendAlpha(rgb, alpha, fallbackBg);
  }
  
  const m = val.match(/\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return null;
}

let allPass = true;

for (const [themeName] of Object.entries(THEMES)) {
  console.log(`\n=== ${themeName.toUpperCase()} MODE ===`);
  
  for (const [fgToken, bgToken, , label, threshold] of PAIRS) {
    const fg = getResolvedToken(fgToken, themeName);
    const bg = getResolvedToken(bgToken, themeName);
    
    if (!fg || !bg) {
      console.log(`  SKIP  ${label} (could not resolve ${fgToken || ''}/${bgToken || ''})`);
      continue;
    }
    
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= threshold;
    const status = pass ? 'PASS' : 'FAIL';
    const marker = pass ? '✓' : '✗';
    
    console.log(`  ${marker} ${status}  ${ratio.toFixed(2)}:1  ${label} (threshold ${threshold}:1)`);
    
    if (!pass) allPass = false;
  }
}

console.log(`\n${allPass ? '✓ All pairs pass contrast thresholds.' : '✗ Some pairs fail contrast thresholds.'}`);
process.exit(allPass ? 0 : 1);
