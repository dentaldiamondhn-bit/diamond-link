import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeForProfile,
  buildProfileAssessment,
  buildAIPrompt,
  getSmokingStatus,
 detectDiabetes,
  type ProfileAssessmentInput,
} from '../src/lib/utils/periodontalProfile.ts';

type ChartRecord = Record<string, any>;

function fullMouth(): ChartRecord {
  const rec: ChartRecord = {};
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      rec[`tooth_${q}${n}`] = '1';
    }
  }
  return rec;
}

describe('analyzeForProfile (analyzeJsonData port)', () => {
  test('an empty mouth reports nothing', () => {
    const r = analyzeForProfile({});
    assert.equal(r.totalTeeth, 32); // no explicit 0 flags: site counts 32 anyway
    assert.equal(r.totalSites, 192);
    assert.equal(r.pi, 0);
    assert.equal(r.bop, 0);
    assert.equal(r.pd4, 0);
    assert.equal(r.pd5, 0);
    assert.equal(r.pd6, 0);
    assert.equal(r.furcation2, 0);
  });

  test('one bleeding site is 0.5% like the site (round to 1 decimal)', () => {
    const rec = fullMouth();
    rec.bop_16_mb = 1;
    const r = analyzeForProfile(rec);
    assert.equal(r.bop, 0.5); // Math.round(1/192*1000)/10 = 0.5
    assert.equal(r.bopPositiveSites, 1);
    assert.equal(r.pi, 0);
  });

  test('explicitly missing teeth shrink the denominator and skip their keys', () => {
    const rec = fullMouth();
    rec.tooth_16 = '0';
    rec.tooth_17 = 0;
    rec.bop_16_mb = 1; // ignored: tooth off
    rec.bop_21_mb = 1;
    const r = analyzeForProfile(rec);
    assert.equal(r.totalTeeth, 30);
    assert.equal(r.totalSites, 180);
    assert.equal(r.bop, Math.round((1 / 180) * 1000) / 10); // 0.6
  });

  test('teeth without a flag keep the denominator but contribute no sites', () => {
    const rec = fullMouth();
    delete rec.tooth_16;
    rec.bop_16_mb = 1; // key exists but position not besetzt
    const r = analyzeForProfile(rec);
    assert.equal(r.totalTeeth, 32); // quirk: only explicit 0 shrinks
    assert.equal(r.totalSites, 192);
    assert.equal(r.bop, 0);
  });

  test('pd buckets split at 4, 5 and >=6 only for natural teeth', () => {
    const rec = fullMouth();
    rec.pd_16_db = 4;
    rec.pd_16_b = 5;
    rec.pd_16_mb = 6;
    rec.pd_21_mb = '7'; // string values parse
    rec.pd_36_ml = 3; // below threshold: ignored
    const r = analyzeForProfile(rec);
    assert.equal(r.pd4, Math.round((1 / 192) * 1000) / 10);
    assert.equal(r.pd5, Math.round((1 / 192) * 1000) / 10);
    assert.equal(r.pd6, Math.round((2 / 192) * 1000) / 10);
  });

  test('pd of a switched-off implanted position is not counted', () => {
    const rec = fullMouth();
    rec.tooth_16 = '0';
    rec.implant_16 = 2;
    rec.pd_16_mb = 6;
    const r = analyzeForProfile(rec);
    assert.equal(r.pd6, 0);
  });

  test('furcation grade 2 and 3 sites are counted, grade 1 is not', () => {
    const rec = fullMouth();
    rec.furcation_16_b = 2;
    rec.furcation_46_l = '3';
    rec.furcation_14_dp = 1;
    rec.furcation_36_l = 0;
    const r = analyzeForProfile(rec);
    assert.equal(r.furcation2, 2);
  });

  test('furcations on missing teeth and implant-only positions are ignored', () => {
    const rec = fullMouth();
    rec.tooth_16 = '0';
    rec.furcation_16_b = 3;
    rec.tooth_46 = '0';
    rec.implant_46 = 1;
    rec.furcation_46_l = 2;
    const r = analyzeForProfile(rec);
    assert.equal(r.furcation2, 0);
  });

  test('counts visible implants on occupied positions', () => {
    const rec = fullMouth();
    rec.implant_16 = 2;
    rec.implant_11 = '1';
    rec.implant_48 = 3;
    rec.tooth_48 = '0';
    const r = analyzeForProfile(rec);
    assert.equal(r.totalImplants, 2);
  });
});

describe('getSmokingStatus / detectDiabetes', () => {
  test('smoker when fuma is si', () => {
    assert.equal(getSmokingStatus({ fuma: 'si' }), 'raucher');
    assert.equal(getSmokingStatus({ fuma: 'no' }), 'nichtraucher');
    assert.equal(getSmokingStatus(null), 'nichtraucher');
  });

  test('diabetes detected in free-text disease fields', () => {
    assert.equal(detectDiabetes({ enfermedades: 'Diabetes tipo 2' }), true);
    assert.equal(detectDiabetes({ enfermedades_sistemicas_texto: 'diabético' }), true);
    assert.equal(detectDiabetes({ enfermedades: 'Hipertensión' }), false);
    assert.equal(detectDiabetes(null), false);
  });
});

