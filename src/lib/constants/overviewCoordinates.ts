import { FDIToothNumber, SurfaceId } from '@/lib/types/clinical';

// Measurement coordinates for the Resumen (overview) dentition schematic,
// ported from periodontalchart-online.com js/coordinates/overview_coordinates.js.
// The SVG canvas is 1000x300; right-sextant coordinates are defined and the
// left side is mirrored around x = 500 (x' = 1000 - x), exactly as the
// original does at runtime.

export interface OverviewPoint {
  x: number;
  y: number;
}

// Per-site polygon ids use these merged letter keys: the three buccal
// interproximals collapse into d (distal) / b (mid) / m (mesial) etc.
export const OVERVIEW_SITE_AREA_MAP: Record<SurfaceId, 'm' | 'd' | 'b' | 'p' | 'l'> = {
  db: 'd',
  dp: 'd',
  dl: 'd',
  mb: 'm',
  mp: 'm',
  ml: 'm',
  b: 'b',
  p: 'p',
  l: 'l',
};

// Polygon letter keys greyed out for missing teeth (site's toAreas list).
export const OVERVIEW_MISSING_SITE_LETTERS = ['d', 'b', 'p', 'm', 'l'] as const;

// ---------------------------------------------------------------------------
// PD text slots: 8 sextants x 8 teeth x 3 surfaces, in the site's draw order.
// ---------------------------------------------------------------------------

const UPPER_IDS_RIGHT: FDIToothNumber[] = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_IDS_LEFT: FDIToothNumber[] = [28, 27, 26, 25, 24, 23, 22, 21];
const LOWER_IDS_RIGHT: FDIToothNumber[] = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_IDS_LEFT: FDIToothNumber[] = [38, 37, 36, 35, 34, 33, 32, 31];

const BUCCAL_AREAS: SurfaceId[] = ['db', 'b', 'mb'];
const PALATAL_AREAS: SurfaceId[] = ['dp', 'p', 'mp'];
const LINGUAL_AREAS: SurfaceId[] = ['dl', 'l', 'ml'];

const overviewCoordinatesUpperBuccalRight: OverviewPoint[] = [
  { x: 110, y: 54 },
  { x: 132, y: 46 },
  { x: 153, y: 46 },
  { x: 169, y: 45 },
  { x: 190, y: 43 },
  { x: 212, y: 45 },
  { x: 227, y: 45 },
  { x: 248, y: 43 },
  { x: 268, y: 45 },
  { x: 285, y: 45 },
  { x: 299, y: 43 },
  { x: 312, y: 45 },
  { x: 326, y: 45 },
  { x: 340, y: 43 },
  { x: 355, y: 45 },
  { x: 370, y: 45 },
  { x: 384, y: 43 },
  { x: 398, y: 45 },
  { x: 411, y: 45 },
  { x: 427, y: 43 },
  { x: 442, y: 45 },
  { x: 458, y: 45 },
  { x: 474, y: 43 },
  { x: 492, y: 45 },
];

const overviewCoordinatesUpperPalatalRight: OverviewPoint[] = [
  { x: 108, y: 123 },
  { x: 129, y: 130 },
  { x: 149, y: 128 },
  { x: 167, y: 130 },
  { x: 188, y: 130 },
  { x: 208, y: 128 },
  { x: 226, y: 130 },
  { x: 248, y: 130 },
  { x: 268, y: 127 },
  { x: 285, y: 124 },
  { x: 299, y: 127 },
  { x: 312, y: 124 },
  { x: 326, y: 121 },
  { x: 340, y: 125 },
  { x: 355, y: 121 },
  { x: 370, y: 121 },
  { x: 384, y: 125 },
  { x: 398, y: 121 },
  { x: 411, y: 113 },
  { x: 427, y: 117 },
  { x: 442, y: 110 },
  { x: 458, y: 112 },
  { x: 474, y: 117 },
  { x: 492, y: 111 },
];

