import { ChartData, FDIToothNumber } from '@/lib/types/clinical';
import { ALL_TEETH } from '@/lib/constants/teeth';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { getFurcationSitesForTooth } from '@/lib/constants/surfaces';

// Furcation involvement of a tooth is the worst grade across its applicable
// sites (the reference stores one grade per site: b, mp, dp, l).
export function getMaxFurcationGrade(data: ChartData, tooth: FDIToothNumber): number {
  return getFurcationSitesForTooth(tooth).reduce(
    (max, site) => Math.max(max, readNumber(data[`furcation_${tooth}_${site}`])),
    0,
  );
}

export interface ChartStatistics {
  meanPd: number;
  meanAl: number;
  bopPercent: number;
  plaquePercent: number;
  sitesEvaluated: number;
  sitesWithPd: number;
  sitesBopPositive: number;
  sitesPlaquePositive: number;
  teethPresent: number;
  teethMissing: number;
  teethImplanted: number;
  sites5mm: number;
  sites6mm: number;
  furcationAdvanced: number;
  mobilityAdvanced: number;
}

export interface ChartIndexSummary {
  bopPercent: number;
  plaquePercent: number;
  meanPd: number;
  meanAl: number;
}

export const EMPTY_INDEX_SUMMARY: ChartIndexSummary = {
  bopPercent: 0,
  plaquePercent: 0,
  meanPd: 0,
  meanAl: 0,
};

export const EMPTY_STATISTICS: ChartStatistics = {
  meanPd: 0,
  meanAl: 0,
  bopPercent: 0,
  plaquePercent: 0,
  sitesEvaluated: 0,
  sitesWithPd: 0,
  sitesBopPositive: 0,
  sitesPlaquePositive: 0,
  teethPresent: 0,
  teethMissing: 0,
  teethImplanted: 0,
  sites5mm: 0,
  sites6mm: 0,
  furcationAdvanced: 0,
  mobilityAdvanced: 0,
};

export function isToothPresent(data: ChartData, tooth: FDIToothNumber): boolean {
  const value = data[`tooth_${tooth}`];
  return value === '1' || value === 1 || value === true;
}

// The site's toggleToothContent hides the implant graphic for switched-off
// positions but keeps the implant status saved (js/script.js, see the
// 22.09.2026 note in data_renderer.js). Our chart keeps rendering the implant
// PNG and the GM/PD polygons over it even when the tooth toggle is off, so
// peri-implant probing values stay visible (app-specific requirement).
export function isImplanted(data: ChartData, tooth: FDIToothNumber): boolean {
  return readNumber(data[`implant_${tooth}`]) > 0;
}

export function isToothCharted(data: ChartData, tooth: FDIToothNumber): boolean {
  return isToothPresent(data, tooth) || isImplanted(data, tooth);
}

export function readNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readFlag(value: unknown): boolean {
  return value === '1' || value === 1 || value === true;
}

export type MeasurementField = 'gm' | 'pd';

// Site validation types (data-validation-type on the reference inputs,
// js/script.js validateAndFormatInput). GM is signed on the site (-99..99);
// PD is unsigned 0..99, so negative probing depths are rejected at input.
export const MEASUREMENT_VALIDATION_TYPE: Record<MeasurementField, '-99-99' | '0-99'> = {
  gm: '-99-99',
  pd: '0-99',
};

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Mirrors the site's validateAndFormatInput: integers only, magnitude
// clamped to 0..99, leading zeros dropped. For '-99-99' the minus sign is
// preserved and a lone '-' is a legal intermediate state; for '0-99' the
// minus is stripped.
export function formatMeasurementInput(raw: string, field: MeasurementField): string {
  if (MEASUREMENT_VALIDATION_TYPE[field] === '-99-99') {
    const negative = raw.trim().startsWith('-');
    const digits = onlyDigits(raw).slice(0, 2);
    if (!digits) return negative ? '-' : '';
    const magnitude = clampInt(parseInt(digits, 10), 0, 99);
    return String(negative ? -magnitude : magnitude);
  }

  const digits = onlyDigits(raw).slice(0, 2);
  if (!digits) return '';
  return String(clampInt(parseInt(digits, 10), 0, 99));
}

