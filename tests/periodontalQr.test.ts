import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERIO_QR_KEY_SEQUENCE,
  PERIO_QR_KEY_COUNT,
  PERIO_QR_TEETH,
  encodeChartDataForQr,
  buildPerioChartUrl,
  hasRecordedFindings,
  PERIO_QR_TARGET_BASE,
} from '../src/lib/utils/periodontalQr.ts';

/** Bloques de diente copiados literalmente de js/qrcode_modal.js del sitio. */
const REF_TOOTH_18_BLOCK = [
  'tooth_18', 'mobility_18', 'furcation_18_b', 'furcation_18_dp', 'furcation_18_mp', 'implant_18',
  'bop_18_db', 'bop_18_b', 'bop_18_mb', 'pi_18_db', 'pi_18_b', 'pi_18_mb',
  'bop_18_dp', 'bop_18_p', 'bop_18_mp', 'pi_18_dp', 'pi_18_p', 'pi_18_mp',
  'gm_18_db', 'gm_18_b', 'gm_18_mb', 'pd_18_db', 'pd_18_b', 'pd_18_mb',
  'gm_18_dp', 'gm_18_p', 'gm_18_mp', 'pd_18_dp', 'pd_18_p', 'pd_18_mp',
];

const REF_TOOTH_36_BLOCK = [
  'tooth_36', 'mobility_36', 'furcation_36_b', 'furcation_36_l', 'implant_36',
  'bop_36_db', 'bop_36_b', 'bop_36_mb', 'pi_36_db', 'pi_36_b', 'pi_36_mb',
  'bop_36_dl', 'bop_36_l', 'bop_36_ml', 'pi_36_dl', 'pi_36_l', 'pi_36_ml',
  'gm_36_db', 'gm_36_b', 'gm_36_mb', 'pd_36_db', 'pd_36_b', 'pd_36_mb',
  'gm_36_dl', 'gm_36_l', 'gm_36_ml', 'pd_36_dl', 'pd_36_l', 'pd_36_ml',
];

describe('PERIO_QR_KEY_SEQUENCE', () => {
  test('tiene exactamente 900 claves (cadena de 1800 caracteres)', () => {
    assert.equal(PERIO_QR_KEY_COUNT, 900);
    assert.equal(PERIO_QR_KEY_SEQUENCE.length, 900);
    assert.equal(PERIO_QR_KEY_COUNT * 2, 1800);
  });

  test('empieza con initial_exam y reevaluation y termina con pd_41_ml', () => {
    assert.equal(PERIO_QR_KEY_SEQUENCE[0], 'initial_exam');
    assert.equal(PERIO_QR_KEY_SEQUENCE[1], 'reevaluation');
    assert.equal(PERIO_QR_KEY_SEQUENCE[PERIO_QR_KEY_COUNT - 1], 'pd_41_ml');
  });

  test('ordena los dientes 18→11, 28→21, 38→31, 48→41', () => {
    assert.deepEqual(PERIO_QR_TEETH, [
      18, 17, 16, 15, 14, 13, 12, 11,
      28, 27, 26, 25, 24, 23, 22, 21,
      38, 37, 36, 35, 34, 33, 32, 31,
      48, 47, 46, 45, 44, 43, 42, 41,
    ]);
  });

  test('bloque del diente 18 coincide literalmente con el original', () => {
    const start = PERIO_QR_KEY_SEQUENCE.indexOf('tooth_18');
    assert.deepEqual(
      PERIO_QR_KEY_SEQUENCE.slice(start, start + REF_TOOTH_18_BLOCK.length),
      REF_TOOTH_18_BLOCK,
    );
  });

  test('bloque del diente 36 coincide literalmente con el original (furcación b/l)', () => {
    const start = PERIO_QR_KEY_SEQUENCE.indexOf('tooth_36');
    assert.deepEqual(
      PERIO_QR_KEY_SEQUENCE.slice(start, start + REF_TOOTH_36_BLOCK.length),
      REF_TOOTH_36_BLOCK,
    );
  });

  test('dientes unirradículados sin claves de furcación; premolares superiores dp/mp', () => {
    assert.ok(!PERIO_QR_KEY_SEQUENCE.some(k => k.startsWith('furcation_15_')));
    assert.ok(!PERIO_QR_KEY_SEQUENCE.some(k => k.startsWith('furcation_34_')));
    assert.ok(!PERIO_QR_KEY_SEQUENCE.some(k => k.startsWith('furcation_44_')));
    const start14 = PERIO_QR_KEY_SEQUENCE.indexOf('tooth_14');
    const end14 = PERIO_QR_KEY_SEQUENCE.indexOf('tooth_13');
    const block14 = PERIO_QR_KEY_SEQUENCE.slice(start14, end14);
    assert.deepEqual(
      block14.filter(k => k.startsWith('furcation_')),
      ['furcation_14_dp', 'furcation_14_mp'],
    );
  });

  test('sitios internos según el maxilar: dp/p/mp arriba, dl/l/ml abajo', () => {
    assert.ok(PERIO_QR_KEY_SEQUENCE.includes('bop_11_p'));
    assert.ok(!PERIO_QR_KEY_SEQUENCE.includes('bop_11_l'));
    assert.ok(PERIO_QR_KEY_SEQUENCE.includes('bop_41_l'));
    assert.ok(!PERIO_QR_KEY_SEQUENCE.includes('bop_41_p'));
  });

  test('sin claves duplicadas', () => {
    assert.equal(new Set(PERIO_QR_KEY_SEQUENCE).size, PERIO_QR_KEY_COUNT);
  });
});

