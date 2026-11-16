// Pure logic for the Historial (history) section of the periodontal study:
// longitudinal analysis, pairwise study comparison and recall suggestion.
// Ported from periodontalchart-online.com js/renderer/history_renderer.js.
//
// Self-contained (no imports) so it can run under plain `node --test`, like
// the other periodontal engines.

export type HistoryChartRecord = Record<string, any>;

// The six probing surfaces of each arch — the app stores measures only for
// these (mediciones rows), which matches the site's saved-data shape.
const HISTORY_SURFACES_UPPER = ['db', 'b', 'mb', 'dp', 'p', 'mp'];
const HISTORY_SURFACES_LOWER = ['db', 'b', 'mb', 'dl', 'l', 'ml'];

// Every site an implant may carry in the data model.
const IMPLANT_STATUSES = ['1', '2', '3'];

const ALL_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

const MESES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// getHeatmapColor's threshold scale (d3.scaleThreshold with these domains and
// 10 range colours; a value >= 5 falls past the last domain entry, exactly
// like d3 mapping to an undefined range colour).
const HEATMAP_DOMAIN = [-10, -5, -2, -1.5, -1, -0.5, 0.00001, 1, 2, 5];
const HEATMAP_RANGE = [
  '#00FF00', '#00E700', '#33FF00', '#66FF00', '#99FF00',
  '#B2FF00', '#F7F700', 'orange', '#DF48A1', '#B9207A',
];

function readNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// "Der Zahn entscheidet" (js/misc/position.js): the tooth switch alone decides
// whether a position counts as occupied — an implant never rescues a
// switched-off tooth.
function isPresent(rec: HistoryChartRecord, tooth: number): boolean {
  const value = rec[`tooth_${tooth}`];
  return value === '1' || value === 1 || value === true;
}

function isUpper(tooth: number): boolean {
  const quadrant = Math.floor(tooth / 10);
  return quadrant === 1 || quadrant === 2;
}

