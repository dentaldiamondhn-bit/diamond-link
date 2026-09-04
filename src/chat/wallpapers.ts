/**
 * Chat pane wallpapers.
 *
 * Several "default" wallpaper designs, each a flat seamless tile that mimics
 * WhatsApp/Telegram native chat backgrounds: a solid base colour with sparse,
 * organic doodles scattered at irregular positions/scales/rotations (no obvious
 * grid, no shade gradient).
 *
 * Tiles are inline SVG data URIs (no external request, cached with the app
 * shell, works offline). Each tile is 256×256 and tiles edge-to-edge
 * seamlessly: any doodle that crosses a tile edge is wrapped onto the opposite
 * edge (the classic seamless-tile technique), so there is no clipped square
 * seam and the pattern is continuous across repeats. backgroundSize is
 * WALLPAPER_TILE in ChatPane / ChatSettingsPanel.
 *
 * A custom wallpaper (user-uploaded image) is applied in chat/chatSettings and
 * ChatPane via wallpaper_type === 'custom'.
 */

/** Tile size in px; must equal the CSS backgroundSize used by consumers. */
export const WALLPAPER_TILE = 256;

type Kind =
  | 'circle'
  | 'cloud'
  | 'spiral'
  | 'droplet'
  | 'moon'
  | 'heart'
  | 'star'
  | 'leaf'
  | 'gem'
  | 'flower'
  | 'squiggle'
  | 'tooth'
  | 'brush'
  | 'smile'
  | 'cross'
  | 'sparkle'
  | 'wave'
  | 'bubble'
  | 'triangle'
  | 'ring'
  | 'diamond'
  | 'square'
  | 'plant';

