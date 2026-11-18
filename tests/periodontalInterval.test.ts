import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVAL_LADDER_TABLE,
  INTERVAL_MONTH_BOXES,
  analyzeIntervalData,
  calculateIntervalCumulative,
  calculateRecommendedInterval,
  calculateSuggestedInterval,
  findLadderHighlightRow,
} from '../src/lib/utils/periodontalInterval.ts';

function fullMouth(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const chart: Record<string, unknown> = {};
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      const tooth = Number(`${q}${n}`);
      if (tooth === 18 || tooth === 31) continue; // dos dientes ausentes
      chart[`tooth_${tooth}`] = '1';
      const upper = tooth < 30;
      const sites = upper ? ['db', 'b', 'mb', 'dp', 'p', 'mp'] : ['db', 'b', 'mb', 'dl', 'l', 'ml'];
      for (const site of sites) {
        chart[`bop_${tooth}_${site}`] = '0';
        chart[`pi_${tooth}_${site}`] = '0';
        chart[`pd_${tooth}_${site}`] = '2';
        chart[`gm_${tooth}_${site}`] = '0';
      }
    }
  }
  return { ...chart, ...overrides };
}

describe('analyzeIntervalData', () => {
  test('gráfico vacío → todo 0 (no NaN)', () => {
    const analysis = analyzeIntervalData({});
    assert.equal(analysis.totalTeeth, 0);
    assert.equal(analysis.bopPercentage, 0);
    assert.equal(analysis.pdSum4, 0);
    assert.equal(analysis.furcationAdvanced, 0);
  });

  test('cuenta BOP/PI sobre dientes presentes y excluye los ausentes', () => {
    const chart = fullMouth();
    // 30 dientes presentes × 6 sitios = 180
    const analysis = analyzeIntervalData(chart);
    assert.equal(analysis.totalTeeth, 30);
    for (let i = 1; i <= 6; i++) chart[`bop_16_${['db', 'b', 'mb', 'dp', 'p', 'mp'][i - 1]}`] = '1';
    // el implante no rescata un diente apagado
    chart[`tooth_31`] = '0';
    chart[`implant_31`] = '2';
    chart[`bop_31_db`] = '1';
    const withBop = analyzeIntervalData(chart);
    assert.equal(withBop.bopPositiveSites, 6);
    assert.equal(withBop.totalTeeth, 30);
    assert.equal(withBop.bopPercentage, Math.round((6 / 180) * 1000) / 10);
  });

  test('BOP > 0 cuenta como superficie; == 1 como sitio positivo', () => {
    const analysis = analyzeIntervalData(
      fullMouth({ bop_16_db: 1, bop_16_b: 1, bop_11_b: 1 }),
    );
    assert.equal(analysis.bopPositiveSites, 3);
    assert.ok(analysis.bopPercentage > 0);
  });

  test('agrupa PD 4/5/≥6 solo en dientes presentes', () => {
    const chart = fullMouth({ pd_16_db: 4, pd_16_b: 5, pd_16_mb: 6, pd_16_dp: 7, pd_31_db: 6 });
    chart.tooth_31 = '0';
    const analysis = analyzeIntervalData(chart);
    assert.equal(analysis.pdSum4, 1);
    assert.equal(analysis.pdSum5, 1);
    assert.equal(analysis.pdSum6Plus, 2); // 16_mb, 16_dp (31 ausente no cuenta)
  });

  test('furcaciones avanzadas = grados 2 y 3, con puerta de presencia', () => {
    const chart = fullMouth({
      furcation_16_b: 2,
      furcation_16_dp: 3,
      furcation_16_mp: 1,
      furcation_46_b: 3,
      furcation_36_b: 1,
    });
    chart.tooth_36 = '0';
    const analysis = analyzeIntervalData(chart);
    assert.equal(analysis.furcationAdvanced, 3); // 16_b, 16_dp, 46_b
  });

  test('porcentajes a un decimal', () => {
    const chart = fullMouth();
    const sites = ['db', 'b', 'mb', 'dp', 'p', 'mp'];
    for (let i = 0; i < 2; i++) chart[`pi_16_${sites[i]}`] = '1';
    const analysis = analyzeIntervalData(chart);
    assert.equal(analysis.piPercentage, Math.round((2 / 180) * 1000) / 10);
  });

  test('claves pi_sci no cuentan como placa regular', () => {
    const analysis = analyzeIntervalData(fullMouth({ pi_sci_16_b: 1 }));
    assert.equal(analysis.piPositiveSites, 0);
  });
});

describe('calculateIntervalCumulative', () => {
  test('suma los buckets 1 decimal', () => {
    const cumulative = calculateIntervalCumulative({
      totalTeeth: 30,
      bopPercentage: 0,
      piPercentage: 0,
      pdSum4Percentage: 2.3,
      pdSum5Percentage: 1.4,
      pdSum6PlusPercentage: 0.9,
      bopPositiveSites: 0,
      piPositiveSites: 0,
      furcationAdvanced: 0,
      pdSum4: 0,
      pdSum5: 0,
      pdSum6Plus: 0,
    });
    assert.equal(cumulative.cumulative4, 4.6);
    assert.equal(cumulative.cumulative5, 2.3);
    assert.equal(cumulative.cumulative6, 0.9);
  });
});