describe('buildProfileAssessment', () => {
  const base: ProfileAssessmentInput = {
    pi: 0,
    bop: 0,
    pd6: 0,
    furcation2: 0,
    smokingStatus: 'nichtraucher',
    diabetes: false,
  };

  test('stable when every criterion passes', () => {
    const a = buildProfileAssessment({ ...base, pi: 12.5, bop: 18 });
    assert.equal(a.stable, true);
    assert.equal(a.deviations.length, 0);
    assert.equal(a.goals.length, 0);
    assert.equal(a.risks.length, 0);
    assert.equal(a.summaryGood, true);
  });

  test('pi above 20 fails and adds the hygiene goal', () => {
    const a = buildProfileAssessment({ ...base, pi: 25 });
    assert.equal(a.stable, false);
    assert.equal(a.deviations.length, 1);
    assert.match(a.deviations[0], /25/);
    assert.match(a.deviations[0], /20%/);
    assert.equal(a.goals.some(g => /higiene bucal/.test(g)), true);
  });

  test('bop limit is 16 for smokers and 20 otherwise', () => {
    const aSmoker = buildProfileAssessment({
      ...base,
      bop: 17,
      smokingStatus: 'raucher',
    });
    assert.equal(aSmoker.stable, false);
    assert.match(aSmoker.deviations[0], /17/);
    assert.match(aSmoker.deviations[0], /16/);

    const aNon = buildProfileAssessment({ ...base, bop: 17 });
    assert.equal(aNon.stable, true);
    assert.equal(aNon.deviations.length, 0);
  });

  test('residual pockets >= 6mm fail and select the right goal variant', () => {
    const withPi = buildProfileAssessment({ ...base, pd6: 2.3, pi: 30 });
    assert.match(withPi.deviations.join(' '), /2.3/);
    const withPiGoals = withPi.goals.join(' ');
    assert.match(withPiGoals, /siempre que mejore la higiene bucal/);

    const withoutPi = buildProfileAssessment({ ...base, pd6: 2.3 });
    assert.match(withoutPi.goals.join(' '), /si la higiene bucal está bien controlada/);
  });

  test('furcation grade>=2 adds deviation and the right goal variant', () => {
    const withPi = buildProfileAssessment({ ...base, furcation2: 2, pi: 22 });
    assert.match(withPi.deviations.join(' '), /Grado 2/);
    assert.match(withPi.goals.join(' '), /con una higiene bucal mejorada/);

    const withoutPi = buildProfileAssessment({ ...base, furcation2: 1 });
    assert.match(withoutPi.goals.join(' '), /con una buena higiene bucal/);
  });

  test('bop goal mentions previous pocket reduction only when pd6 > 0', () => {
    const withPd = buildProfileAssessment({ ...base, bop: 30, pd6: 5 });
    assert.match(withPd.goals.join(' '), /después de la reducción previa de las bolsas residuales/);

    const withoutPd = buildProfileAssessment({ ...base, bop: 30 });
    assert.match(withoutPd.goals.join(' '), /con la ausencia existente de bolsas profundas/);
  });

  test('risk factors are listed and mentioned in the summary', () => {
    const a = buildProfileAssessment({
      ...base,
      smokingStatus: 'raucher',
      diabetes: true,
      bop: 25,
    });
    assert.deepEqual(a.risks, ['Tabaquismo', 'Diabetes mellitus']);
    assert.match(a.summaryRisks ?? '', /Tabaquismo, Diabetes mellitus/);
    assert.equal(a.summaryGood, false);
  });
});

describe('buildAIPrompt', () => {
  const values = {
    pi: 12.3,
    bop: 22.4,
    pd6: 1.5,
    furcation2: 2,
    smokingStatus: 'raucher' as const,
    diabetes: true,
  };

  test('contains intro, metric lines with the smoker limit and risks', () => {
    const prompt = buildAIPrompt(values, 'es');
    assert.match(prompt, /resumen comprensible y respetuoso/);
    assert.match(prompt, /Índice de Placa: 12\.3% \(Objetivo: <20%\)/);
    assert.match(prompt, /Profundidades de sondaje ≥ 6mm: 1\.5%/);
    assert.match(prompt, /Sangrado \(BOP\): 22\.4% \(Objetivo: <16%\)/);
    assert.match(prompt, /furcaciones afectadas Grado 2 o 3: 2/);
    assert.match(prompt, /Otros factores de riesgo: Tabaquismo, Diabetes mellitus/);
    assert.match(prompt, /Cree el resumen en este idioma: Español/);
    assert.match(prompt, /absténgase de dar recomendaciones médicas/);
  });

  test('non-smoker limit is 20 and zero furcations read as "ninguno"', () => {
    const prompt = buildAIPrompt(
      { ...values, bop: 10, furcation2: 0, smokingStatus: 'nichtraucher', diabetes: false },
      'es',
    );
    assert.match(prompt, /Objetivo: <20%\)/);
    assert.match(prompt, /Grado 2 o 3: ninguno/);
    assert.ok(!prompt.includes('Otros factores de riesgo'));
  });

  test('language line reflects the selected language', () => {
    assert.match(buildAIPrompt(values, 'en'), /: English/);
    assert.match(buildAIPrompt(values, 'de'), /: Deutsch/);
  });
});