const glyph = (kind: Kind): string => {
  switch (kind) {
    case 'circle':
      return '<circle r="10" fill="currentColor" stroke="none" opacity="0.5"/>';
    case 'cloud':
      return (
        '<path d="M-12 3 a7 7 0 0 1 6 -11 a9 9 0 0 1 15 0 a6 6 0 0 1 3 11z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'spiral':
      return (
        '<path d="M0 0 q2 -6 6 -6 q6 0 6 7 q0 8 -8 8 q-9 0 -9 -9 q0 -10 10 -10 q11 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
      );
    case 'droplet':
      return (
        '<path d="M0 -11 c5 6 8 9 8 13 a8 8 0 1 1 -16 0 c0 -4 3 -7 8 -13z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'moon':
      return (
        '<path d="M3 0 a9 9 0 1 0 5 8 a7.5 7.5 0 0 1 -5 -8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'heart':
      return (
        '<path d="M0 4 c-4 -6 -11 -3 -11 3 c0 6 7 9 11 11 c4 -2 11 -5 11 -11 c0 -6 -7 -9 -11 -3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'star':
      return (
        '<path d="M0 -11 l2.6 5.3 5.8 0.85 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -0.85z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
      );
    case 'leaf':
      return (
        '<path d="M-8 8 C-2 -4 2 -6 8 -8 C8 -2 4 4 -4 8 C-5 10 -7 9 -8 8z M-8 8 c2 -4 6 -7 10 -8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
      );
    case 'gem':
      return (
        '<path d="M0 -11 l7 4 l-2 7 l-5 4 l-5 -4 l-2 -7z M0 -3 l7 4 M0 -3 l-7 4 M-7 1 l2 7 M7 1 l-2 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
      );
    case 'flower':
      return (
        '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        ['0 -9', '8.5 -2.8', '5.3 7.3', '-5.3 7.3', '-8.5 -2.8']
          .map((p) => {
            const [px, py] = p.split(' ').map(Number);
            return `<line x1="0" y1="0" x2="${px}" y2="${py}"/>`;
          })
          .join('') +
        '<circle r="3.4" fill="currentColor" stroke="none"/></g>'
      );
    case 'squiggle':
      return (
        '<path d="M-10 -2 c3 -5 6 -5 7 0 c1 5 4 5 6 0 c2 -4 4 -4 6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
      );
    case 'tooth':
      // Stylised tooth (crown + two roots), filled subtle.
      return (
        '<path d="M-5.5 -6.5 C-5.5 -10 -2 -10.5 0 -8.5 C2 -10.5 5.5 -10 5.5 -6.5 C5.5 -1 4.5 4 3.5 8 C3 10 2 10 1.5 8 C1 5 1 4 0 2 C-0.5 3 -1 6 -1.5 8 C-2 10 -3 10 -3.5 8 C-4.5 4 -5.5 -1 -5.5 -6.5 Z" fill="currentColor" stroke="none" opacity="0.5"/>'
      );
    case 'brush':
      // Toothbrush: diagonal handle + head with bristles.
      return (
        '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<path d="M-9 -7 L7 5"/>' +
        '<path d="M4 2 l2 2 M1 9 l2 2 M-4 15 l2 2" stroke-width="1.2" opacity="0.7"/>' +
        '</g>'
      );
    case 'smile':
      // Smile arc + two eyes.
      return (
        '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<path d="M-7 1 a8 7 0 0 0 14 0"/>' +
        '<circle cx="-4.5" cy="-4" r="1.4" fill="currentColor" stroke="none"/>' +
        '<circle cx="4.5" cy="-4" r="1.4" fill="currentColor" stroke="none"/>' +
        '</g>'
      );
    case 'cross':
      // Medical plus.
      return (
        '<path d="M-3 -9 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" fill="currentColor" stroke="none" opacity="0.4"/>'
      );
    case 'sparkle':
      // Four-point sparkle.
      return (
        '<path d="M0 -9 C1 -3 3 -1 9 0 C3 1 1 3 0 9 C-1 3 -3 1 -9 0 C-3 -1 -1 -3 0 -9 Z" fill="currentColor" stroke="none" opacity="0.5"/>'
      );
    case 'wave':
      // Horizontal wave (3 humps).
      return (
        '<path d="M-11 0 q3 -7 7 0 q4 -7 8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      );
    case 'bubble':
      // Two bubbles + a tail (fun/speech-ish).
      return (
        '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
        '<circle cx="-4" cy="-3" r="7"/>' +
        '<circle cx="6" cy="5" r="4.5" opacity="0.8"/>' +
        '<path d="M1 4 L9 10" opacity="0.7"/>' +
        '</g>'
      );
    case 'triangle':
      return (
        '<path d="M0 -9 L8 7 L-8 7 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'ring':
      return '<circle r="8" fill="none" stroke="currentColor" stroke-width="2"/>';
    case 'diamond':
      return (
        '<path d="M0 -9 L8 0 L0 9 L-8 0 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'square':
      return (
        '<path d="M-7 -7 H7 V7 H-7 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
      );
    case 'plant':
      // Small sprig: stem + two leaves.
      return (
        '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<path d="M0 9 L0 -3"/>' +
        '<path d="M0 -1 C-6 -2 -7 4 -2 6" opacity="0.9"/>' +
        '<path d="M0 -5 C5 -8 9 -4 6 0" opacity="0.9"/>' +
        '</g>'
      );
  }
};

// Approx. outer radius (from centre, before scaling) of each glyph, used to
// detect edge crossings so the tile wraps seamlessly.
const GLYPH_R: Record<Kind, number> = {
  circle: 10,
  cloud: 14,
  spiral: 11,
  droplet: 11,
  moon: 9,
  heart: 11,
  star: 11,
  leaf: 12,
  gem: 12,
  flower: 9,
  squiggle: 10,
  tooth: 10,
  brush: 12,
  smile: 9,
  cross: 9,
  sparkle: 9,
  wave: 11,
  bubble: 11,
  triangle: 9,
  ring: 8,
  diamond: 9,
  square: 9,
  plant: 9,
};

type Scatter = [Kind, number, number, number, number, number]; // kind,x,y,scale,rot,opacity

// Scatter sets are spread unevenly across the 256×256 tile (no rows/columns),
// shapes vary in size and rotation so the pattern looks hand-placed.
const SCATTERS: Record<string, Scatter[]> = {
  classic: [
    ['cloud', 62, 62, 1.35, -8, 1],
    ['spiral', 210, 55, 1.1, 12, 0.95],
    ['flower', 148, 96, 0.95, 5, 1],
    ['star', 44, 150, 0.8, -16, 0.95],
    ['moon', 168, 150, 1.2, -4, 1],
    ['leaf', 236, 132, 1.0, 22, 0.9],
    ['heart', 108, 190, 1.1, 10, 1],
    ['droplet', 220, 196, 0.9, 30, 0.95],
    ['gem', 60, 226, 1.0, -6, 1],
    ['circle', 190, 224, 0.7, 0, 0.55],
    ['squiggle', 128, 232, 0.85, -12, 0.9],
    ['flower', 240, 62, 0.7, 18, 0.95],
    ['star', 118, 32, 1.05, 8, 0.95],
    ['cloud', 252, 78, 0.8, 10, 0.9],
  ],
  dental: [
    ['tooth', 66, 54, 1.3, -6, 1],
    ['brush', 206, 60, 1.1, 24, 0.95],
    ['smile', 146, 92, 1.05, 4, 1],
    ['cross', 42, 148, 1.1, 0, 0.9],
    ['tooth', 168, 144, 0.8, 16, 0.9],
    ['sparkle', 234, 130, 1.15, 8, 0.95],
    ['droplet', 104, 192, 1.0, 0, 0.95],
    ['brush', 220, 206, 0.85, -14, 0.95],
    ['tooth', 62, 228, 0.7, 10, 0.85],
    ['cross', 188, 226, 0.85, 0, 0.85],
    ['sparkle', 128, 226, 0.8, -10, 0.9],
    ['tooth', 246, 66, 0.9, 12, 0.9],
    ['smile', 120, 30, 0.85, -8, 0.95],
  ],
  azure: [
    ['wave', 70, 58, 1.35, 2, 1],
    ['bubble', 208, 62, 1.15, 0, 0.95],
    ['bubble', 150, 104, 0.7, 0, 0.9],
    ['droplet', 46, 150, 0.95, -6, 0.95],
    ['wave', 170, 146, 0.9, 4, 0.95],
    ['sparkle', 236, 132, 0.8, 8, 0.9],
    ['bubble', 110, 196, 0.9, 0, 0.95],
    ['wave', 226, 208, 0.85, -3, 0.9],
    ['droplet', 58, 224, 0.8, 10, 0.9],
    ['bubble', 188, 228, 0.65, 0, 0.85],
    ['wave', 122, 234, 0.9, 2, 0.9],
    ['bubble', 244, 64, 0.85, 0, 0.9],
    ['droplet', 120, 30, 0.85, -8, 0.9],
  ],
  mint: [
    ['leaf', 62, 62, 1.35, -6, 1],
    ['plant', 208, 58, 1.15, 10, 0.95],
    ['flower', 148, 98, 0.9, 5, 1],
    ['leaf', 42, 148, 0.85, 20, 0.95],
    ['plant', 168, 150, 0.9, -12, 0.95],
    ['flower', 236, 132, 0.75, 14, 0.9],
    ['leaf', 106, 196, 1.0, -8, 0.95],
    ['plant', 222, 208, 0.8, 8, 0.9],
    ['leaf', 58, 226, 0.8, -18, 0.9],
    ['flower', 188, 226, 0.7, 10, 0.9],
    ['leaf', 128, 232, 0.85, 6, 0.9],
    ['leaf', 244, 60, 0.9, 24, 0.9],
    ['plant', 118, 32, 0.85, -6, 0.9],
  ],
  geo: [
    ['triangle', 66, 62, 1.25, -10, 1],
    ['ring', 210, 58, 1.15, 0, 0.95],
    ['diamond', 148, 98, 0.95, 8, 1],
    ['triangle', 44, 150, 0.8, 15, 0.95],
    ['ring', 168, 150, 0.85, 0, 0.9],
    ['diamond', 236, 132, 0.75, -12, 0.9],
    ['triangle', 108, 196, 1.0, -8, 0.95],
    ['ring', 220, 210, 0.8, 0, 0.9],
    ['diamond', 58, 226, 0.85, 12, 0.9],
    ['circle', 188, 226, 0.55, 0, 0.5],
    ['square', 128, 232, 0.85, 8, 0.9],
    ['diamond', 244, 60, 0.9, 18, 0.9],
    ['ring', 118, 32, 0.95, 0, 0.95],
  ],
};

function group(kind: Kind, x: number, y: number, scale: number, rot: number, opacity: number): string {
  return (
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" opacity="${opacity}">` +
    glyph(kind) +
    '</g>'
  );
}

// Render a scatter set, wrapping any portion that crosses a tile edge back onto
// the opposite edge (classic seamless-tile technique: the wrapped copies are
// exact continuations, so the pattern is edge-continuous and never shows a
// clipped square seam).
function renderScatter(scatter: Scatter[], W: number): string {
  return scatter
    .map(([kind, x, y, scale, rot, opacity]) => {
      const r = GLYPH_R[kind] * scale;
      let out = group(kind, x, y, scale, rot, opacity);
      if (x - r < 0) out += group(kind, x + W, y, scale, rot, opacity);
      if (x + r > W) out += group(kind, x - W, y, scale, rot, opacity);
      if (y - r < 0) out += group(kind, x, y + W, scale, rot, opacity);
      if (y + r > W) out += group(kind, x, y - W, scale, rot, opacity);
      if (x - r < 0 && y - r < 0) out += group(kind, x + W, y + W, scale, rot, opacity);
      if (x - r < 0 && y + r > W) out += group(kind, x + W, y - W, scale, rot, opacity);
      if (x + r > W && y - r < 0) out += group(kind, x - W, y + W, scale, rot, opacity);
      if (x + r > W && y + r > W) out += group(kind, x - W, y - W, scale, rot, opacity);
      return out;
    })
    .join('');
}

function makeWallpaper(base: string, stroke: string, accent: string, scatter: Scatter[]): string {
  const W = WALLPAPER_TILE;
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">` +
      `<rect width="${W}" height="${W}" fill="${base}"/>` +
      `<g fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${renderScatter(scatter, W)}</g>` +
      '</svg>'
  )}")`;
}

interface Palette {
  base: string;
  stroke: string;
  accent: string;
}

interface DesignSpec {
  key: string;
  labelKey: string;
  scatter: Scatter[];
  light: Palette;
  dark: Palette;
}

const DESIGN_SPECS: DesignSpec[] = [
  {
    key: 'classic',
    labelKey: 'wallpaperClassic',
    scatter: SCATTERS.classic,
    light: { base: '#efeae2', stroke: '#cfc2ad', accent: '#7e6a4f' },
    dark: { base: '#0b141a', stroke: '#3e4c55', accent: '#2c3a44' },
  },
  {
    key: 'dental',
    labelKey: 'wallpaperDental',
    scatter: SCATTERS.dental,
    light: { base: '#e8f0f7', stroke: '#a8c3db', accent: '#5b8cae' },
    dark: { base: '#0d1a24', stroke: '#3b5a70', accent: '#274457' },
  },
  {
    key: 'azure',
    labelKey: 'wallpaperAzure',
    scatter: SCATTERS.azure,
    light: { base: '#e6f2fb', stroke: '#9ec4e4', accent: '#4f86b8' },
    dark: { base: '#0a1622', stroke: '#2f4f6b', accent: '#1d3448' },
  },
  {
    key: 'mint',
    labelKey: 'wallpaperMint',
    scatter: SCATTERS.mint,
    light: { base: '#e9f5ee', stroke: '#a9cfbd', accent: '#5d9e80' },
    dark: { base: '#0c1a14', stroke: '#345a48', accent: '#214537' },
  },
  {
    key: 'geo',
    labelKey: 'wallpaperGeo',
    scatter: SCATTERS.geo,
    light: { base: '#ececeb', stroke: '#c2c2bf', accent: '#8a8a86' },
    dark: { base: '#101418', stroke: '#41474d', accent: '#2b3035' },
  },
];

/** Ordered list of selectable default wallpaper keys. */
export const DEFAULT_WALLPAPER_KEYS = DESIGN_SPECS.map((d) => d.key);

function buildDesign(d: DesignSpec) {
  return {
    light: makeWallpaper(d.light.base, d.light.stroke, d.light.accent, d.scatter),
    dark: makeWallpaper(d.dark.base, d.dark.stroke, d.dark.accent, d.scatter),
  };
}

/** Map of default wallpaper key -> { light, dark } data URI. */
export const DEFAULT_WALLPAPERS: Record<string, { light: string; dark: string }> =
  Object.fromEntries(DESIGN_SPECS.map((d) => [d.key, buildDesign(d)]));

export type DefaultWallpaperKey = (typeof DEFAULT_WALLPAPER_KEYS)[number];

/** Backwards-compatible alias: the classic WhatsApp-style wallpaper. */
export const DEFAULT_WALLPAPER = DEFAULT_WALLPAPERS.classic;
