import { FDIToothNumber, SurfaceId } from '@/lib/types/clinical';
import { getToothSpread, isUpperTooth } from '@/lib/utils/toothAnatomy';

export const POLYGON_SCALE = 6.45;
export const SVG_VIEWBOX_WIDTH = 1800;
export const SVG_VIEWBOX_HEIGHT = 240;
export const TOOTH_PITCH = 110;
export const TOOTH_CENTER_OFFSET = 65;
export const GRID_STEP = POLYGON_SCALE;
export const MAX_PROBING_DEPTH = 12;

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

export const CHART_VIEWS: Record<ChartViewId, ChartViewConfig> = {
  'upper-svg-placeholder-01': {
    id: 'upper-svg-placeholder-01',
    label: 'Vestibular Superior',
    kind: 'buccal',
    rootDirection: -1,
    zeroLineY: 157,
  },
  'upper-svg-placeholder-02': {
    id: 'upper-svg-placeholder-02',
    label: 'Palatino Superior',
    kind: 'oral',
    rootDirection: 1,
    zeroLineY: 78,
  },
  'lower-svg-placeholder-01': {
    id: 'lower-svg-placeholder-01',
    label: 'Lingual Inferior',
    kind: 'oral',
    rootDirection: -1,
    zeroLineY: 160,
  },
  'lower-svg-placeholder-02': {
    id: 'lower-svg-placeholder-02',
    label: 'Vestibular Inferior',
    kind: 'buccal',
    rootDirection: 1,
    zeroLineY: 90,
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

export function getSurfaceX(tooth: FDIToothNumber, surface: SurfaceId): number {
  const teeth = UPPER_VIEW_TEETH;
  const index = teeth.includes(tooth)
    ? teeth.indexOf(tooth)
    : LOWER_VIEW_TEETH.indexOf(tooth);
  const centre = TOOTH_CENTER_OFFSET + Math.max(index, 0) * TOOTH_PITCH;
  const spread = getToothSpread(tooth);
  const mesialRight = getMesialOnRight(tooth);

  switch (surface) {
    case 'mb':
    case 'mp':
    case 'ml':
      return centre + (mesialRight ? spread : -spread);
    case 'b':
    case 'p':
    case 'l':
      return centre;
    case 'db':
    case 'dp':
    case 'dl':
      return centre + (mesialRight ? -spread : spread);
    default:
      return centre;
  }
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

export function getGridLines(): number[] {
  const lines: number[] = [];
  for (let y = GRID_STEP; y < SVG_VIEWBOX_HEIGHT; y += GRID_STEP) {
    lines.push(Number(y.toFixed(2)));
  }
  return lines;
}