// Site formula (js/script.js calculateSingleALForInput): AL = PD - GM with
// the GM sign flipped in inverted mode. A GM field holding a lone '-' counts
// as 0, like parseInt('-') || 0 on the site. AL is always derived from the
// live PD/GM values, never read back from a stored al_* field, so a stale
// value can never surface.
export function getToothAl(data: ChartData, tooth: FDIToothNumber, surface: string): number {
  const pd = readNumber(data[`pd_${tooth}_${surface}`]);
  const gm = readNumber(data[`gm_${tooth}_${surface}`]);
  const inverted = Boolean(data.isGmInverted);
  return inverted ? pd + gm : pd - gm;
}

export function calculateChartStatistics(data: ChartData): ChartStatistics {
  const stats: ChartStatistics = { ...EMPTY_STATISTICS };

  let pdSum = 0;
  let alSum = 0;
  let alCount = 0;

  ALL_TEETH.forEach(tooth => {
    const present = isToothPresent(data, tooth);
    const implant = readNumber(data[`implant_${tooth}`]) > 0;

    if (present) stats.teethPresent += 1;
    else stats.teethMissing += 1;
    if (implant) stats.teethImplanted += 1;

    if (getMaxFurcationGrade(data, tooth) >= 2) stats.furcationAdvanced += 1;
    if (readNumber(data[`mobility_${tooth}`]) >= 2) stats.mobilityAdvanced += 1;

    if (!present) return;

    getApplicableSurfaces(tooth).forEach(surface => {
      stats.sitesEvaluated += 1;

      const pd = readNumber(data[`pd_${tooth}_${surface}`]);
      if (pd > 0) {
        stats.sitesWithPd += 1;
        pdSum += pd;
        if (pd >= 5) stats.sites5mm += 1;
        if (pd >= 6) stats.sites6mm += 1;
      }

      const al = getToothAl(data, tooth, surface);
      if (al > 0) {
        alSum += al;
        alCount += 1;
      }

      if (readFlag(data[`bop_${tooth}_${surface}`])) stats.sitesBopPositive += 1;
      if (readFlag(data[`pi_${tooth}_${surface}`])) stats.sitesPlaquePositive += 1;
    });
  });

  stats.meanPd = stats.sitesWithPd > 0 ? pdSum / stats.sitesWithPd : 0;
  stats.meanAl = alCount > 0 ? alSum / alCount : 0;
  stats.bopPercent = stats.sitesEvaluated > 0 ? (stats.sitesBopPositive / stats.sitesEvaluated) * 100 : 0;
  stats.plaquePercent = stats.sitesEvaluated > 0 ? (stats.sitesPlaquePositive / stats.sitesEvaluated) * 100 : 0;

  return stats;
}

export type RiskLevel = 'bajo' | 'moderado' | 'alto';

export interface RiskFactor {
  label: string;
  detail: string;
  severity: 'low' | 'moderate' | 'high' | 'info';
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
}

