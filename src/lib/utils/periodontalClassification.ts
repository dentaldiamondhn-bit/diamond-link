export type ClassificationChartRecord = Record<string, any>;

export const ROOT_LENGTHS: Record<number, number> = {
  11: 13.0, 12: 13.4, 13: 16.5, 14: 13.4, 15: 14.0, 16: 12.9, 17: 12.9, 18: 10.8,
  21: 13.0, 22: 13.4, 23: 16.5, 24: 13.4, 25: 14.0, 26: 12.9, 27: 12.9, 28: 10.8,
  31: 12.6, 32: 13.5, 33: 15.9, 34: 14.4, 35: 14.7, 36: 14.0, 37: 13.9, 38: 11.8,
  41: 12.6, 42: 13.5, 43: 15.9, 44: 14.4, 45: 14.7, 46: 14.0, 47: 13.9, 48: 11.8,
};

const ALL_SURFACES = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
const INTERPROXIMAL_SURFACES = ['mb', 'db', 'mp', 'dp', 'ml', 'dl'];
const MOLAR_TEETH = new Set(['16', '26', '36', '46']);
const INCISOR_TEETH = new Set(['11', '21', '31', '41']);
const MOLAR_INCISOR_TEETH = new Set([...MOLAR_TEETH, ...INCISOR_TEETH]);

export const ALL_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
] as const;

export interface ClassificationSuggestion {
  cellId: string;
  group: string;
  text: string;
}

function isToothPresent(data: ClassificationChartRecord, tooth: number): boolean {
  const value = data[`tooth_${tooth}`];
  return value === '1' || value === 1 || value === true;
}

function readNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isGmInverted(data: ClassificationChartRecord): boolean {
  const value = data.isGmInverted;
  return value === true || value === 'true';
}

function attachmentLoss(data: ClassificationChartRecord, tooth: number, surface: string): number {
  const pd = readNumber(data[`pd_${tooth}_${surface}`]);
  const gm = readNumber(data[`gm_${tooth}_${surface}`]);
  return isGmInverted(data) ? pd + gm : pd - gm;
}

