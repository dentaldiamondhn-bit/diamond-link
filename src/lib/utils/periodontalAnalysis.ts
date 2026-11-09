import { ChartData, FDIToothNumber } from '@/lib/types/clinical';
import { ALL_TEETH } from '@/lib/constants/teeth';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';

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

export function readNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readFlag(value: unknown): boolean {
  return value === '1' || value === 1 || value === true;
}

export function getToothAl(data: ChartData, tooth: FDIToothNumber, surface: string): number {
  const stored = data[`al_${tooth}_${surface}`];
  if (stored !== undefined && stored !== null && stored !== '') return readNumber(stored);

  const pd = readNumber(data[`pd_${tooth}_${surface}`]);
  const gm = readNumber(data[`gm_${tooth}_${surface}`]);
  const inverted = data.isGmInverted === undefined ? true : Boolean(data.isGmInverted);
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

    if (readNumber(data[`furcation_${tooth}_b`]) >= 2) stats.furcationAdvanced += 1;
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

  const furcation = readNumber(data[`furcation_${tooth}_b`]);
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