describe('calculateSuggestedInterval (escalera efectiva del modal)', () => {
  test('cum4: ≤10 → 12, ≤20 → 6, resto → 3 (el 4 es código muerto del original)', () => {
    assert.equal(calculateSuggestedInterval(8, 0, 0), 12);
    assert.equal(calculateSuggestedInterval(15, 0, 0), 6);
    assert.equal(calculateSuggestedInterval(25, 0, 0), 3);
    assert.equal(calculateSuggestedInterval(40, 0, 0), 3);
  });

  test('cum5: ≤2 → 12, ≤4 → 9, ≤6 → 6, ≤10 → 4, resto → 3', () => {
    assert.equal(calculateSuggestedInterval(0, 1.5, 0), 12);
    assert.equal(calculateSuggestedInterval(0, 3.5, 0), 9);
    assert.equal(calculateSuggestedInterval(0, 5, 0), 6);
    assert.equal(calculateSuggestedInterval(0, 8, 0), 4);
    assert.equal(calculateSuggestedInterval(0, 15, 0), 3);
  });

  test('cum6: ≤1 → 12, ≤2 → 6, ≤3 → 4, resto → 3 (el 9 es código muerto)', () => {
    assert.equal(calculateSuggestedInterval(0, 0, 0.5), 12);
    assert.equal(calculateSuggestedInterval(0, 0, 1.5), 6);
    assert.equal(calculateSuggestedInterval(0, 0, 2.5), 4);
    assert.equal(calculateSuggestedInterval(0, 0, 3.5), 3);
  });

  test('sugerido = mínimo de las tres columnas', () => {
    // cum4=8 → 12, cum5=5 → 6, cum6=2.5 → 4
    assert.equal(calculateSuggestedInterval(8, 5, 2.5), 4);
    assert.equal(calculateSuggestedInterval(0, 0, 0), 12);
  });

  test('la tabla de umbrales coincide con la escalera efectiva', () => {
    for (const [column, thresholds] of [
      ['t4', [30, 20, 20, 10, 10]],
      ['t5', [20, 10, 6, 4, 2]],
      ['t6', [4, 3, 2, 1, 1]],
    ] as const) {
      INTERVAL_LADDER_TABLE.forEach((row, index) => {
        assert.equal(row[column], thresholds[index]);
      });
    }
    assert.deepEqual(INTERVAL_MONTH_BOXES, [3, 4, 6, 9, 12]);
  });
});

describe('findLadderHighlightRow', () => {
  test('resalta la última fila cuyo umbral cubre el valor', () => {
    assert.equal(findLadderHighlightRow(25, 't4'), 3);
    assert.equal(findLadderHighlightRow(15, 't4'), 6);
    assert.equal(findLadderHighlightRow(8, 't4'), 12);
    assert.equal(findLadderHighlightRow(1.5, 't6'), 6);
  });

  test('devuelve null cuando ningún umbral alcanza (columna crítica)', () => {
    assert.equal(findLadderHighlightRow(40, 't4'), null);
    assert.equal(findLadderHighlightRow(5, 't6'), null);
  });
});

describe('calculateRecommendedInterval', () => {
  const base = {
    suggested: 6,
    smoking: false,
    diabetes: false,
    furcationAdvanced: 0,
    bopPercentage: 10,
  };

  test('sin factores de riesgo mantiene el sugerido sin etiquetas', () => {
    const result = calculateRecommendedInterval(base);
    assert.equal(result.recommended, 6);
    assert.deepEqual(result.factors, []);
  });

  test('BOP sobre umbral acorta un paso y etiqueta BOP', () => {
    const result = calculateRecommendedInterval({ ...base, bopPercentage: 23.1 });
    assert.equal(result.recommended, 4);
    assert.deepEqual(result.factors, ['BOP']);
  });

  test('umbral BOP: 16% no fumador, 23% no dispara con fumador... al revés: fumador 16%', () => {
    // No fumador: umbral 23 → 23.0 NO dispara (> 23)
    assert.deepEqual(calculateRecommendedInterval({ ...base, bopPercentage: 23 }).factors, []);
    // Fumador: umbral 16 → 16.1 dispara
    const smoker = calculateRecommendedInterval({ ...base, bopPercentage: 16.1, isSmokerThreshold: true });
    assert.deepEqual(smoker.factors, ['BOP']);
    // Fumador: 16.0 no dispara
    assert.deepEqual(
      calculateRecommendedInterval({ ...base, bopPercentage: 16, isSmokerThreshold: true }).factors,
      [],
    );
  });

  test('tabaquismo y diabetes etiquetan S y D sin BOP', () => {
    const result = calculateRecommendedInterval({ ...base, smoking: true, diabetes: true });
    assert.equal(result.recommended, 4);
    assert.deepEqual(result.factors, ['S', 'D']);
  });

  test('furcaciones ≥2 acortan y etiquetan F', () => {
    const result = calculateRecommendedInterval({ ...base, furcationAdvanced: 1 });
    assert.equal(result.recommended, 4);
    assert.deepEqual(result.factors, ['F']);
  });

  test('orden de etiquetas BOP, S, D, F', () => {
    const result = calculateRecommendedInterval({
      ...base,
      bopPercentage: 30,
      smoking: true,
      diabetes: true,
      furcationAdvanced: 2,
    });
    assert.deepEqual(result.factors, ['BOP', 'S', 'D', 'F']);
  });

  test('sugerido ya en 3 meses se queda en 3 aunque haya riesgos', () => {
    const result = calculateRecommendedInterval({ ...base, suggested: 3, smoking: true });
    assert.equal(result.recommended, 3);
    assert.deepEqual(result.factors, ['S']);
  });

  test('12 → 9 con riesgo', () => {
    const result = calculateRecommendedInterval({ ...base, suggested: 12, diabetes: true });
    assert.equal(result.recommended, 9);
  });
});