const overviewCoordinatesLowerLingualRight: OverviewPoint[] = [
  { x: 108, y: 190 },
  { x: 138, y: 180 },
  { x: 160, y: 180 },
  { x: 179, y: 181 },
  { x: 204, y: 176 },
  { x: 230, y: 178 },
  { x: 247, y: 181 },
  { x: 275, y: 185 },
  { x: 297, y: 190 },
  { x: 312, y: 190 },
  { x: 327, y: 190 },
  { x: 340, y: 192 },
  { x: 356, y: 198 },
  { x: 370, y: 190 },
  { x: 385, y: 196 },
  { x: 399, y: 195 },
  { x: 413, y: 190 },
  { x: 428, y: 194 },
  { x: 445, y: 206 },
  { x: 454, y: 192 },
  { x: 463, y: 206 },
  { x: 480, y: 206 },
  { x: 486, y: 192 },
  { x: 492, y: 206 },
];

const overviewCoordinatesLowerBuccalRight: OverviewPoint[] = [
  { x: 110, y: 255 },
  { x: 138, y: 265 },
  { x: 160, y: 264 },
  { x: 179, y: 267 },
  { x: 204, y: 270 },
  { x: 230, y: 268 },
  { x: 247, y: 270 },
  { x: 275, y: 273 },
  { x: 299, y: 268 },
  { x: 315, y: 270 },
  { x: 330, y: 273 },
  { x: 345, y: 270 },
  { x: 357, y: 270 },
  { x: 371, y: 274 },
  { x: 386, y: 270 },
  { x: 402, y: 270 },
  { x: 416, y: 273 },
  { x: 429, y: 270 },
  { x: 445, y: 270 },
  { x: 454, y: 285 },
  { x: 463, y: 270 },
  { x: 478, y: 270 },
  { x: 486, y: 285 },
  { x: 492, y: 270 },
];

const mirrorRight = (coords: OverviewPoint[]): OverviewPoint[] =>
  coords.map(({ x, y }) => ({ x: 500 + (500 - x), y }));

const overviewCoordinatesUpperBuccalLeft = mirrorRight(overviewCoordinatesUpperBuccalRight);
const overviewCoordinatesUpperPalatalLeft = mirrorRight(overviewCoordinatesUpperPalatalRight);
const overviewCoordinatesLowerLingualLeft = mirrorRight(overviewCoordinatesLowerLingualRight);
const overviewCoordinatesLowerBuccalLeft = mirrorRight(overviewCoordinatesLowerBuccalRight);

export interface OverviewPdTextSlot {
  tooth: FDIToothNumber;
  surface: SurfaceId;
  x: number;
  y: number;
}

function createTextSlots(
  coords: OverviewPoint[],
  ids: FDIToothNumber[],
  areas: SurfaceId[],
): OverviewPdTextSlot[] {
  return coords.map((coord, index) => ({
    tooth: ids[Math.floor(index / 3)],
    surface: areas[index % 3],
    x: coord.x,
    y: coord.y,
  }));
}

export const OVERVIEW_PD_TEXT_SLOTS: OverviewPdTextSlot[] = [
  ...createTextSlots(overviewCoordinatesUpperBuccalRight, UPPER_IDS_RIGHT, BUCCAL_AREAS),
  ...createTextSlots(overviewCoordinatesUpperBuccalLeft, UPPER_IDS_LEFT, BUCCAL_AREAS),
  ...createTextSlots(overviewCoordinatesUpperPalatalRight, UPPER_IDS_RIGHT, PALATAL_AREAS),
  ...createTextSlots(overviewCoordinatesUpperPalatalLeft, UPPER_IDS_LEFT, PALATAL_AREAS),
  ...createTextSlots(overviewCoordinatesLowerLingualRight, LOWER_IDS_RIGHT, LINGUAL_AREAS),
  ...createTextSlots(overviewCoordinatesLowerLingualLeft, LOWER_IDS_LEFT, LINGUAL_AREAS),
  ...createTextSlots(overviewCoordinatesLowerBuccalRight, LOWER_IDS_RIGHT, BUCCAL_AREAS),
  ...createTextSlots(overviewCoordinatesLowerBuccalLeft, LOWER_IDS_LEFT, BUCCAL_AREAS),
];

