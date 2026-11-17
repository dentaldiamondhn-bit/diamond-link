// Pure logic for probe calibration between two periodontal studies.
// Ported from periodontalchart-online.com js/renderer/calibration_renderer.js.
//
// Self-contained (no imports) so it can run under plain `node --test`.

export type CalibrationChartRecord = Record<string, any>;

export interface CalibrationParsedTooth {
  bop: Record<string, number>;
  gm: Record<string, number>;
  pd: Record<string, number>;
  furcation: Record<string, number>;
}

export type CalibrationParsedData = Record<string, CalibrationParsedTooth>;

export interface CalibrationComparisonValue {
  student: number;
  clinician: number | null;
  difference: number | null;
}

export interface CalibrationComparison {
  [tooth: string]: {
    bop: Record<string, CalibrationComparisonValue>;
    gm: Record<string, CalibrationComparisonValue>;
    pd: Record<string, CalibrationComparisonValue>;
    furcation: Record<string, CalibrationComparisonValue>;
  };
}

export interface CalibrationDifferenceResult {
  totalDifference: number;
  siteCount: number;
  flagged: boolean;
  avg: number;
}

export interface CalibrationCategoryDifferences {
  [siteType: string]: CalibrationDifferenceResult;
  overall: CalibrationDifferenceResult;
}

export interface CalibrationArchCategoryDifferences {
  [category: string]: CalibrationCategoryDifferences;
}

export interface CalibrationParameterArchDifferences {
  [arch: string]: CalibrationArchCategoryDifferences;
}

export interface CalibrationAnalysisResult {
  gm: Record<string, Record<string, CalibrationCategoryDifferences>>;
  pd: Record<string, Record<string, CalibrationCategoryDifferences>>;
  furcation: Record<string, Record<string, CalibrationCategoryDifferences>>;
}

export interface CalibrationMaxDeviation {
  tooth: number;
  pos: string;
  diff: number;
}

export interface CalibrationMaxDeviations {
  gm: { tooth: number; pos: string; diff: number }[];
  pd: { tooth: number; pos: string; diff: number }[];
  furcation: { tooth: number; pos: string; diff: number }[];
}

export interface CalibrationBlandAltmanPoint {
  key: string;
  mean: number;
  diff: number;
  count: number;
}

export interface CalibrationICCPair {
  student: number;
  clinician: number;
}

export interface CalibrationICCData {
  ICC: number;
  pValue: number;
  F: number;
  dfBetween: number;
  dfWithin: number;
}

var positionToSiteType: Record<string, string> = {
    db: 'd',
    b: 'b',
    mb: 'm',
    dp: 'p',
    p: 'p',
    mp: 'p',
    dl: 'l',
    l: 'l',
    ml: 'l',
  };

const UPPER_TEETH_SET = new Set([
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
]);

// Probing surfaces per tooth, matching the chart store's INDEX_SURFACES.
const POSITIONS = ['db', 'b', 'mb', 'dp', 'p', 'mp', 'dl', 'l', 'ml'];

function isUpper(tooth: number): boolean {
  return UPPER_TEETH_SET.has(tooth);
}

