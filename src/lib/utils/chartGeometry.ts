import { FDIToothNumber, SurfaceId } from '@/lib/types/clinical';
import { isUpperTooth } from '@/lib/utils/toothAnatomy';

export const SVG_VIEWBOX_WIDTH = 1800;
// The background JPGs (3248x652) must render without vertical distortion, so
// the canvas keeps the 1800-unit width of the uniform tooth grid and takes
// the height matching the JPG's natural aspect ratio. This also makes app
// units isotropic with the JPG, so teeth render at their true proportions.
export const SVG_VIEWBOX_HEIGHT = (SVG_VIEWBOX_WIDTH / 3248) * 652; // ≈ 361.33
export const TOOTH_PITCH = 110;
export const TOOTH_CENTER_OFFSET = 65;
export const MAX_PROBING_DEPTH = 12;

// Per-site polygon x coordinates in the site's SVG space (790-unit viewBox),
// copied from the site's js/coordinates/polygon_coordinates.js
// (window.xCoordinates). Keys: FDI tooth -> surface -> x.
export const SITE_X_COORDINATES: Record<number, Record<string, number>> = {
  11: { db: 345, mb: 377, dp: 344, mp: 375 },
  12: { mb: 329, mp: 329, db: 305, dp: 303 },
  13: { mb: 287, mp: 290, db: 261, dp: 263 },
  14: { mb: 245, mp: 246, db: 221, dp: 221 },
  15: { mb: 206, mp: 204, db: 180, dp: 178 },
  16: { mb: 168, mp: 162, db: 114, dp: 116 },
  17: { mb: 103, mp: 100, db: 63, dp: 61 },
  18: { mb: 49, mp: 48, db: 12, dp: 8 },
  21: { db: 446, mb: 415, dp: 448, mp: 417 },
  22: { mb: 463, mp: 463, db: 487, dp: 489 },
  23: { mb: 504, mp: 502, db: 532, dp: 530 },
  24: { mb: 546, mp: 546, db: 572, dp: 571 },
  25: { mb: 586, mp: 588, db: 612, dp: 614 },
  26: { mb: 624, mp: 629, db: 678, dp: 677 },
  27: { mb: 689, mp: 693, db: 728, dp: 732 },
  28: { mb: 743, mp: 745, db: 780, dp: 784 },
  31: { db: 431, mb: 412, dl: 432, ml: 415 },
  32: { mb: 445, ml: 450, db: 465, dl: 468 },
  33: { mb: 483, ml: 484, db: 504, dl: 504 },
  34: { mb: 522, ml: 521, db: 541, dl: 544 },
  35: { mb: 562, ml: 562, db: 581, dl: 585 },
  36: { mb: 604, ml: 604, db: 653, dl: 649 },
  37: { mb: 669, ml: 664, db: 716, dl: 712 },
  38: { mb: 733, ml: 729, db: 778, dl: 778 },
  41: { db: 360, mb: 379, dl: 359, ml: 378 },
  42: { mb: 346, ml: 342, db: 327, dl: 324 },
  43: { mb: 309, ml: 307, db: 287, dl: 287 },
  44: { mb: 270, ml: 270, db: 250, dl: 248 },
  45: { mb: 230, ml: 230, db: 209, dl: 206 },
  46: { mb: 186, ml: 186, db: 139, dl: 142 },
  47: { mb: 123, ml: 127, db: 75, dl: 79 },
  48: { mb: 59, ml: 63, db: 13, dl: 14 },
};

// Maps site SVG x units onto our canvas. Measured live on the site: the
// polygon SVG (viewBox 790) is displayed 787px wide and its left edge sits
// 9px right of the JPG's left edge (JPG shown at 806.671875px for a 3248px
// bitmap). Verified against the tooth-11 GM polyline (SVG x=345 lands exactly
// on screen x=969.94). Same coordinate frame as the implant overlay mapping.
export function siteSvgXToApp(x: number): number {
  return (x * (787 / 790) + 9) * (SVG_VIEWBOX_WIDTH / 806.671875);
}

export type ChartViewId =
  | 'upper-svg-placeholder-01'
  | 'upper-svg-placeholder-02'
  | 'lower-svg-placeholder-01'
  | 'lower-svg-placeholder-02';

export type ChartViewKind = 'buccal' | 'oral';

export interface ChartViewConfig {
  id: ChartViewId;
  label: string;
  kind: ChartViewKind;
  rootDirection: -1 | 1;
  zeroLineY: number;
}