// Percentage the site's way: Math.round(x / total * 1000) / 10 (one decimal).
function percent(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

// parseDate(): studies carry ISO (JJJJ-MM-TT) and dotted (TT.MM.JJJJ) dates.
// Both parse to UTC noon to stay stable across time zones.
export function parseHistoryDate(value: unknown): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], 12, 0, 0));
  }
  match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    return new Date(Date.UTC(+match[3], +match[2] - 1, +match[1], 12, 0, 0));
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// formatDateToGerman (formatOverviewDate semantics): 'YYYY-MM-DD' and
// 'DD.MM.YYYY' both render as DD.MM.YYYY.
export function formatHistoryDate(date: unknown): string {
  if (!date) return '';
  const text = String(date);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[3].padStart(2, '0')}.${iso[2].padStart(2, '0')}.${iso[1]}`;
  }
  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotted) {
    return `${dotted[1].padStart(2, '0')}.${dotted[2].padStart(2, '0')}.${dotted[3]}`;
  }
  return '';
}

// formatDate() label for the trend charts: "MMM YYYY". The site hardcodes
// German month names; the app renders Spanish ones.
export function formatHistoryMonthYear(date: unknown): string {
  const parsed = parseHistoryDate(date);
  if (!parsed) return '';
  return `${MESES_ES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// analyzeJsonData (line 1738) — one-decimal longitudinal percentages
// ---------------------------------------------------------------------------

export interface HistoryAnalysis {
  totalTeeth: number;
  totalImplants: number;
  totalSites: number;
  bopPercent: number;
  piPercent: number;
  pd4Percent: number;
  pd5Percent: number;
  pd6PlusPercent: number;
  bopPositiveSites: number;
  piPositiveSites: number;
  furcation2: number;
}

// The site computes totalTeeth as 32 minus explicitly flagged zeros. The app's
// persisted studies drop measurements of absent teeth entirely (no rows), so
// the equivalent here is the count of teeth whose switch is on.
export function analyzeHistoryJsonData(rec: HistoryChartRecord): HistoryAnalysis {
  let totalTeeth = 0;
  let totalImplants = 0;
  let bopSurfaces = 0;
  let piSurfaces = 0;
  let bopPositiveSites = 0;
  let piPositiveSites = 0;
  let pdSum4 = 0;
  let pdSum5 = 0;
  let pdSum6Plus = 0;
  let furcationAdvanced = 0;

  for (const tooth of ALL_FDI_TEETH) {
    const present = isPresent(rec, tooth);
    if (present) {
      totalTeeth += 1;
      if (IMPLANT_STATUSES.includes(String(rec[`implant_${tooth}`]))) {
        totalImplants += 1;
      }
    }

    const surfaces = isUpper(tooth) ? HISTORY_SURFACES_UPPER : HISTORY_SURFACES_LOWER;

    // The site returns early for non-occupied positions ("Der Zahn
    // entscheidet"), so BOP/PI values of a switched-off tooth never count.
    if (present) {
      for (const surface of surfaces) {
        const bop = rec[`bop_${tooth}_${surface}`];
        if (readNum(bop) > 0) bopSurfaces += 1;
        if (readNum(bop) === 1) bopPositiveSites += 1;

        const pi = rec[`pi_${tooth}_${surface}`];
        if (readNum(pi) > 0) piSurfaces += 1;
        if (readNum(pi) === 1) piPositiveSites += 1;

        const pd = readNum(rec[`pd_${tooth}_${surface}`]);
        if (pd === 4) pdSum4 += 1;
        else if (pd === 5) pdSum5 += 1;
        else if (pd >= 6) pdSum6Plus += 1;
      }

      for (const site of ['b', 'mp', 'dp', 'l']) {
        const grade = parseInt(String(rec[`furcation_${tooth}_${site}`]), 10);
        if (grade === 2 || grade === 3) furcationAdvanced += 1;
      }
    }
  }

  const totalSites = totalTeeth * 6;

  return {
    totalTeeth,
    totalImplants,
    totalSites,
    bopPercent: percent(bopSurfaces, totalSites),
    piPercent: percent(piSurfaces, totalSites),
    pd4Percent: percent(pdSum4, totalSites),
    pd5Percent: percent(pdSum5, totalSites),
    pd6PlusPercent: percent(pdSum6Plus, totalSites),
    bopPositiveSites,
    piPositiveSites,
    furcation2: furcationAdvanced,
  };
}

// ---------------------------------------------------------------------------
// analyzeJsonDataSVG (line 49) — integer percentages for the map stamps
// ---------------------------------------------------------------------------

export interface HistorySvgAnalysis {
  bopPercent: number;
  piPercent: number;
  pd4Percent: number;
}

export function analyzeHistorySvgData(rec: HistoryChartRecord): HistorySvgAnalysis {
  let bop = 0;
  let pi = 0;
  let pd4 = 0;
  let totalSites = 0;

  for (const tooth of ALL_FDI_TEETH) {
    if (!isPresent(rec, tooth)) continue;

    const surfaces = isUpper(tooth) ? HISTORY_SURFACES_UPPER : HISTORY_SURFACES_LOWER;
    totalSites += surfaces.length;

    for (const surface of surfaces) {
      if (readNum(rec[`bop_${tooth}_${surface}`]) === 1) bop += 1;
      if (readNum(rec[`pi_${tooth}_${surface}`]) === 1) pi += 1;
      if (readNum(rec[`pd_${tooth}_${surface}`]) >= 4) pd4 += 1;
    }
  }

  const round = (count: number) =>
    totalSites === 0 ? 0 : Math.round((count / totalSites) * 100);

  return {
    bopPercent: round(bop),
    piPercent: round(pi),
    pd4Percent: round(pd4),
  };
}

// ---------------------------------------------------------------------------
// extractInstanceData (line 1205) — counts for the comparison table
// ---------------------------------------------------------------------------

export interface HistoryInstanceData {
  date: string;
  teeth: number;
  pockets4mm: number;
  closedPockets: number;
  pockets5mm: number;
  pockets6mm: number;
  furcation1: number;
  furcation2: number;
  furcation3: number;
  implants: number;
}

// These counters follow the site literally: they scan every key without a
// presence gate (countImplants/countPockets/countFurcation have none there).
export function extractHistoryInstanceData(rec: HistoryChartRecord): HistoryInstanceData {
  let teeth = 0;
  let implants = 0;
  let pockets4mm = 0;
  let closedPockets = 0;
  let pockets5mm = 0;
  let pockets6mm = 0;
  let furcation1 = 0;
  let furcation2 = 0;
  let furcation3 = 0;

  for (const key of Object.keys(rec)) {
    if (key.startsWith('tooth_') && rec[key] == '1') teeth += 1;

    if (key.startsWith('implant_') && IMPLANT_STATUSES.includes(String(rec[key]))) {
      implants += 1;
    }

    if (key.startsWith('furcation_')) {
      const degree = parseInt(String(rec[key]), 10);
      if (degree === 1) furcation1 += 1;
      else if (degree === 2) furcation2 += 1;
      else if (degree === 3) furcation3 += 1;
    }

    if (!key.startsWith('pd_')) continue;
    const pd = parseInt(String(rec[key]), 10);
    if (!Number.isFinite(pd)) continue;

    if (pd === 4) pockets4mm += 1;
    else if (pd === 5) pockets5mm += 1;
    else if (pd === 6) pockets6mm += 1;
    if (pd !== 4) continue;

    // countClosedPockets: pocket with no bleeding on the probed side of the
    // respective arch (buccal + palatal for the upper jaw, buccal + lingual
    // for the lower one).
    const pdMatch = key.match(/^pd_(\d{2})_([a-z]{1,2})$/);
    if (!pdMatch) continue;
    const tooth = pdMatch[1];
    const surface = pdMatch[2];
    const quadrant = parseInt(tooth[0], 10);
    const upper = quadrant === 1 || quadrant === 2;
    const probedSide: boolean = upper
      ? ['db', 'b', 'mb', 'dp', 'p', 'mp'].includes(surface)
      : ['db', 'b', 'mb', 'dl', 'l', 'ml'].includes(surface);
    if (!probedSide) continue;

    if (String(rec[`bop_${tooth}_${surface}`]) === '0') {
      closedPockets += 1;
    }
  }

  return {
    date: rec.date ?? '',
    teeth,
    pockets4mm,
    closedPockets,
    pockets5mm,
    pockets6mm,
    furcation1,
    furcation2,
    furcation3,
    implants,
  };
}

// ---------------------------------------------------------------------------
// calculateDifferences (line 933) + adjustPdValue (line 916)
// ---------------------------------------------------------------------------

// Sites measured at 0 use reference depths from the injectable scar-tissue
// note in the original: 1 mm for the flat b/p/l surfaces, 2 mm for the
// interproximal ones — otherwise improvements from 0 look like regressions.
export function adjustPdForComparison(value: number, surface: string): number {
  if (value !== 0) return value;
  if (['b', 'p', 'l'].includes(surface)) return 1;
  return 2;
}

export interface ToothPdDifferences {
  before: 0 | 1;
  after: 0 | 1;
  pdDifferences: Record<string, number | undefined>;
}

const DIFFERENCE_SURFACES = ['db', 'b', 'mb', 'dp', 'p', 'mp', 'dl', 'l', 'ml'];

export function calculatePdDifferences(
  data1: HistoryChartRecord,
  data2: HistoryChartRecord,
): Record<string, ToothPdDifferences> {
  const older = parseHistoryDate(data1?.date);
  const newer = parseHistoryDate(data2?.date);
  if (older && newer && older > newer) {
    [data1, data2] = [data2, data1];
  }

  const differences: Record<string, ToothPdDifferences> = {};

  for (const tooth of ALL_FDI_TEETH) {
    const entry: ToothPdDifferences = {
      before: isPresent(data1, tooth) ? 1 : 0,
      after: isPresent(data2, tooth) ? 1 : 0,
      pdDifferences: {},
    };

    for (const surface of DIFFERENCE_SURFACES) {
      const key1 = `pd_${tooth}_${surface}`;
      const key2 = `pd_${tooth}_${surface}`;
      if (data1?.[key1] === undefined || data2?.[key2] === undefined) continue;

      const adjusted1 = adjustPdForComparison(parseInt(String(data1[key1]), 10), surface);
      const adjusted2 = adjustPdForComparison(parseInt(String(data2[key2]), 10), surface);
      entry.pdDifferences[surface] = adjusted2 - adjusted1;
    }

    differences[`tooth_${tooth}`] = entry;
  }

  return differences;
}

// ---------------------------------------------------------------------------
// aggregateDifferences (line 1054) — 9 sites -> the 5 polygon letters
// ---------------------------------------------------------------------------

export interface AggregatedPdDifferences extends ToothPdDifferences {
  d: number;
  m: number;
  b: number;
  p: number;
  l: number;
}

export function aggregatePdDifferences(
  differences: Record<string, ToothPdDifferences>,
): Record<string, AggregatedPdDifferences> {
  const aggregated: Record<string, AggregatedPdDifferences> = {};

  for (const toothKey of Object.keys(differences)) {
    const source = differences[toothKey];
    const pd = source.pdDifferences;
    const result: AggregatedPdDifferences = {
      ...source,
      d: (pd.db || 0) + (pd.dp || 0) + (pd.dl || 0),
      m: (pd.mb || 0) + (pd.mp || 0) + (pd.ml || 0),
      b: pd.b || 0,
      p: pd.p || 0,
      // The site's l letter comes from the raw l difference (kept in
      // pdDifferences; rendered through the same accessor).
      l: pd.l || 0,
    };

    const tooth = parseInt(toothKey.split('_')[1], 10);
    if (tooth >= 31 && tooth <= 48) {
      result.d = ((pd.db || 0) + (pd.dl || 0)) / 2;
      result.m = ((pd.mb || 0) + (pd.ml || 0)) / 2;
    }

    aggregated[toothKey] = result;
  }

  return aggregated;
}

// ---------------------------------------------------------------------------
// getHeatmapColor (line 1084)
// ---------------------------------------------------------------------------

export function getHeatmapColor(value: number | undefined): string | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  for (let i = 0; i < HEATMAP_DOMAIN.length; i++) {
    if (value < HEATMAP_DOMAIN[i]) return HEATMAP_RANGE[i];
  }
  return undefined;
}