function readInt(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// ---------------------------------------------------------------------------
// parseCalibrationData — extract per-tooth structured data
// ---------------------------------------------------------------------------

export function parseCalibrationData(rec: CalibrationChartRecord): Record<string, any> {
  const teethData: Record<string, any> = {};

  for (let tooth = 11; tooth <= 48; tooth++) {
    if (tooth % 10 === 0 || tooth % 10 > 8) continue;

    if (String(rec['tooth_' + tooth]) !== '1') continue;

    const toothData: any = {
      bop: {},
      gm: {},
      pd: {},
      furcation: {},
    };

    POSITIONS.forEach(function(pos) {
      var bopKey = 'bop_' + tooth + '_' + pos;
      var gmKey = 'gm_' + tooth + '_' + pos;
      var pdKey = 'pd_' + tooth + '_' + pos;
      var furcationKey = 'furcation_' + tooth + '_' + pos;

      if (rec.hasOwnProperty(bopKey)) {
        toothData.bop[pos] = parseInt(String(rec[bopKey]), 10);
      }
      if (rec.hasOwnProperty(gmKey)) {
        toothData.gm[pos] = parseInt(String(rec[gmKey]), 10);
      }
      if (rec.hasOwnProperty(pdKey)) {
        toothData.pd[pos] = parseInt(String(rec[pdKey]), 10);
      }
      if (rec.hasOwnProperty(furcationKey)) {
        toothData.furcation[pos] = parseInt(String(rec[furcationKey]), 10);
      }
    });

    teethData[tooth.toString()] = toothData;
  }

  return teethData;
}

// ---------------------------------------------------------------------------
// compareCalibrationData — student vs clinician per surface
// ---------------------------------------------------------------------------

export function compareCalibrationData(
  studentData: any,
  clinicianData: any,
): any {
  var comparisons: any = {};

  var studentTeeth = Object.keys(studentData);
  for (var t = 0; t < studentTeeth.length; t++) {
    var tooth = studentTeeth[t];
    if (!clinicianData[tooth]) continue;

    comparisons[tooth] = {
      bop: {},
      gm: {},
      pd: {},
      furcation: {},
    };

    var parameters = ['bop', 'gm', 'pd', 'furcation'];

parameters.forEach(function(parameter) {
      var studentTooth = studentData[tooth][parameter];
      var clinicianParam = clinicianData[tooth];
      var clinicianTooth = clinicianParam ? clinicianParam[parameter] : {};

      var studentPositions = Object.keys(studentTooth);
      for (var p = 0; p < studentPositions.length; p++) {
        var pos = studentPositions[p];
        var studentVal = studentTooth[pos];
        var clinicianVal = clinicianTooth[pos];
        var hasClinician = clinicianVal !== undefined;

        comparisons[tooth][parameter][pos] = {
          student: studentVal,
          clinician: hasClinician ? clinicianVal : null,
          difference: hasClinician ? studentVal - clinicianVal : null,
        };
      }
    });
  }

  return comparisons;
}

// ---------------------------------------------------------------------------
// calculateCalibrationDifferences — mean absolute diff per site group
// ---------------------------------------------------------------------------

export interface CalibrationDifferenceResult {
  totalDifference: number;
  siteCount: number;
  flagged: boolean;
  avg: number;
}

export function calculateCalibrationDifferences(
  comparison: any,
  parameter: string,
  teeth: number[],
  arch: 'upper' | 'lower',
  siteTypes: string[],
): Record<string, any> {
  var totalDifference = 0;
  var siteCount = 0;

  var results: Record<string, any> = {};

  siteTypes.forEach(function(siteType) {
    results[siteType] = { totalDifference: 0, siteCount: 0, flagged: false, avg: 0 };
  });

  for (var i = 0; i < teeth.length; i++) {
    var tooth = teeth[i];
    var archCondition = arch === 'upper' ? UPPER_TEETH_SET.has(tooth) : !UPPER_TEETH_SET.has(tooth);
    if (!archCondition) continue;

    var comp = comparison[tooth.toString()];
    if (!comp) continue;

    var positions = Object.keys(comparison[tooth]?.[parameter] || {});
    for (var pi = 0; pi < positions.length; pi++) {
      var pos = positions[pi];
      var diffObj = comp[parameter][pos];
      // Only actual deviations count towards the average: missing pairs and
      // identical readings are excluded.
      if (diffObj.difference === null || diffObj.difference === 0) continue;

      // A position lands in a bucket when the bucket name is the position
      // itself ('b', 'mb', ...) or its site-type class ('m', 'd', ...).
      var bucket = siteTypes.indexOf(pos) !== -1 ? pos : positionToSiteType[pos];
      if (!bucket) continue;
      if (siteTypes.indexOf(bucket) === -1) continue;

      var diff = Math.abs(diffObj.difference);
      var res = results[bucket];
      res.totalDifference += diff;
      res.siteCount++;
      if (diff >= 1) res.flagged = true;
      totalDifference += diff;
      siteCount++;
    }
  }

  siteTypes.forEach(function(siteType) {
    var res = results[siteType];
    res.avg = siteCount > 0 ? res.totalDifference / res.siteCount : 0;
    res.flagged = res.flagged || res.avg >= 1;
  });

  var overallAvg = siteCount > 0 ? totalDifference / siteCount : 0;
  results.overall = {
    totalDifference: totalDifference,
    siteCount: siteCount,
    flagged: overallAvg >= 1,
    avg: overallAvg,
  };

  return results;
}

const CATEGORIES = {
  entireDentition: [
    11, 12, 13, 14, 15, 16, 17, 18,
    21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48,
  ],
  anterior: [
    11, 12, 13, 21, 22, 23,
    31, 32, 33, 41, 42, 43,
  ],
  premolar: [
    14, 15, 24, 25,
    34, 35, 44, 45,
  ],
  molar: [
    16, 17, 18, 26, 27, 28,
    36, 37, 38, 46, 47, 48,
  ],
};

const ARCHES = ['upper', 'lower'];
const PARAMETERS = ['gm', 'pd', 'furcation'];

const FURCATION_SITE_TYPES_UPPER_MOLAR = ['b', 'mp', 'dp'];
const FURCATION_SITE_TYPES_LOWER = ['b', 'l'];

export function analyzeCalibrationComparison(
  comparison: any,
): any {
  var results: any = {
    gm: { upper: {}, lower: {} },
    pd: { upper: {}, lower: {} },
    furcation: { upper: {}, lower: {} },
  };

  PARAMETERS.forEach(function(parameter) {
    ARCHES.forEach(function(arch: 'upper' | 'lower') {
      results[parameter][arch] = {};

      for (var category in CATEGORIES) {
        var siteTypes: string[];

        if (parameter === 'furcation') {
          if (category === 'entireDentition' || category === 'molar') {
            siteTypes = arch === 'upper'
              ? ['b', 'mp', 'dp']
              : ['b', 'l'];
          } else if (category === 'premolar') {
            siteTypes = arch === 'upper'
              ? ['mp', 'dp']
              : [];
          } else {
            siteTypes = [];
          }
        } else {
          siteTypes = ['m', 'd', 'b', 'p', 'l'];
        }

        if (siteTypes.length === 0) {
          results[parameter][arch][category] = {};
          continue;
        }

        results[parameter][arch][category] = calculateCalibrationDifferences(
          comparison,
          parameter,
          CATEGORIES[category],
          arch,
          siteTypes,
        );
      }
    });
  });

  return results;
}

// ---------------------------------------------------------------------------
// extractCalibrationICCData — paired measurements for ICC
// ---------------------------------------------------------------------------

export interface CalibrationICCPair {
  student: number;
  clinician: number;
}

export function extractCalibrationICCData(
  studentData: any,
  clinicianData: any,
  parameter: 'gm' | 'pd' | 'furcation',
): [number, number][] {
  var pairs: [number, number][] = [];

  for (var tooth = 11; tooth <= 48; tooth++) {
    if (tooth % 10 === 0 || tooth % 10 > 8) continue;

    if (!studentData[tooth.toString()] || !clinicianData[tooth.toString()]) continue;

    var positions: string[];

    if (parameter === 'furcation') {
      var isUpper = UPPER_TEETH_SET.has(tooth);
      if (isUpper && (tooth >= 14 && tooth <= 17 || tooth >= 24 && tooth <= 27)) {
        positions = ['b', 'mp', 'dp'];
      } else if (!isUpper && (tooth >= 34 && tooth <= 37 || tooth >= 44 && tooth <= 47)) {
        positions = ['b', 'l'];
      } else {
        continue;
      }
    } else {
      positions = POSITIONS;
    }

    positions.forEach(function(pos) {
      var studentVal = studentData[tooth.toString()]?.[parameter]?.[pos];
      var clinicianVal = clinicianData[tooth.toString()]?.[parameter]?.[pos];

      if (studentVal !== undefined && clinicianVal !== undefined) {
        // Furcation grade 0 means "no involvement" on both sides — pairing it
        // would flood the ICC sample with meaningless matches.
        if (parameter === 'furcation' && studentVal === 0 && clinicianVal === 0) {
          return;
        }
        pairs.push([studentVal, clinicianVal]);
      }
    });
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// calculateANOVAandICC — one-way random effects ICC
// ---------------------------------------------------------------------------

export interface CalibrationICCData {
  ICC: number;
  pValue: number;
  F: number;
  dfBetween: number;
  dfWithin: number;
}

export function calculateANOVAandICC(
  data: number[][],
): CalibrationICCData {
  var n = data.length;
  if (n === 0 || n <= 1) {
    return { ICC: NaN, pValue: NaN, F: NaN, dfBetween: NaN, dfWithin: NaN };
  }
  var k = data[0].length;
  if (k <= 1) {
    return { ICC: NaN, pValue: NaN, F: NaN, dfBetween: NaN, dfWithin: NaN };
  }

  var grandMean = 0;
  var totalCount = 0;
  data.forEach(function(subject) {
    subject.forEach(function(score) {
      grandMean += score;
      totalCount++;
    });
  });
  grandMean /= totalCount;

  var SSbetween = 0;
  var SSwithin = 0;

  data.forEach(function(subject) {
    var subjectMean = subject.reduce(function(a, b) { return a + b; }, 0) / k;
    SSbetween += k * Math.pow(subjectMean - grandMean, 2);
    subject.forEach(function(score) {
      SSwithin += Math.pow(score - subjectMean, 2);
    });
  });

  var MSbetween = n > 1 ? SSbetween / (n - 1) : 0;
  var MSwithin = SSwithin / (n * k - n) || 0;
  var F = MSwithin > 0 ? MSbetween / MSwithin : NaN;
  var dfBetween = n - 1;
  var dfWithin = n * (k - 1);

  var pValue = NaN;
  if (!isNaN(F) && dfBetween > 0 && dfWithin > 0) {
    pValue = NaN;
  }

  var ICC = MSbetween > 0 && MSwithin >= 0
    ? (MSbetween - MSwithin) / (MSbetween + (k - 1) * MSwithin)
    : NaN;

  return { ICC: ICC, pValue: pValue, F: F, dfBetween: dfBetween, dfWithin: dfWithin };
}

// ---------------------------------------------------------------------------
// extractBlandAltmanData — paired PD values by site
// ---------------------------------------------------------------------------

export interface CalibrationBlandAltmanPoint {
  key: string;
  mean: number;
  diff: number;
  count: number;
}

export function extractBlandAltmanData(
  studentRec: Record<string, any>,
  clinicianRec: Record<string, any>,
): any[] {
  var points: any[] = [];

  var studentPd: Record<string, number> = {};
  var clinicianPd: Record<string, number> = {};

  Object.keys(studentRec).forEach(function(key) {
    if (key.startsWith('pd_')) {
      studentPd[key] = parseInt(String(studentRec[key]), 10);
    }
  });
  Object.keys(clinicianRec).forEach(function(key) {
    if (key.startsWith('pd_')) {
      clinicianPd[key] = parseInt(String(clinicianRec[key]), 10);
    }
  });

  var countMap: Record<string, number> = {};

  Object.keys(studentPd).forEach(function(key) {
    if (clinicianPd[key] !== undefined) {
      var studentVal = studentPd[key];
      var clinicianVal = clinicianPd[key];
      var mean = (studentVal + clinicianVal) / 2;
      var diff = studentVal - clinicianVal;

      var count = countMap[mean] || 0;
      points.push({
        key: key,
        mean: mean,
        diff: diff,
        count: count + 1,
      });
      countMap[mean] = count + 1;
    }
  });

  return points;
}

// ---------------------------------------------------------------------------
// getMaxDeviations
// ---------------------------------------------------------------------------

export interface CalibrationMaxDeviation {
  tooth: number;
  pos: string;
  diff: number;
}

export interface CalibrationMaxDeviations {
  gm: { tooth: number; pos: string; diff: number }[];
  pd: { tooth: number; pos: string; diff: number }[];
  furcation: { tooth: number; pos: string; diff: number }[];
}

export function getMaxDeviations(
  comparison: any,
): any {
  var parameters = ['gm', 'pd', 'furcation'];
  var deviations: any = { gm: [], pd: [], furcation: [] };

  parameters.forEach(function(parameter) {
    var keys = Object.keys(comparison);
    for (var ti = 0; ti < keys.length; ti++) {
      var tooth = keys[ti];
      var comp = comparison[tooth];
      if (!comp) continue;

      var paramKeys = Object.keys(comp[parameter] || {});
      for (var pi = 0; pi < paramKeys.length; pi++) {
        var pos = paramKeys[pi];
        var diff = comp[parameter][pos]?.difference;
        if (diff !== null && diff !== 0 && !isNaN(diff)) {
          deviations[parameter].push({
            tooth: parseInt(tooth, 10),
            pos: pos,
            diff: Math.abs(diff),
          });
        }
      }
    }

    deviations[parameter].sort(function(a, b) { return b.diff - a.diff; });
    deviations[parameter] = deviations[parameter].slice(0, 10);
  });

  return deviations;
}