const SITE_VIEWBOX_HEIGHT = 162;
const SITE_MM_SCALE = 6.45; // site units per mm (js/renderer/chart_renderer.js)
const SITE_CEJ_Y: Record<ChartViewId, number> = {
  'upper-svg-placeholder-01': 106,
  'upper-svg-placeholder-02': 53,
  'lower-svg-placeholder-01': 108,
  'lower-svg-placeholder-02': 61,
};

// The site's chart layer is a 790x162 SVG (preserveAspectRatio absent ->
// xMidYMid meet) inside a 162.5px-tall .chart-placeholder slot, and the tooth
// raster is a 3248x652 JPG in an 806.67x166.56 box (102.5% of the slot) with
// object-fit: contain. Both layers are letterboxed differently. Measured live
// (probe6): the site's own mm lines confirm the uniform scale 787/790 (slope
// 6.4254px per 6.45 units) with the SVG letterboxed 0.5576px inside its slot,
// and the JPG painted 161.949px tall inside its 166.5625px element box
// (letterbox 2.3067px). The zero line (SVG y=106) lands on screen 954.155,
// i.e. app y = 231.72. These constants reproduce that box model exactly:
//   svg slot px   Y = (162.5 - 162 * S) / 2 + y * S          (S = 787/790)
//   jpg element px  Y = 2.3067 + r * (652 * 806.671875 / 3248) / 161.949
//   app_y = (y * S + Vy - Jy) * (1800 / 806.671875)
const SITE_SVG_SCALE = 787 / 790;
const SITE_SVG_TOP_OFFSET = (162.5 - 162 * SITE_SVG_SCALE) / 2;
const SITE_JPG_DISPLAY_WIDTH = 806.671875;
const SITE_JPG_ELEMENT_HEIGHT = 162.5 * 1.025;
const SITE_JPG_TOP_OFFSET =
  (SITE_JPG_ELEMENT_HEIGHT - 652 * (SITE_JPG_DISPLAY_WIDTH / 3248)) / 2;
const SITE_DISPLAY_TO_APP = SVG_VIEWBOX_WIDTH / SITE_JPG_DISPLAY_WIDTH;

// Maps site SVG y units onto our canvas, accounting for the site's vertical
// letterboxing of both the SVG layer and the background raster.
export function siteSvgYToApp(y: number): number {
  return (y * SITE_SVG_SCALE + SITE_SVG_TOP_OFFSET - SITE_JPG_TOP_OFFSET) * SITE_DISPLAY_TO_APP;
}

// App-space units per mm: the site's mm scale mapped onto our canvas, so
// polygons, furcation offsets and the mm grid share one consistent scale.
export const POLYGON_SCALE = SITE_MM_SCALE * SITE_SVG_SCALE * SITE_DISPLAY_TO_APP;

export const CHART_VIEWS: Record<ChartViewId, ChartViewConfig> = {
  'upper-svg-placeholder-01': {
    id: 'upper-svg-placeholder-01',
    label: 'Vestibular Superior',
    kind: 'buccal',
    rootDirection: -1,
    zeroLineY: siteSvgYToApp(SITE_CEJ_Y['upper-svg-placeholder-01']),
  },
  'upper-svg-placeholder-02': {
    id: 'upper-svg-placeholder-02',
    label: 'Palatino Superior',
    kind: 'oral',
    rootDirection: 1,
    zeroLineY: siteSvgYToApp(SITE_CEJ_Y['upper-svg-placeholder-02']),
  },
  'lower-svg-placeholder-01': {
    id: 'lower-svg-placeholder-01',
    label: 'Lingual Inferior',
    kind: 'oral',
    rootDirection: -1,
    zeroLineY: siteSvgYToApp(SITE_CEJ_Y['lower-svg-placeholder-01']),
  },
  'lower-svg-placeholder-02': {
    id: 'lower-svg-placeholder-02',
    label: 'Vestibular Inferior',
    kind: 'buccal',
    rootDirection: 1,
    zeroLineY: siteSvgYToApp(SITE_CEJ_Y['lower-svg-placeholder-02']),
  },
};

export const UPPER_VIEW_TEETH: FDIToothNumber[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];

export const LOWER_VIEW_TEETH: FDIToothNumber[] = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export function isUpperView(viewId: ChartViewId): boolean {
  return viewId.startsWith('upper');
}

export function getViewTeeth(viewId: ChartViewId): FDIToothNumber[] {
  return isUpperView(viewId) ? UPPER_VIEW_TEETH : LOWER_VIEW_TEETH;
}

export function getViewConfig(viewId: ChartViewId): ChartViewConfig {
  return CHART_VIEWS[viewId];
}

