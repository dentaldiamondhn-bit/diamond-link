// Pure logic for the Resumen (overview) modal: dentition schematic of PI/BOP
// site polygons, sextant PD texts, furcation and implant markers.
// Ported from periodontalchart-online.com js/renderer/overview_renderer.js.
//
// Self-contained (no imports) so it can run under plain `node --test`, like
// periodontalClassification.ts. Data tables (site polygon paths, sextant slot
// coordinates, furcation/implant coordinates) are passed in by the caller
// from the constants modules.

export type OverviewChartRecord = Record<string, any>;

// The site's analyzeJsonDataOverviewSVG counts exactly these 6 surfaces per
// present tooth: the 3 buccal ones plus the 3 oral-side ones of the arch.
const OVERVIEW_SURFACES_UPPER = ['db', 'b', 'mb', 'dp', 'p', 'mp'];
const OVERVIEW_SURFACES_LOWER = ['db', 'b', 'mb', 'dl', 'l', 'ml'];

// The site's areaMap: measurement surfaces merge into the site polygons
// m / d / b / p / l of the overview SVG (js/misc mapping in
// loadAndRenderOverviewSvg).
const AREA_TO_LETTER: Record<string, string> = {
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

// All FDI positions the overview map can address.
const ALL_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

function readNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// "Der Zahn entscheidet" — a position counts as present only when its
// tooth_X flag is on. Positions without the flag are skipped everywhere,
// matching the site's positionBesetz/data-completeness behaviour.
function isPresent(rec: OverviewChartRecord, tooth: number): boolean {
  const value = rec[`tooth_${tooth}`];
  return value === '1' || value === 1 || value === true;
}

function isUpper(tooth: number): boolean {
  const quadrant = Math.floor(tooth / 10);
  return quadrant === 1 || quadrant === 2;
}

export interface OverviewStats {
  totalSites: number;
  bopCount: number;
  piCount: number;
  pd4Count: number;
  bopPercent: number;
  piPercent: number;
  pd4Percent: number;
}

// analizeJsonDataOverviewSVG: BOP / PI / PD>=4 percentages across the 6
// sound surfaces of every present tooth. Percentages round like the site
// (whole numbers); an empty chart returns 0 instead of the site's NaN.
export function computeOverviewStats(rec: OverviewChartRecord): OverviewStats {
  let totalSites = 0;
  let bop = 0;
  let pi = 0;
  let pd4 = 0;

  for (const tooth of ALL_FDI_TEETH) {
    if (!isPresent(rec, tooth)) continue;

    const surfaces = isUpper(tooth) ? OVERVIEW_SURFACES_UPPER : OVERVIEW_SURFACES_LOWER;
    totalSites += surfaces.length;

    for (const surface of surfaces) {
      if (readNum(rec[`bop_${tooth}_${surface}`]) === 1) bop++;
      if (readNum(rec[`pi_${tooth}_${surface}`]) === 1) pi++;
      if (readNum(rec[`pd_${tooth}_${surface}`]) >= 4) pd4++;
    }
  }

  const percent = (count: number) => (totalSites === 0 ? 0 : Math.round((count / totalSites) * 100));

  return {
    totalSites,
    bopCount: bop,
    piCount: pi,
    pd4Count: pd4,
    bopPercent: percent(bop),
    piPercent: percent(pi),
    pd4Percent: percent(pd4),
  };
}

export interface OverviewSiteFill {
  id: string;
  tooth: number;
  letter: string;
  bop: number;
  pi: number;
  missing: boolean;
}

function getContributingSurfaces(letter: string): string[] {
  return Object.keys(AREA_TO_LETTER).filter(surface => AREA_TO_LETTER[surface] === letter);
}

// Per-polygon flags for the PI (blue) and BOP (red) maps. Missing teeth
// (tooth_X == 0) are flagged so both maps grey them out; positions without
// the tooth flag at all are left untouched, exactly like the site.
export function getOverviewSiteFills(
  rec: OverviewChartRecord,
  paths: Array<{ id: string; d?: string }>,
): OverviewSiteFill[] {
  const fills: OverviewSiteFill[] = [];

  for (const path of paths) {
    const match = path.id.match(/^site_(\d{2})([mdbpl])$/);
    if (!match) continue;

    const tooth = parseInt(match[1], 10);
    const letter = match[2];

    if (rec[`tooth_${tooth}`] !== undefined && rec[`tooth_${tooth}`] !== null && !isPresent(rec, tooth)) {
      fills.push({ id: path.id, tooth, letter, bop: 0, pi: 0, missing: true });
      continue;
    }

    const surfaces = getContributingSurfaces(letter);
    const bop = surfaces.some(s => readNum(rec[`bop_${tooth}_${s}`]) === 1) ? 1 : 0;
    const pi = surfaces.some(s => readNum(rec[`pi_${tooth}_${s}`]) === 1) ? 1 : 0;

    fills.push({ id: path.id, tooth, letter, bop, pi, missing: false });
  }

  return fills;
}

export interface OverviewPdText {
  tooth: number;
  surface: string;
  value: number;
  x: number;
  y: number;
  highlighted: boolean;
}

// generateOverviewTextData: PD numbers rendered on the sextant slots for
// present teeth. Only PD > 3 is drawn; PD >= 6 gets the yellow circle.
export function buildOverviewPdTexts(
  rec: OverviewChartRecord,
  slots: Array<{ tooth: number; surface: string; x: number; y: number }>,
): OverviewPdText[] {
  const out: OverviewPdText[] = [];

  for (const slot of slots) {
    if (!isPresent(rec, slot.tooth)) continue;

    const value = readNum(rec[`pd_${slot.tooth}_${slot.surface}`]);
    if (value <= 3) continue;

    out.push({
      tooth: slot.tooth,
      surface: slot.surface,
      value,
      x: slot.x,
      y: slot.y,
      highlighted: value >= 6,
    });
  }

  return out;
}

export interface OverviewFurcationMarker {
  tooth: number;
  site: string;
  grade: number;
  x: number;
  y: number;
}

// Furcation markers exist only on present teeth without an implant
// (js/misc/position.js comment in the site's renderer).
export function getOverviewFurcationMarkers(
  rec: OverviewChartRecord,
  coordinates: Record<string, { x: number; y: number }>,
): OverviewFurcationMarker[] {
  const markers: OverviewFurcationMarker[] = [];

  for (const key of Object.keys(coordinates)) {
    const match = key.match(/^furcation_(\d{2})_([a-z]{1,2})$/);
    if (!match) continue;

    const tooth = parseInt(match[1], 10);
    if (!isPresent(rec, tooth)) continue;
    if (readNum(rec[`implant_${tooth}`]) > 0) continue;

    const grade = readNum(rec[key]);
    if (grade <= 0 || grade > 3) continue;

    const coord = coordinates[key];
    markers.push({ tooth, site: match[2], grade, x: coord.x, y: coord.y });
  }

  return markers;
}

export interface OverviewImplantMarker {
  tooth: number;
  status: number;
  x: number;
  y: number;
}

// Implant markers require an implant status of 1/2/3 on an occupied
// position (the site's implantatSichtbar).
export function getOverviewImplantMarkers(
  rec: OverviewChartRecord,
  coordinates: Record<string, { x: number; y: number }>,
): OverviewImplantMarker[] {
  const markers: OverviewImplantMarker[] = [];

  for (const key of Object.keys(coordinates)) {
    const match = key.match(/^implant_(\d{2})$/);
    if (!match) continue;

    const raw = rec[key];
    if (!['1', '2', '3'].includes(String(raw))) continue;

    const tooth = parseInt(match[1], 10);
    if (!isPresent(rec, tooth)) continue;

    const coord = coordinates[key];
    markers.push({ tooth, status: readNum(raw), x: coord.x, y: coord.y });
  }

  return markers;
}

// formatDateToGerman: 'YYYY-MM-DD' -> 'DD.MM.YYYY', anything else untouched.
export function formatOverviewDate(date: unknown): string {
  if (!date) return '';
  const parts = String(date).split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return String(date);
}