export function calculateRiskAssessment(data: ChartData): RiskAssessment {
  const stats = calculateChartStatistics(data);
  const factors: RiskFactor[] = [];
  let score = 0;

  if (stats.bopPercent >= 30) {
    score += 3;
    factors.push({
      label: 'Sangrado al sondaje',
      detail: `${stats.bopPercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'high',
    });
  } else if (stats.bopPercent > 10) {
    score += 2;
    factors.push({
      label: 'Sangrado al sondaje',
      detail: `${stats.bopPercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'moderate',
    });
  } else {
    factors.push({
      label: 'Sangrado al sondaje',
      detail: `${stats.bopPercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'low',
    });
  }

  if (stats.plaquePercent >= 40) {
    score += 2;
    factors.push({
      label: 'Índice de placa',
      detail: `${stats.plaquePercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'high',
    });
  } else if (stats.plaquePercent > 20) {
    score += 1;
    factors.push({
      label: 'Índice de placa',
      detail: `${stats.plaquePercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'moderate',
    });
  } else {
    factors.push({
      label: 'Índice de placa',
      detail: `${stats.plaquePercent.toFixed(0)}% de las superficies evaluadas`,
      severity: 'low',
    });
  }

  const pct6 = stats.sitesEvaluated > 0 ? (stats.sites6mm / stats.sitesEvaluated) * 100 : 0;
  if (pct6 >= 10) {
    score += 3;
    factors.push({
      label: 'Bolsas ≥ 6mm',
      detail: `${stats.sites6mm} superficies (${pct6.toFixed(0)}%)`,
      severity: 'high',
    });
  } else if (stats.sites6mm > 0) {
    score += 1;
    factors.push({
      label: 'Bolsas ≥ 6mm',
      detail: `${stats.sites6mm} superficies (${pct6.toFixed(0)}%)`,
      severity: 'moderate',
    });
  } else {
    factors.push({
      label: 'Bolsas ≥ 6mm',
      detail: 'Ninguna superficie ≥ 6mm',
      severity: 'low',
    });
  }

  if (stats.furcationAdvanced > 0) {
    score += 2;
    factors.push({
      label: 'Furcaciones grado II-III',
      detail: `${stats.furcationAdvanced} diente(s)`,
      severity: 'high',
    });
  }

  if (stats.mobilityAdvanced > 0) {
    score += 2;
    factors.push({
      label: 'Movilidad grado II-III',
      detail: `${stats.mobilityAdvanced} diente(s)`,
      severity: 'high',
    });
  }

  if (stats.teethMissing > 0) {
    score += 1;
    factors.push({
      label: 'Dientes ausentes',
      detail: `${stats.teethMissing} diente(s) ausente(s)`,
      severity: 'info',
    });
  }

  const level: RiskLevel = score >= 7 ? 'alto' : score >= 4 ? 'moderado' : 'bajo';

  return { level, score, factors };
}

export interface ToothClassification {
  tooth: FDIToothNumber;
  stage: 0 | 1 | 2 | 3 | 4;
  label: string;
  reasons: string[];
}

const STAGE_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'Sano',
  1: 'Grado I',
  2: 'Grado II',
  3: 'Grado III',
  4: 'Grado IV',
};

export function classifyTooth(data: ChartData, tooth: FDIToothNumber): ToothClassification {
  const reasons: string[] = [];

  if (!isToothPresent(data, tooth)) {
    return { tooth, stage: 0, label: 'Ausente', reasons: ['Diente ausente'] };
  }

  let maxAl = 0;
  let maxPd = 0;
  let bopSites = 0;

  getApplicableSurfaces(tooth).forEach(surface => {
    maxAl = Math.max(maxAl, getToothAl(data, tooth, surface));
    maxPd = Math.max(maxPd, readNumber(data[`pd_${tooth}_${surface}`]));
    if (readFlag(data[`bop_${tooth}_${surface}`])) bopSites += 1;
  });

  const furcation = getMaxFurcationGrade(data, tooth);
  const mobility = readNumber(data[`mobility_${tooth}`]);

  let stage: 0 | 1 | 2 | 3 | 4 = 0;

  if (maxAl >= 5 || maxPd >= 6) {
    stage = 3;
    if (maxAl >= 5) reasons.push(`Nivel de inserción máximo ${maxAl.toFixed(1)}mm`);
    if (maxPd >= 6) reasons.push(`Profundidad de sondaje máxima ${maxPd.toFixed(1)}mm`);
  } else if (maxAl >= 3) {
    stage = 2;
    reasons.push(`Nivel de inserción máximo ${maxAl.toFixed(1)}mm`);
  } else if (maxAl >= 1 || maxPd >= 4) {
    stage = 1;
    if (maxAl >= 1) reasons.push(`Nivel de inserción máximo ${maxAl.toFixed(1)}mm`);
    if (maxPd >= 4) reasons.push(`Profundidad de sondaje máxima ${maxPd.toFixed(1)}mm`);
  }

  if (stage >= 3 && (furcation >= 3 || mobility >= 2)) {
    stage = 4;
    if (furcation >= 3) reasons.push('Furcación grado III');
    if (mobility >= 2) reasons.push(`Movilidad grado ${mobility}`);
  }

  if (bopSites > 0 && stage === 0) {
    reasons.push(`Sangrado en ${bopSites} superficie(s)`);
  }

  return { tooth, stage, label: STAGE_LABELS[stage], reasons };
}

export function classifyAllTeeth(data: ChartData): ToothClassification[] {
  return ALL_TEETH.map(tooth => classifyTooth(data, tooth));
}

export function formatToDdMmYyyy(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export interface DetailedChartStatistics extends ChartStatistics {
  meanGm: number;
  pd4Percent: number;
  pd5Percent: number;
  pdGreater5Percent: number;
  sitesPd4: number;
  sitesPd5: number;
  sitesPdGreater5: number;
}

export function calculateDetailedChartStatistics(data: ChartData): DetailedChartStatistics {
  const baseStats = calculateChartStatistics(data);
  
  let gmSum = 0;
  let gmCount = 0;
  let sitesPd4 = 0;
  let sitesPd5 = 0;
  let sitesPdGreater5 = 0;
  
  ALL_TEETH.forEach(tooth => {
    if (!isToothPresent(data, tooth)) return;
    
    getApplicableSurfaces(tooth).forEach(surface => {
      const gm = readNumber(data[`gm_${tooth}_${surface}`]);
      if (gm !== 0) {
        gmSum += gm;
        gmCount += 1;
      }
      
      const pd = readNumber(data[`pd_${tooth}_${surface}`]);
      if (pd === 4) sitesPd4 += 1;
      else if (pd === 5) sitesPd5 += 1;
      else if (pd > 5) sitesPdGreater5 += 1;
    });
  });
  
  const totalSites = baseStats.sitesEvaluated;
  const meanGm = gmCount > 0 ? gmSum / gmCount : 0;
  const pd4Percent = totalSites > 0 ? (sitesPd4 / totalSites) * 100 : 0;
  const pd5Percent = totalSites > 0 ? (sitesPd5 / totalSites) * 100 : 0;
  const pdGreater5Percent = totalSites > 0 ? (sitesPdGreater5 / totalSites) * 100 : 0;
  
  return {
    ...baseStats,
    meanGm,
    pd4Percent,
    pd5Percent,
    pdGreater5Percent,
    sitesPd4,
    sitesPd5,
    sitesPdGreater5,
  };
}

export interface BaderstenCategoryData {
  category: string;
  meanBefore: number | null;
  meanAfter: number | null;
  meanChange: number | null;
  count: number;
}

export function calculateBaderstenAnalysis(dataBefore: ChartData, dataAfter: ChartData): BaderstenCategoryData[] {
  const teethPresentAfter = ALL_TEETH.filter(tooth => isToothPresent(dataAfter, tooth));
  const keySuffixes = ['_db', '_b', '_mb', '_dp', '_p', '_mp', '_dl', '_l', '_ml'];
  
  const categories = {
    '≤2': { changes: [] as number[], beforeValues: [] as number[] },
    '3': { changes: [] as number[], beforeValues: [] as number[] },
    '4': { changes: [] as number[], beforeValues: [] as number[] },
    '5': { changes: [] as number[], beforeValues: [] as number[] },
    '6': { changes: [] as number[], beforeValues: [] as number[] },
    '7': { changes: [] as number[], beforeValues: [] as number[] },
    '8': { changes: [] as number[], beforeValues: [] as number[] },
    '9': { changes: [] as number[], beforeValues: [] as number[] },
    '≥10': { changes: [] as number[], beforeValues: [] as number[] },
  };
  
  teethPresentAfter.forEach(tooth => {
    keySuffixes.forEach(suffix => {
      const key = `pd_${tooth}${suffix}`;
      const beforeVal = readNumber(dataBefore[key]);
      const afterVal = readNumber(dataAfter[key]);
      
      if (beforeVal > 0) {
        const change = afterVal - beforeVal;
        if (beforeVal <= 2) categories['≤2'].changes.push(change);
        else if (beforeVal === 3) categories['3'].changes.push(change);
        else if (beforeVal === 4) categories['4'].changes.push(change);
        else if (beforeVal === 5) categories['5'].changes.push(change);
        else if (beforeVal === 6) categories['6'].changes.push(change);
        else if (beforeVal === 7) categories['7'].changes.push(change);
        else if (beforeVal === 8) categories['8'].changes.push(change);
        else if (beforeVal === 9) categories['9'].changes.push(change);
        else if (beforeVal >= 10) categories['≥10'].changes.push(change);
      }
    });
  });
  
  const sortedCategories = ['≤2', '3', '4', '5', '6', '7', '8', '9', '≥10'];
  return sortedCategories.map(cat => {
    const validChanges = categories[cat].changes.filter(c => !isNaN(c));
    if (validChanges.length === 0) {
      return { category: cat, meanBefore: null, meanAfter: null, meanChange: null, count: 0 };
    }
    const meanChange = validChanges.reduce((a, b) => a + b, 0) / validChanges.length;
    let meanBefore: number;
    if (cat === '≤2') meanBefore = 2;
    else if (cat === '≥10') meanBefore = 10;
    else meanBefore = parseInt(cat, 10);
    const meanAfter = meanBefore + meanChange;
    return { category: cat, meanBefore, meanAfter, meanChange, count: validChanges.length };
  });
}

export interface RamseierCell {
  pdReduced: { bopReduced: number; bopSame: number; bopIncreased: number };
  pdSame: { bopReduced: number; bopSame: number; bopIncreased: number };
  pdIncreased: { bopReduced: number; bopSame: number; bopIncreased: number };
}

export interface RamseierAnalysisResult {
  table: RamseierCell;
  chiSquare: number | null;
  degreesOfFreedom: number;
  pValue: number | null;
  pearsonR: number | null;
  pearsonDf: number | null;
  pearsonPValue: number | null;
  pearsonCiLower: number | null;
  pearsonCiUpper: number | null;
}

export function calculateRamseierAnalysis(dataBefore: ChartData, dataAfter: ChartData): RamseierAnalysisResult {
  const teethPresentAfter = ALL_TEETH.filter(tooth => isToothPresent(dataAfter, tooth));
  const keySuffixes = ['_db', '_b', '_mb', '_dp', '_p', '_mp', '_dl', '_l', '_ml'];
  
  const counters: RamseierCell = {
    pdReduced: { bopReduced: 0, bopSame: 0, bopIncreased: 0 },
    pdSame: { bopReduced: 0, bopSame: 0, bopIncreased: 0 },
    pdIncreased: { bopReduced: 0, bopSame: 0, bopIncreased: 0 },
  };
  
  const bopAfterValues: number[] = [];
  const pdAfterValues: number[] = [];
  
  teethPresentAfter.forEach(tooth => {
    keySuffixes.forEach(suffix => {
      const pdKey = `pd_${tooth}${suffix}`;
      const bopKey = `bop_${tooth}${suffix}`;
      
      const pdBefore = readNumber(dataBefore[pdKey]);
      const pdAfter = readNumber(dataAfter[pdKey]);
      const bopBefore = readFlag(dataBefore[bopKey]) ? 1 : 0;
      const bopAfter = readFlag(dataAfter[bopKey]) ? 1 : 0;
      
      if (pdBefore > 0 || pdAfter > 0) {
        const pdChange = pdAfter - pdBefore;
        const bopChange = bopAfter - bopBefore;
        
        const pdCategory = pdChange < 0 ? 'pdReduced' : (pdChange === 0 ? 'pdSame' : 'pdIncreased');
        const bopCategory = bopChange < 0 ? 'bopReduced' : (bopChange === 0 ? 'bopSame' : 'bopIncreased');
        
        counters[pdCategory][bopCategory]++;
        
        bopAfterValues.push(bopAfter);
        pdAfterValues.push(pdAfter);
      }
    });
  });
  
  const observed = [
    [counters.pdReduced.bopReduced, counters.pdReduced.bopSame, counters.pdReduced.bopIncreased],
    [counters.pdSame.bopReduced, counters.pdSame.bopSame, counters.pdSame.bopIncreased],
    [counters.pdIncreased.bopReduced, counters.pdIncreased.bopSame, counters.pdIncreased.bopIncreased],
  ];
  
  let chiSquare: number | null = null;
  let pValue: number | null = null;
  const degreesOfFreedom = 4;
  
  const grandTotal = observed.flat().reduce((a, b) => a + b, 0);
  if (grandTotal > 0) {
    const rowSums = observed.map(row => row.reduce((a, b) => a + b, 0));
    const colSums = [0, 1, 2].map(i => observed.reduce((sum, row) => sum + row[i], 0));
    
    let chi = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const expected = (rowSums[i] * colSums[j]) / grandTotal;
        if (expected > 0) {
          chi += Math.pow(observed[i][j] - expected, 2) / expected;
        }
      }
    }
    chiSquare = chi;
    pValue = 1 - chiSquareCdf(chi, degreesOfFreedom);
  }
  
  let pearsonR: number | null = null;
  let pearsonDf: number | null = null;
  let pearsonPValue: number | null = null;
  let pearsonCiLower: number | null = null;
  let pearsonCiUpper: number | null = null;
  
  const validPairs = pdAfterValues
    .map((pd, i) => ({ pd, bop: bopAfterValues[i] }))
    .filter(p => p.bop !== 0);
  
  if (validPairs.length > 1) {
    const xValues = validPairs.map(p => p.pd);
    const yValues = validPairs.map(p => p.bop);
    
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator > 0) {
      pearsonR = numerator / denominator;
      pearsonDf = n - 2;
      
      const tStat = pearsonR * Math.sqrt((n - 2) / (1 - pearsonR * pearsonR));
      pearsonPValue = 2 * (1 - studentTCdf(Math.abs(tStat), n - 2));
      
      const z = 0.5 * Math.log((1 + pearsonR) / (1 - pearsonR));
      const seZ = 1 / Math.sqrt(n - 3);
      const zLower = z - 1.96 * seZ;
      const zUpper = z + 1.96 * seZ;
      pearsonCiLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
      pearsonCiUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);
    }
  }
  
  return {
    table: counters,
    chiSquare,
    degreesOfFreedom,
    pValue,
    pearsonR,
    pearsonDf,
    pearsonPValue,
    pearsonCiLower,
    pearsonCiUpper,
  };
}

function chiSquareCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;
  
  const a = df / 2;
  const x2 = x / 2;
  
  let sum = 0;
  let term = 1;
  for (let k = 0; k < 100; k++) {
    sum += term;
    term *= x2 / (a + k + 1);
    if (term < 1e-15) break;
  }
  
  const logGamma = (a - 1) * Math.log(x2) - x2 - logGammaFn(a);
  const gammaInc = Math.exp(logGamma) * sum;
  const gammaComplete = Math.exp(logGammaFn(a));
  
  return gammaInc / gammaComplete;
}

function logGammaFn(x: number): number {
  const coeffs = [
    Number('76.18009172947146'),
    Number('-86.50532032941677'),
    Number('24.01409824083091'),
    Number('-1.231739572450155'),
    Number('0.1208650973866179e-2'),
    Number('-0.5395239384953e-5'),
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    ser += coeffs[j] / ++y;
  }
  
  return Math.log(Number('2.5066282746310005') * ser / x) - tmp;
}

function studentTCdf(t: number, df: number): number {
  if (t <= 0) return 0.5;
  if (df <= 0) return 1;
  
  const x = df / (t * t + df);
  const a = df / 2;
  const b = 0.5;
  
  return 1 - 0.5 * incompleteBeta(x, a, b);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  const bt = Math.exp(
    logGammaFn(a + b) - logGammaFn(a) - logGammaFn(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(x, a, b) / a;
  }
  
  return 1 - bt * betaContinuedFraction(1 - x, b, a) / b;
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIter = 100;
  const eps = 3e-7;
  const fpmin = 1e-30;
  
  const _m2 = 0;
  const _aa = 0;
  let c = 1;
  let d = 1 / fpmin;
  let h = 1;
  
  for (let m = 1; m <= maxIter; m++) {
    const m2_ = 2 * m;
    let aa_ = 0;
    
    if (m === 1) {
      aa_ = 1;
    } else if (m2_ <= 2 * maxIter) {
      aa_ = -m * (a + m - 1) * (a + b + m - 1) * x / ((a + m2_ - 2) * (a + m2_ - 1));
    }
    
    d = 1 + aa_ * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa_ / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    
    d = 1 / d;
    h *= d * c;
    
    if (Math.abs(aa_ - _m2) < eps) break;
  }
  
  return h;
}
