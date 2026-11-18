/**
 * Puerto del modal "Intervalo de Mantenimiento" del sitio de referencia
 * (periodontalchart-online.com, js/renderer/interval_renderer.js).
 *
 * Dos escaleras de intervalos conviven en el sitio: la del historial (limpia,
 * ya portada en periodontalHistory.ts) y la de ESTE modal, cuyas condiciones
 * duplicadas del original se resuelven aquí a su efecto real:
 *   cum4: ≤10 → 12, ≤20 → 6, resto → 3   (el "≤20 → 4" es código muerto)
 *   cum5: ≤2 → 12, ≤4 → 9, ≤6 → 6, ≤10 → 4, resto → 3
 *   cum6: ≤1 → 12, ≤2 → 6, ≤3 → 4, resto → 3  (el "≤1 → 9" es código muerto)
 * sugerido = mínimo de las tres.
 *
 * Motor autocontenido (sin imports) para node --test.
 */

export interface IntervalAnalysis {
  totalTeeth: number;
  bopPercentage: number;
  piPercentage: number;
  pdSum4Percentage: number;
  pdSum5Percentage: number;
  pdSum6PlusPercentage: number;
  bopPositiveSites: number;
  piPositiveSites: number;
  furcationAdvanced: number;
  pdSum4: number;
  pdSum5: number;
  pdSum6Plus: number;
}

export interface IntervalData {
  recommended?: number;
  suggested?: number;
  smoking?: boolean;
  diabetes?: boolean;
}

/** Umbrales de BOP según tabaquismo (el original: fumador 16%, no fumador 23%). */
export const INTERVAL_BOP_TARGET_SMOKER = 16;
export const INTERVAL_BOP_TARGET_NON_SMOKER = 23;

/** Cajas de meses del original y la tabla de umbrales acumulados (≥4/≥5/≥6 mm). */
export const INTERVAL_MONTH_BOXES = [3, 4, 6, 9, 12] as const;

export const INTERVAL_LADDER_TABLE: ReadonlyArray<{
  months: number;
  t4: number;
  t5: number;
  t6: number;
}> = [
  { months: 3, t4: 30, t5: 20, t6: 4 },
  { months: 4, t4: 20, t5: 10, t6: 3 },
  { months: 6, t4: 20, t5: 6, t6: 2 },
  { months: 9, t4: 10, t5: 4, t6: 1 },
  { months: 12, t4: 10, t5: 2, t6: 1 },
];

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Puerto de `analyzeIntervalData`. El denominador son 6 sitios por diente
 * presente ("der Zahn entscheidet": el implante nunca rescata un diente
 * apagado); BOP/PI cuentan valores > 0, PD se agrupa 4/5/≥6 y las furcaciones
 * avanzadas son grados 2|3. El gráfico vacío rinde 0 (no NaN).
 */
export function analyzeIntervalData(chartData: Record<string, unknown>): IntervalAnalysis {
  const presentTeeth = Object.keys(chartData).filter(
    key => /^tooth_\d\d$/.test(key) && Number(chartData[key]) === 1,
  ).length;
  const totalSites = presentTeeth * 6;

  let bopSurfaces = 0;
  let piSurfaces = 0;
  let bopPositiveSites = 0;
  let piPositiveSites = 0;
  let pdSum4 = 0;
  let pdSum5 = 0;
  let pdSum6Plus = 0;
  let furcationAdvanced = 0;

  for (const key of Object.keys(chartData)) {
    const match = key.match(/^(bop|pi|pd|furcation)_(\d\d)_/);
    if (!match) continue;

    const prefix = match[1];
    const toothNumber = match[2];
    if (Number(chartData[`tooth_${toothNumber}`]) !== 1) continue;

    const value = Number(chartData[key]);
    if (!Number.isFinite(value)) continue;

    if (prefix === 'bop') {
      if (value > 0) bopSurfaces++;
      if (value === 1) bopPositiveSites++;
    } else if (prefix === 'pi') {
      if (value > 0) piSurfaces++;
      if (value === 1) piPositiveSites++;
    } else if (prefix === 'pd') {
      if (value === 4) pdSum4++;
      else if (value === 5) pdSum5++;
      else if (value >= 6) pdSum6Plus++;
    } else if (prefix === 'furcation') {
      if (value === 2 || value === 3) furcationAdvanced++;
    }
  }

  const pct = (count: number) => (totalSites > 0 ? round1((count / totalSites) * 100) : 0);

  return {
    totalTeeth: presentTeeth,
    bopPercentage: pct(bopSurfaces),
    piPercentage: pct(piSurfaces),
    pdSum4Percentage: pct(pdSum4),
    pdSum5Percentage: pct(pdSum5),
    pdSum6PlusPercentage: pct(pdSum6Plus),
    bopPositiveSites,
    piPositiveSites,
    furcationAdvanced,
    pdSum4,
    pdSum5,
    pdSum6Plus,
  };
}