// Palette for the legend swatch strip under the superimpose map.
export const HEATMAP_LEGEND_COLORS: string[] = HEATMAP_RANGE;

// ---------------------------------------------------------------------------
// calculatePercentages (line 1274)
// ---------------------------------------------------------------------------

export interface HistoryChangePercentages {
  improvementPercentage: number;
  nochangePercentage: number;
  worseningPercentage: number;
}

export function calculateChangePercentages(
  differences: Record<string, ToothPdDifferences>,
): HistoryChangePercentages {
  const values: number[] = [];

  for (const toothKey of Object.keys(differences)) {
    const entry = differences[toothKey];
    // Only sites of teeth still present in the "after" study count.
    if (entry.after !== 1) continue;
    for (const surface of DIFFERENCE_SURFACES) {
      const value = entry.pdDifferences[surface];
      if (value !== undefined) values.push(value);
    }
  }

  const totalCount = values.length;
  if (totalCount === 0) {
    return { improvementPercentage: 0, nochangePercentage: 0, worseningPercentage: 0 };
  }

  let improvementPercentage = Math.round(
    (values.filter(value => value < 0).length / totalCount) * 10000,
  ) / 100;
  let nochangePercentage = Math.round(
    (values.filter(value => value === 0).length / totalCount) * 10000,
  ) / 100;
  let worseningPercentage = Math.round(
    (values.filter(value => value > 0).length / totalCount) * 10000,
  ) / 100;

  // Correct rounding drift so the stack always sums to 100 like the site.
  const totalPercentage = improvementPercentage + nochangePercentage + worseningPercentage;
  if (totalPercentage !== 100) {
    const gap = 100 - totalPercentage;
    const max = Math.max(improvementPercentage, nochangePercentage, worseningPercentage);
    if (max === improvementPercentage) improvementPercentage += gap;
    else if (max === nochangePercentage) nochangePercentage += gap;
    else worseningPercentage += gap;
  }

  return { improvementPercentage, nochangePercentage, worseningPercentage };
}