export function calculateAgeAt(dobStr: string | null | undefined, refDateStr: string | null | undefined): number | null {
  if (!dobStr || !refDateStr) return null;
  const dob = new Date(dobStr);
  const refDate = new Date(refDateStr);
  if (isNaN(dob.getTime()) || isNaN(refDate.getTime())) return null;
  let age = refDate.getFullYear() - dob.getFullYear();
  const monthDiff = refDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function getGroupPrefix(cellId: string): string {
  const parts = cellId.split('-');
  if (parts.length >= 2) {
    if (parts[0] === 'grade' || parts[0] === 'stage') {
      return `${parts[0]}-${parts[1]}`;
    }
    if (parts[0] === 'extent') {
      return 'extent-distribution';
    }
    return parts.slice(0, parts.length - 2).join('-');
  }
  return cellId;
}

export function suggestStageFromMaxPd(data: ClassificationChartRecord): ClassificationSuggestion | null {
  let maxPd = -1;
  let maxTooth: number | null = null;
  let maxSurface: string | null = null;

  ALL_FDI_TEETH.forEach(tooth => {
    if (!isToothPresent(data, tooth)) return;
    ALL_SURFACES.forEach(surface => {
      const pd = readNumber(data[`pd_${tooth}_${surface}`]);
      if (pd > maxPd) {
        maxPd = pd;
        maxTooth = tooth;
        maxSurface = surface;
      }
    });
  });

  if (maxTooth === null || maxPd < 1) return null;

  let cellId: string;
  if (maxPd >= 6) cellId = 'complexity-stage-3';
  else if (maxPd >= 4) cellId = 'complexity-stage-2';
  else cellId = 'complexity-stage-1';

  const stageNumber = cellId.slice(-1);
  return {
    cellId,
    group: getGroupPrefix(cellId),
    text: `Profundidad de sondaje máxima: ${maxPd} mm (diente ${maxTooth}, superficie ${maxSurface?.toUpperCase()}) → Complejidad: Estadio ${stageNumber}`,
  };
}

export function suggestStageFromMaxInterproximalAl(data: ClassificationChartRecord): ClassificationSuggestion | null {
  let maxAl = -1;
  let maxTooth: number | null = null;
  let maxSurface: string | null = null;

  ALL_FDI_TEETH.forEach(tooth => {
    if (!isToothPresent(data, tooth)) return;
    INTERPROXIMAL_SURFACES.forEach(surface => {
      const al = attachmentLoss(data, tooth, surface);
      if (al > maxAl) {
        maxAl = al;
        maxTooth = tooth;
        maxSurface = surface;
      }
    });
  });

  if (maxTooth === null || maxAl < 1) return null;

  let cellId: string;
  if (maxAl >= 5) cellId = 'interproximal-al-stage-3';
  else if (maxAl >= 3) cellId = 'interproximal-al-stage-2';
  else cellId = 'interproximal-al-stage-1';

  const threshold = maxAl >= 5 ? '≥ 5 mm' : maxAl >= 3 ? '≥ 3 mm' : '≥ 1 mm';
  return {
    cellId,
    group: getGroupPrefix(cellId),
    text: `Pérdida de inserción interdental máxima: ${maxAl} mm (diente ${maxTooth}, superficie ${maxSurface?.toUpperCase()}) → Severidad: ${threshold}`,
  };
}

export function suggestExtentDistribution(data: ClassificationChartRecord): ClassificationSuggestion | null {
  const affectedTeeth = new Set<string>();
  const presentTeeth: string[] = [];

  ALL_FDI_TEETH.forEach(tooth => {
    if (!isToothPresent(data, tooth)) return;
    const toothStr = String(tooth);
    presentTeeth.push(toothStr);
    for (const surface of ALL_SURFACES) {
      if (attachmentLoss(data, tooth, surface) >= 3) {
        affectedTeeth.add(toothStr);
        break;
      }
    }
  });

  if (affectedTeeth.size === 0 || presentTeeth.length === 0) return null;

  const percentage = affectedTeeth.size / presentTeeth.length;

  let miSum = 0;
  let miCount = 0;
  let otherSum = 0;
  let otherCount = 0;
  let molarCount = 0;
  let incisorCount = 0;

  affectedTeeth.forEach(toothStr => {
    const tooth = parseInt(toothStr, 10);
    const isMi = MOLAR_INCISOR_TEETH.has(toothStr);
    if (MOLAR_TEETH.has(toothStr)) molarCount += 1;
    if (INCISOR_TEETH.has(toothStr)) incisorCount += 1;
    for (const surface of ALL_SURFACES) {
      const al = attachmentLoss(data, tooth, surface);
      if (al >= 3) {
        if (isMi) {
          miSum += al;
          miCount += 1;
        } else {
          otherSum += al;
          otherCount += 1;
        }
      }
    }
  });

  const miAvg = miCount > 0 ? miSum / miCount : 0;
  const otherAvg = otherCount > 0 ? otherSum / otherCount : 0;

  let cellId: string;
  let text: string;
  if (miAvg - otherAvg > 2 && molarCount >= 1 && incisorCount >= 1) {
    cellId = 'extent-distribution-3';
    text = `Patrón de inserción: media molares/incisivos ${miAvg.toFixed(1)} mm > otros ${otherAvg.toFixed(1)} mm (diferencia > 2 mm) → Patrón de molares/incisivos`;
  } else {
    const percentText = `${(percentage * 100).toFixed(1)}%`;
    if (percentage < 0.3) {
      cellId = 'extent-distribution-1';
      text = `Distribución: ${percentText} de los dientes (${affectedTeeth.size}/${presentTeeth.length}) afectados → localizado`;
    } else {
      cellId = 'extent-distribution-2';
      text = `Distribución: ${percentText} de los dientes (${affectedTeeth.size}/${presentTeeth.length}) afectados → generalizado`;
    }
  }

  return { cellId, group: getGroupPrefix(cellId), text };
}

export function suggestBlAgeGrade(data: ClassificationChartRecord, age: number | null): ClassificationSuggestion | null {
  if (!age || age <= 0) return null;

  let maxAl = -1;
  let maxTooth: number | null = null;

  ALL_FDI_TEETH.forEach(tooth => {
    if (!isToothPresent(data, tooth)) return;
    INTERPROXIMAL_SURFACES.forEach(surface => {
      const al = attachmentLoss(data, tooth, surface);
      if (al > maxAl) {
        maxAl = al;
        maxTooth = tooth;
      }
    });
  });

  if (maxTooth === null || maxAl < 1) return null;

  const rootLength = ROOT_LENGTHS[maxTooth];
  if (!rootLength) return null;

  const boneLossPercent = (maxAl / rootLength) * 100;
  const quotient = boneLossPercent / age;

  let cellId: string;
  if (quotient < 0.25) cellId = 'bl-age-grade-a';
  else if (quotient <= 1.0) cellId = 'bl-age-grade-b';
  else cellId = 'bl-age-grade-c';

  const gradeLetter = cellId.slice(-1).toUpperCase();
  return {
    cellId,
    group: getGroupPrefix(cellId),
    text: `Pérdida ósea/edad: ${boneLossPercent.toFixed(1)}% / ${age} años = ${quotient.toFixed(2)} → Grado ${gradeLetter}`,
  };
}

export interface SmokingPatientData {
  fuma?: string | null;
  fuma_cantidad?: number | string | null;
}

export function suggestSmokingModifier(patient: SmokingPatientData | null | undefined): ClassificationSuggestion | null {
  if (!patient || patient.fuma !== 'si' && patient.fuma !== 'no') return null;

  if (patient.fuma === 'no') {
    return {
      cellId: 'smoking-grade-a',
      group: 'smoking',
      text: 'Tabaquismo: no fumador → Modificador Grado A',
    };
  }

  const cantidad = readNumber(patient.fuma_cantidad);
  if (!cantidad) return null;

  const cellId = cantidad >= 10 ? 'smoking-grade-c' : 'smoking-grade-b';
  return {
    cellId,
    group: 'smoking',
    text: `Tabaquismo: ${cantidad} cig/día → Modificador Grado ${cantidad >= 10 ? 'C' : 'B'}`,
  };
}

export type ClassificationDetails = Record<string, string>;

const SMOKING_MODIFIERS: Record<string, string | null> = {
  'smoking-grade-a': null,
  'smoking-grade-b': '< 10 cig/día',
  'smoking-grade-c': '≥ 10 cig/día',
};

const DIABETES_MODIFIERS: Record<string, string | null> = {
  'diabetes-grade-a': null,
  'diabetes-grade-b': 'HbA1c < 7.0 %',
  'diabetes-grade-c': 'HbA1c ≥ 7 %',
};

export interface ResolvedClassification {
  stage: number | null;
  grade: 'A' | 'B' | 'C' | null;
  extent: 'localizada' | 'generalizada' | 'molar-incisivo' | null;
  smokingModifier: string | null;
  diabetesModifier: string | null;
}

const GRADE_ORDER: Record<string, number> = { A: 1, B: 2, C: 3 };
const ROMAN_NUMERALS: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export function resolveClassification(details: ClassificationDetails): ResolvedClassification {
  let stage: number | null = null;
  let grade: 'A' | 'B' | 'C' | null = null;
  let extent: ResolvedClassification['extent'] = null;
  let smokingModifier: string | null = null;
  let diabetesModifier: string | null = null;

  Object.values(details).forEach(cellId => {
    const stageMatch = cellId.match(/stage-(\d)/);
    if (stageMatch) {
      const num = parseInt(stageMatch[1], 10);
      if (stage === null || num > stage) stage = num;
    }

    const gradeMatch = cellId.match(/grade-([abc])/);
    if (gradeMatch) {
      const letter = gradeMatch[1].toUpperCase() as 'A' | 'B' | 'C';
      if (grade === null || GRADE_ORDER[letter] > GRADE_ORDER[grade]) grade = letter;
    }

    if (cellId === 'extent-distribution-1') extent = 'localizada';
    else if (cellId === 'extent-distribution-2') extent = 'generalizada';
    else if (cellId === 'extent-distribution-3') extent = 'molar-incisivo';

    if (cellId in SMOKING_MODIFIERS) smokingModifier = SMOKING_MODIFIERS[cellId];
    if (cellId in DIABETES_MODIFIERS) diabetesModifier = DIABETES_MODIFIERS[cellId];
  });

  return { stage, grade, extent, smokingModifier, diabetesModifier };
}

export function buildDiagnosisText(resolved: ResolvedClassification): string | null {
  if (!resolved.stage) return null;

  const parts: string[] = [];
  if (resolved.extent === 'localizada') parts.push('Periodontitis localizada');
  else if (resolved.extent === 'generalizada') parts.push('Periodontitis generalizada');
  else if (resolved.extent === 'molar-incisivo') parts.push('Periodontitis con patrón de molares/incisivos');
  else parts.push('Periodontitis');

  parts.push(`Estadio ${ROMAN_NUMERALS[resolved.stage] ?? resolved.stage}`);
  if (resolved.grade) parts.push(`Grado ${resolved.grade}`);

  const modifierLabels: string[] = [];
  if (resolved.smokingModifier) modifierLabels.push(`Tabaquismo (${resolved.smokingModifier})`);
  if (resolved.diabetesModifier) modifierLabels.push(`Diabetes (${resolved.diabetesModifier})`);
  if (modifierLabels.length > 0) {
    parts.push(`asociada a ${modifierLabels.join(' y ')}`);
  }

  return parts.join(', ');
}

export function computeAutoSuggestions(
  data: ClassificationChartRecord,
  age: number | null,
  patient?: SmokingPatientData | null,
): ClassificationSuggestion[] {
  const suggestions: ClassificationSuggestion[] = [];
  const push = (suggestion: ClassificationSuggestion | null) => {
    if (suggestion) suggestions.push(suggestion);
  };

  push(suggestStageFromMaxPd(data));
  push(suggestStageFromMaxInterproximalAl(data));
  push(suggestExtentDistribution(data));
  push(suggestBlAgeGrade(data, age));
  push(suggestSmokingModifier(patient));

  return suggestions;
}
