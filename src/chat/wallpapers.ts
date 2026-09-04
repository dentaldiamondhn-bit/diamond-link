/**
 * Chat pane wallpaper.
 *
 * The "default" wallpaper mimics WhatsApp's native chat background: a warm,
 * subtle base color with faint doodles scattered across it. It's an inline SVG
 * data URI (no external request, cached with the app shell, works offline).
 *
 * The tile is a single 60×60 unit that tiles seamlessly (backgroundSize: 60px
 * in ChatPane / ChatSettingsPanel). Doodles are drawn on a regular grid and
 * kept within the interior margins, so nothing is clipped at tile seams.
 *
 * A custom wallpaper (user-uploaded image) is applied in chat/chatSettings and
 * ChatPane via wallpaper_type === 'custom'.
 */

// Each doodle is drawn centred at (cx, cy), staying ~5px away from the tile
// edges so tiling has no visible seams. Shapes stay small and crisp.
const doodle = (
  cx: number,
  cy: number,
  kind: 'dot' | 'cross' | 'squiggle' | 'star' | 'heart' | 'moon'
): string => {
  switch (kind) {
    case 'dot':
      return `<circle cx="${cx}" cy="${cy}" r="1.8" fill="currentColor" stroke="none"/>`;
    case 'cross':
      return `<path d="M${cx - 3} ${cy - 3} l6 6 M${cx + 3} ${cy - 3} l-6 6"/>`;
    case 'squiggle':
      // A gentle S-curve ~10px wide.
      return `<path d="M${cx - 5} ${cy - 2} c2 -2.4 4 -2.4 5 0 c1 2.4 3 2.4 5 0" transform="translate(0 ${2})"/>`;
    case 'star':
      // Five-point star (~9px diameter).
      return (
        `<path d="M${cx} ${cy - 4.5} l1.4 2.85 3.1 0.45 -2.25 2.2 0.53 3.05 -2.78 -1.46 -2.78 1.46 0.53 -3.05 -2.25 -2.2 3.1 -0.45 z"/>`
      );
    case 'heart':
      // Small heart centred around (cx, cy).
      return (
        `<path d="M${cx} ${cy + 2} c-1.8-2.7-4.5-1.4-4.5 1.3 c0 2.3 3.1 3.7 4.5 4.6 c1.4-0.9 4.5-2.3 4.5-4.6 c0-2.7-2.7-4-4.5-1.3z"/>`
      );
    case 'moon':
      // Crescent.
      return (
        `<path d="M${cx + 2} ${cy} a3.6 3.6 0 1 0 -3.6 3.6 a2.6 2.6 0 0 1 3.6 -3.6z"/>`
      );
  }
};

// Grid of doodles across a 60×60 tile (3 columns × 4 rows), kept inside the
// [7, 53] box so seams are clean. Higher density than the previous sparse tile.
const DOODLES: Array<
  [number, number, 'dot' | 'cross' | 'squiggle' | 'star' | 'heart' | 'moon']
> = [
  // Row 1
  [15, 12, 'star'],
  [30, 11, 'squiggle'],
  [45, 13, 'dot'],
  // Row 2
  [14, 26, 'heart'],
  [30, 26, 'cross'],
  [46, 25, 'moon'],
  // Row 3
  [15, 38, 'dot'],
  [30, 39, 'star'],
  [45, 38, 'squiggle'],
  // Row 4
  [14, 50, 'moon'],
  [30, 50, 'heart'],
  [46, 51, 'cross'],
];

const TILE = 60;
const gl = DOODLES.map(([x, y, k]) => doodle(x, y, k)).join('');

function makeWallpaper(base: string, stroke: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><rect width="${TILE}" height="${TILE}" fill="${base}"/><g fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${gl}</g></svg>`
  )}")`;
}

/**
 * WhatsApp-style default wallpaper (60×60 seamless tile, base + doodles).
 * Two variants so the chat pane follows the app theme: a warm light base and a
 * dark base with subtle light doodles.
 */
export const DEFAULT_WALLPAPER = {
  light: makeWallpaper('#efeae2', '#cfc5b5'),
  dark: makeWallpaper('#202c33', '#3c4a54'),
};