// ---------------------------------------------------------------------------
// Top worsening sites — the siteMap block of togglePdSuperimpose (line 826)
// ---------------------------------------------------------------------------

export interface RankedSiteChange {
  rank: number;
  site: string;
  before: number;
  after: number;
  change: number;
}

export function summarizeTopWorseningSites(
  data1: HistoryChartRecord,
  data2: HistoryChartRecord,
): RankedSiteChange[] {
  const older = parseHistoryDate(data1?.date);
  const newer = parseHistoryDate(data2?.date);
  if (older && newer && older > newer) {
    [data1, data2] = [data2, data1];
  }

  const differences = calculatePdDifferences(data1, data2);
  const siteMap = new Map<
    string,
    { site: string; before: number; after: number; change: number }
  >();

  for (const toothKey of Object.keys(differences)) {
    const tooth = toothKey.split('_')[1];
    const pdDifferences = differences[toothKey].pdDifferences;
    if (!pdDifferences) continue;

    for (const surface of DIFFERENCE_SURFACES) {
      const change = pdDifferences[surface];
      if (change === undefined || change <= 0) continue; // only worsening

      const siteLabel = `${tooth} ${surface}`;
      const key = `pd_${tooth}_${surface}`;
      const before = parseInt(String(data1[key]), 10);
      const after = parseInt(String(data2[key]), 10);

      const existing = siteMap.get(siteLabel);
      if (!existing || existing.change < change) {
        siteMap.set(siteLabel, { site: siteLabel, before, after, change });
      }
    }
  }

  const ranked = Array.from(siteMap.values())
    .sort((a, b) => {
      if (b.change !== a.change) return b.change - a.change;
      return b.after - a.after;
    })
    .slice(0, 16)
    .map((entry, index) => ({
      rank: index + 1,
      site: entry.site,
      before: entry.before,
      after: entry.after,
      change: entry.change,
    }));

  return ranked;
}