export function getToothCenterX(tooth: FDIToothNumber, viewId: ChartViewId): number {
  const index = getViewTeeth(viewId).indexOf(tooth);
  if (index < 0) return TOOTH_CENTER_OFFSET;
  return TOOTH_CENTER_OFFSET + index * TOOTH_PITCH;
}

export function getMesialOnRight(tooth: FDIToothNumber): boolean {
  return (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
}

// Surface x positions follow the site's hand-calibrated per-tooth
// coordinates (js/renderer/chart_renderer.js getXCoord): central surfaces
// are the midpoints of their two neighbours. This is what makes the GM/PD
// lines sit exactly on the raster teeth.
export function getSurfaceX(tooth: FDIToothNumber, surface: SurfaceId): number {
  const coords = SITE_X_COORDINATES[tooth];
  if (!coords) {
    // Defensive fallback: uniform grid position for unknown teeth.
    const teeth = UPPER_VIEW_TEETH;
    const index = teeth.includes(tooth)
      ? teeth.indexOf(tooth)
      : LOWER_VIEW_TEETH.indexOf(tooth);
    return TOOTH_CENTER_OFFSET + Math.max(index, 0) * TOOTH_PITCH;
  }

  let svgX: number | undefined;
  switch (surface) {
    case 'b':
      svgX = (coords.db + coords.mb) / 2;
      break;
    case 'p':
      svgX = (coords.dp + coords.mp) / 2;
      break;
    case 'l':
      svgX = (coords.dl + coords.ml) / 2;
      break;
    default:
      svgX = coords[surface];
  }

  if (svgX === undefined) {
    const teeth = UPPER_VIEW_TEETH;
    const index = teeth.includes(tooth)
      ? teeth.indexOf(tooth)
      : LOWER_VIEW_TEETH.indexOf(tooth);
    return TOOTH_CENTER_OFFSET + Math.max(index, 0) * TOOTH_PITCH;
  }

  return siteSvgXToApp(svgX);
}

export const BUCCAL_SURFACES: SurfaceId[] = ['mb', 'b', 'db'];
export const ORAL_SURFACES_UPPER: SurfaceId[] = ['mp', 'p', 'dp'];
export const ORAL_SURFACES_LOWER: SurfaceId[] = ['ml', 'l', 'dl'];

export function getApplicableSurfaces(tooth: FDIToothNumber): SurfaceId[] {
  return isUpperTooth(tooth)
    ? [...BUCCAL_SURFACES, ...ORAL_SURFACES_UPPER]
    : [...BUCCAL_SURFACES, ...ORAL_SURFACES_LOWER];
}

export function getViewSurfaces(viewId: ChartViewId): SurfaceId[] {
  return CHART_VIEWS[viewId].kind === 'buccal'
    ? BUCCAL_SURFACES
    : isUpperView(viewId)
      ? ORAL_SURFACES_UPPER
      : ORAL_SURFACES_LOWER;
}

export function getViewSurfacesOrdered(tooth: FDIToothNumber, viewId: ChartViewId): SurfaceId[] {
  return getViewSurfaces(viewId)
    .slice()
    .sort((a, b) => getSurfaceX(tooth, a) - getSurfaceX(tooth, b));
}

export interface ChartPoint {
  x: number;
  y: number;
}

export function getAdjustedGm(gm: number, isGmInverted: boolean): number {
  return isGmInverted ? -gm : gm;
}

export function getGmY(viewId: ChartViewId, gm: number, isGmInverted: boolean): number {
  const { rootDirection, zeroLineY } = CHART_VIEWS[viewId];
  return zeroLineY - rootDirection * getAdjustedGm(gm, isGmInverted) * POLYGON_SCALE;
}

export function getPdY(viewId: ChartViewId, gmY: number, pd: number): number {
  return gmY + CHART_VIEWS[viewId].rootDirection * pd * POLYGON_SCALE;
}

export function getMucY(viewId: ChartViewId, gmY: number, muc: number): number {
  return gmY + CHART_VIEWS[viewId].rootDirection * muc * POLYGON_SCALE;
}

export function formatPoints(points: ChartPoint[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

// The site's chart renderer draws 16 horizontal mm lines at 1 mm intervals
// from the zero (CEJ) line into the root area of each view, plus the zero
// line itself (js/renderer/chart_renderer.js:567-577).
export function getMmLineYs(viewId: ChartViewId): number[] {
  const { rootDirection, zeroLineY } = CHART_VIEWS[viewId];
  const ys: number[] = [];
  for (let i = 1; i <= 16; i++) {
    ys.push(Number((zeroLineY + i * POLYGON_SCALE * rootDirection).toFixed(2)));
  }
  return ys;
}