describe('encodeChartDataForQr', () => {
  test('gráfico vacío → 1800 caracteres, todo "50"', () => {
    const encoded = encodeChartDataForQr({});
    assert.equal(encoded.length, 1800);
    assert.match(encoded, /^(50)+$/);
  });

  test('el offset +50 y el relleno a 2 dígitos siguen al original', () => {
    const idx = PERIO_QR_KEY_SEQUENCE.indexOf('pd_16_mb');
    const encoded = encodeChartDataForQr({ pd_16_mb: 5 });
    assert.equal(encoded.slice(idx * 2, idx * 2 + 2), '55');
  });

  test('valores negativos de GM se codifican (−2 → 48)', () => {
    const idx = PERIO_QR_KEY_SEQUENCE.indexOf('gm_11_b');
    const encoded = encodeChartDataForQr({ gm_11_b: -2 });
    assert.equal(encoded.slice(idx * 2, idx * 2 + 2), '48');
  });

  test('valores de cadena se interpretan ("3" → 53)', () => {
    const idx = PERIO_QR_KEY_SEQUENCE.indexOf('mobility_31');
    const encoded = encodeChartDataForQr({ mobility_31: '3' });
    assert.equal(encoded.slice(idx * 2, idx * 2 + 2), '53');
  });

  test('redondeo del valor (4.6 → 55, 4.4 → 54)', () => {
    const idx = PERIO_QR_KEY_SEQUENCE.indexOf('pd_46_db');
    const up = encodeChartDataForQr({ pd_46_db: 4.6 });
    const down = encodeChartDataForQr({ pd_46_db: 4.4 });
    assert.equal(up.slice(idx * 2, idx * 2 + 2), '55');
    assert.equal(down.slice(idx * 2, idx * 2 + 2), '54');
  });

  test('null/undefined y valores no numéricos cuentan como 0', () => {
    const idx = PERIO_QR_KEY_SEQUENCE.indexOf('implant_26');
    const encoded = encodeChartDataForQr({ implant_26: null, bop_26_b: 'x' });
    assert.equal(encoded.slice(idx * 2, idx * 2 + 2), '50');
    const idxBop = PERIO_QR_KEY_SEQUENCE.indexOf('bop_26_b');
    assert.equal(encoded.slice(idxBop * 2, idxBop * 2 + 2), '50');
  });

  test('un gráfico completo genera exactamente 1800 caracteres', () => {
    const chart: Record<string, unknown> = {};
    for (const tooth of PERIO_QR_TEETH) {
      chart[`tooth_${tooth}`] = '1';
      chart[`mobility_${tooth}`] = '0';
      chart[`implant_${tooth}`] = '0';
      const upper = tooth < 30;
      const sites = ['db', 'b', 'mb', ...(upper ? ['dp', 'p', 'mp'] : ['dl', 'l', 'ml'])];
      for (const site of sites) {
        chart[`bop_${tooth}_${site}`] = '0';
        chart[`pi_${tooth}_${site}`] = '0';
        chart[`gm_${tooth}_${site}`] = '0';
        chart[`pd_${tooth}_${site}`] = '2';
      }
    }
    const encoded = encodeChartDataForQr(chart);
    assert.equal(encoded.length, 1800);
    assert.ok(hasRecordedFindings(chart));
  });
});

describe('buildPerioChartUrl', () => {
  test('construye la URL del visor del sitio con ?i=<datos>', () => {
    const url = buildPerioChartUrl('5050');
    assert.equal(url, `${PERIO_QR_TARGET_BASE}?i=5050`);
    assert.ok(url.startsWith('https://www.periodontalchart-online.com/api/?i='));
  });

  test('acepta una base alternativa', () => {
    assert.equal(buildPerioChartUrl('5050', 'http://localhost:3000/api/'), 'http://localhost:3000/api/?i=5050');
  });
});

describe('hasRecordedFindings', () => {
  test('false para un gráfico vacío', () => {
    assert.equal(hasRecordedFindings({}), false);
  });

  test('true cuando alguna clave de la secuencia es distinta de 0', () => {
    assert.equal(hasRecordedFindings({ tooth_16: 1 }), true);
    assert.equal(hasRecordedFindings({ bop_11_b: '1' }), true);
    assert.equal(hasRecordedFindings({ gm_21_db: -1 }), true);
  });

  test('los valores 0 explícitos no cuentan como hallazgos', () => {
    assert.equal(hasRecordedFindings({ tooth_16: '0', pd_16_b: 0 }), false);
  });
});