// ---------------------------------------------------------------------------
// Recall suggestion — the interval ladder of the SVG chart blocks (line 630)
// ---------------------------------------------------------------------------

interface IntervalLadderInput {
  pd4: number;
  pd5: number;
  pd6: number;
}

// The site assigns the maximum through a chain of ifs where the LAST matching
// condition wins; the ladder below is the equivalent else-if form.
export function suggestMaintenanceInterval(input: IntervalLadderInput): number {
  const st4Max =
    input.pd4 <= 2 ? 12
      : input.pd4 <= 5 ? 9
        : input.pd4 <= 10 ? 6
          : input.pd4 <= 20 ? 4
            : 3;

  const st5Max =
    input.pd5 <= 2 ? 12
      : input.pd5 <= 4 ? 9
        : input.pd5 <= 6 ? 6
          : input.pd5 <= 10 ? 4
            : 3;

  const st6Max =
    input.pd6 === 0 ? 12
      : input.pd6 <= 1 ? 9
        : input.pd6 <= 2 ? 6
          : input.pd6 <= 3 ? 4
            : 3;

  return Math.min(st4Max, st5Max, st6Max);
}

export type IntervalStatusKind = 'timely' | 'early' | 'late';

export interface IntervalStatus {
  status: IntervalStatusKind;
  label: string;
  color: string;
  expectedDays: number;
  actualDays: number;
  diffDays: number;
}

export function computeIntervalStatus(suggestedMonths: number, actualDays: number): IntervalStatus {
  const expectedDays = suggestedMonths * 30;
  const diffDays = actualDays - expectedDays;

  if (diffDays < -30) {
    return { status: 'early', label: 'TEMPRANO', color: 'green', expectedDays, actualDays, diffDays };
  }
  if (diffDays > 30) {
    return { status: 'late', label: 'TARDE', color: 'red', expectedDays, actualDays, diffDays };
  }
  return { status: 'timely', label: 'A TIEMPO', color: 'green', expectedDays, actualDays, diffDays };
}

// ---------------------------------------------------------------------------
// Small formatters
// ---------------------------------------------------------------------------

// calculateDateDifference: "N Mes(es) (D Días)".
export function formatIntervalDuration(days: number): string {
  const months = Math.floor(days / 30);
  return `${months} Mes(es) (${days} ${days === 1 ? 'Día' : 'Días'})`;
}

// calculateChange: signed difference for the comparison table.
export function formatSignedChange(value1: number | null | undefined, value2: number | null | undefined): string {
  if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) {
    return 'NA';
  }
  const change = value2 - value1;
  return (change > 0 ? '+' : '') + change;
}