/** Acumulados (%) tal como los muestra la tabla: ≥4, ≥5, ≥6 mm. */
export function calculateIntervalCumulative(analysis: IntervalAnalysis): {
  cumulative4: number;
  cumulative5: number;
  cumulative6: number;
} {
  return {
    cumulative4: round1(
      analysis.pdSum4Percentage + analysis.pdSum5Percentage + analysis.pdSum6PlusPercentage,
    ),
    cumulative5: round1(analysis.pdSum5Percentage + analysis.pdSum6PlusPercentage),
    cumulative6: round1(analysis.pdSum6PlusPercentage),
  };
}

/** Escalera efectiva del modal (ver cabecera) para una columna acumulada. */
function ladderMax(cumulative: number, thresholds: number[]): number {
  // thresholds = [3,4,6,9,12] en meses, de la fila superior a la inferior;
  // se queda con la ÚLTIMA fila cuyo umbral cubre el valor (como el
  // highlight del original, que toma el índice más bajo que coincide).
  let max = 3;
  INTERVAL_LADDER_TABLE.forEach((row, index) => {
    if (cumulative <= thresholds[index]) max = row.months;
  });
  return max;
}

/**
 * Puerto de `calculateSuggestedInterval` con su efecto real (las condiciones
 * duplicadas del original hacen que st4 nunca dé 4 y st6 nunca dé 9).
 */
export function calculateSuggestedInterval(
  cumulative4: number,
  cumulative5: number,
  cumulative6: number,
): number {
  const st4 = ladderMax(cumulative4, [30, 20, 20, 10, 10]);
  const st5 = ladderMax(cumulative5, [20, 10, 6, 4, 2]);
  const st6 = ladderMax(cumulative6, [4, 3, 2, 1, 1]);
  return Math.min(st4, st5, st6);
}

export interface RecommendedIntervalInput {
  suggested: number;
  smoking: boolean;
  diabetes: boolean;
  furcationAdvanced: number;
  bopPercentage: number;
  isSmokerThreshold?: boolean;
}

export interface RecommendedIntervalResult {
  recommended: number;
  factors: string[];
}

/**
 * Puerto de `updateMonthBoxes`: con factores de riesgo (tabaquismo, diabetes,
 * furcaciones ≥2 o BOP sobre el umbral 16%/23%) el intervalo recomendado se
 * acorta un paso en [3,4,6,9,12]. Etiquetas en el orden del original:
 * BOP, S, D, F.
 */
export function calculateRecommendedInterval(
  input: RecommendedIntervalInput,
): RecommendedIntervalResult {
  const bopTarget = input.isSmokerThreshold
    ? INTERVAL_BOP_TARGET_SMOKER
    : INTERVAL_BOP_TARGET_NON_SMOKER;
  const bopTooHigh = input.bopPercentage > bopTarget;
  const hasAdvancedFurcations = input.furcationAdvanced > 0;

  const factors: string[] = [];
  if (bopTooHigh) factors.push('BOP');
  if (input.smoking) factors.push('S');
  if (input.diabetes) factors.push('D');
  if (hasAdvancedFurcations) factors.push('F');

  const hasRiskFactors =
    input.smoking || input.diabetes || hasAdvancedFurcations || bopTooHigh;

  if (!hasRiskFactors) {
    return { recommended: input.suggested, factors: [] };
  }

  const intervals = [3, 4, 6, 9, 12];
  const currentIndex = intervals.indexOf(input.suggested);
  const recommended =
    currentIndex > 0 ? intervals[currentIndex - 1] : 3;
  return { recommended, factors };
}

/**
 * Fila resaltada de la tabla de umbrales para una columna acumulada: la última
 * fila cuyo umbral cubre el valor, o null cuando ninguna (columna crítica).
 */
export function findLadderHighlightRow(
  cumulative: number,
  column: 't4' | 't5' | 't6',
): number | null {
  let highlighted: number | null = null;
  INTERVAL_LADDER_TABLE.forEach(row => {
    if (cumulative <= row[column]) highlighted = row.months;
  });
  return highlighted;
}