// ---------------------------------------------------------------------------
// Furcation marker coordinates (molars + upper first premolar 14).
// ---------------------------------------------------------------------------

const furcationOverviewCoordinatesRight: Record<string, OverviewPoint> = {
  furcation_18_dp: { x: 110, y: 100 },
  furcation_18_b: { x: 129, y: 61 },
  furcation_18_mp: { x: 145, y: 100 },
  furcation_17_dp: { x: 163, y: 108 },
  furcation_17_b: { x: 188, y: 54 },
  furcation_17_mp: { x: 202, y: 108 },
  furcation_16_dp: { x: 226, y: 108 },
  furcation_16_b: { x: 248, y: 54 },
  furcation_16_mp: { x: 267, y: 103 },
  furcation_14_dp: { x: 326, y: 92 },
  furcation_14_mp: { x: 355, y: 92 },
  furcation_48_l: { x: 138, y: 190 },
  furcation_48_b: { x: 138, y: 243 },
  furcation_47_l: { x: 204, y: 188 },
  furcation_47_b: { x: 204, y: 245 },
  furcation_46_l: { x: 275, y: 195 },
  furcation_46_b: { x: 275, y: 249 },
};

function mirrorKey(key: string): string | null {
  // 1x -> 2x and 4x -> 3x quadrants mirror around x = 500 (site's regex ^furcation_([134])(\d)_([a-z]{1,2})$)
  const match = key.match(/^furcation_([134])(\d)_([a-z]{1,2})$/);
  if (!match) return null;
  const quadrant = match[1];
  const mirrorQuadrant = quadrant === '1' ? '2' : quadrant === '4' ? '3' : quadrant;
  return `furcation_${mirrorQuadrant}${match[2]}_${match[3]}`;
}

export const FURCATION_OVERVIEW_COORDINATES: Record<string, OverviewPoint> = {};
for (const key of Object.keys(furcationOverviewCoordinatesRight)) {
  FURCATION_OVERVIEW_COORDINATES[key] = furcationOverviewCoordinatesRight[key];
  const mirrored = mirrorKey(key);
  if (mirrored) {
    const { x, y } = furcationOverviewCoordinatesRight[key];
    FURCATION_OVERVIEW_COORDINATES[mirrored] = { x: 500 + (500 - x), y };
  }
}

// ---------------------------------------------------------------------------
// Implant marker coordinates.
// ---------------------------------------------------------------------------

const implantOverviewCoordinatesRight: Record<string, OverviewPoint> = {
  implant_18: { x: 130, y: 85 },
  implant_17: { x: 183, y: 84 },
  implant_16: { x: 242, y: 82 },
  implant_15: { x: 299, y: 77 },
  implant_14: { x: 340, y: 75 },
  implant_13: { x: 384, y: 75 },
  implant_12: { x: 427, y: 71 },
  implant_11: { x: 473, y: 71 },
  implant_48: { x: 139, y: 214 },
  implant_47: { x: 204, y: 212 },
  implant_46: { x: 273, y: 217 },
  implant_45: { x: 328, y: 223 },
  implant_44: { x: 375, y: 223 },
  implant_43: { x: 416, y: 225 },
  implant_42: { x: 454, y: 235 },
  implant_41: { x: 486, y: 235 },
};

export const IMPLANT_OVERVIEW_COORDINATES: Record<string, OverviewPoint> = {};
for (const key of Object.keys(implantOverviewCoordinatesRight)) {
  IMPLANT_OVERVIEW_COORDINATES[key] = implantOverviewCoordinatesRight[key];
  const match = key.match(/^implant_([134])(\d)$/);
  if (match) {
    const quadrant = match[1];
    const mirrorQuadrant = quadrant === '1' ? '2' : quadrant === '4' ? '3' : quadrant;
    const { x, y } = implantOverviewCoordinatesRight[key];
    IMPLANT_OVERVIEW_COORDINATES[`implant_${mirrorQuadrant}${match[2]}`] = { x: 500 + (500 - x), y };
  }
}
