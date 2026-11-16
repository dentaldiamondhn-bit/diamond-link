import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAgeAt,
  suggestStageFromMaxPd,
  suggestStageFromMaxInterproximalAl,
  suggestExtentDistribution,
  suggestBlAgeGrade,
  suggestSmokingModifier,
  resolveClassification,
  buildDiagnosisText,
  getGroupPrefix,
} from '../src/lib/utils/periodontalClassification.ts';

type ChartRecord = Record<string, any>;

function site(tooth: number, surface: string, pd: number, gm = 0): ChartRecord {
  return {
    [`tooth_${tooth}`]: '1',
    [`pd_${tooth}_${surface}`]: pd,
    [`gm_${tooth}_${surface}`]: gm,
  };
}

function merge(...parts: ChartRecord[]): ChartRecord {
  return Object.assign({}, ...parts);
}

describe('calculateAgeAt', () => {
  test('returns full years between DOB and reference date', () => {
    assert.equal(calculateAgeAt('1990-06-15', '2026-06-15'), 36);
    assert.equal(calculateAgeAt('1990-06-15', '2026-06-14'), 35);
  });

  test('handles the birthday not yet reached in the reference year', () => {
    assert.equal(calculateAgeAt('2000-12-01', '2026-01-31'), 25);
  });

  test('returns null for missing or invalid inputs', () => {
    assert.equal(calculateAgeAt('', '2026-01-01'), null);
    assert.equal(calculateAgeAt('1990-06-15', ''), null);
    assert.equal(calculateAgeAt('not-a-date', '2026-01-01'), null);
    assert.equal(calculateAgeAt('1990-06-15', 'not-a-date'), null);
  });
});

describe('getGroupPrefix', () => {
  test('groups cells by their row', () => {
    assert.equal(getGroupPrefix('interproximal-al-stage-1'), 'interproximal-al');
    assert.equal(getGroupPrefix('complexity-stage-3'), 'complexity');
    assert.equal(getGroupPrefix('radiographic-bl-stage-4'), 'radiographic-bl');
    assert.equal(getGroupPrefix('extent-distribution-2'), 'extent-distribution');
    assert.equal(getGroupPrefix('bl-age-grade-b'), 'bl-age');
    assert.equal(getGroupPrefix('smoking-grade-c'), 'smoking');
  });
});

describe('suggestStageFromMaxPd', () => {
  test('max PD >= 6 suggests complexity stage 3', () => {
    const data = merge(site(16, 'mb', 7, 0), site(26, 'b', 3, 0));
    const suggestion = suggestStageFromMaxPd(data);
    assert.equal(suggestion?.cellId, 'complexity-stage-3');
    assert.match(suggestion?.text ?? '', /7 mm/);
    assert.match(suggestion?.text ?? '', /16/);
  });

  test('PD 4-5 suggests complexity stage 2', () => {
    const data = site(36, 'dp', 5, 0);
    assert.equal(suggestStageFromMaxPd(data)?.cellId, 'complexity-stage-2');
    const data2 = site(36, 'dp', 4, 0);
    assert.equal(suggestStageFromMaxPd(data2)?.cellId, 'complexity-stage-2');
  });

  test('PD 1-3 suggests complexity stage 1', () => {
    assert.equal(suggestStageFromMaxPd(site(11, 'b', 3, 0))?.cellId, 'complexity-stage-1');
    assert.equal(suggestStageFromMaxPd(site(11, 'b', 1, 0))?.cellId, 'complexity-stage-1');
  });

  test('PD 0 or absent yields no suggestion', () => {
    assert.equal(suggestStageFromMaxPd(site(11, 'b', 0, 0)), null);
    assert.equal(suggestStageFromMaxPd({}), null);
  });

  test('ignores missing teeth even when values remain', () => {
    const data = merge(site(16, 'mb', 9, 0), site(26, 'b', 4, 0), { tooth_16: '0' });
    const suggestion = suggestStageFromMaxPd(data);
    assert.equal(suggestion?.cellId, 'complexity-stage-2');
    assert.match(suggestion?.text ?? '', /26/);
  });
});

describe('suggestStageFromMaxInterproximalAl', () => {
  test('AL >= 5 suggests severity stage 3', () => {
    const data = site(26, 'mb', 7, -2);
    const suggestion = suggestStageFromMaxInterproximalAl(data);
    assert.equal(suggestion?.cellId, 'interproximal-al-stage-3');
    assert.match(suggestion?.text ?? '', /9 mm/);
  });

  test('AL 3-4 suggests severity stage 2', () => {
    assert.equal(suggestStageFromMaxInterproximalAl(site(26, 'mb', 4, 0))?.cellId, 'interproximal-al-stage-2');
    assert.equal(suggestStageFromMaxInterproximalAl(site(26, 'mb', 3, 0))?.cellId, 'interproximal-al-stage-2');
  });

  test('AL 1-2 suggests severity stage 1', () => {
    assert.equal(suggestStageFromMaxInterproximalAl(site(26, 'mb', 2, 0))?.cellId, 'interproximal-al-stage-1');
  });

  test('buccal-only sites are excluded from the interproximal rule', () => {
    const data = merge(site(26, 'b', 8, 0), site(26, 'mb', 2, 0));
    assert.equal(suggestStageFromMaxInterproximalAl(data)?.cellId, 'interproximal-al-stage-1');
  });

  test('respects inverted GM mode', () => {
    const data = merge(site(26, 'mb', 5, 2), { isGmInverted: true });
    assert.equal(suggestStageFromMaxInterproximalAl(data)?.cellId, 'interproximal-al-stage-3');
  });

  test('AL 0 yields no suggestion', () => {
    assert.equal(suggestStageFromMaxInterproximalAl(site(26, 'mb', 0, 0)), null);
  });
});

function present(tooth: number): ChartRecord {
  return { [`tooth_${tooth}`]: '1' };
}

describe('suggestExtentDistribution', () => {
  test('under 30 percent affected is localized', () => {
    const parts: ChartRecord[] = [];
    for (const tooth of [16, 26, 36, 46, 11, 21, 31, 41, 12, 22, 32, 42, 13, 23, 33, 43, 14, 24, 34, 44]) {
      parts.push(present(tooth));
    }
    parts.push(site(16, 'mb', 5, 0), site(26, 'mb', 5, 0), site(11, 'mb', 5, 0), site(12, 'mb', 3, 0), site(24, 'mb', 3, 0));
    const suggestion = suggestExtentDistribution(merge(...parts));
    assert.equal(suggestion?.cellId, 'extent-distribution-1');
    assert.match(suggestion?.text ?? '', /25\.0%/);
  });

  test('30 percent or more affected is generalized', () => {
    const parts: ChartRecord[] = [];
    for (const tooth of [16, 26, 36, 46, 11, 21, 31, 41, 12, 22]) {
      parts.push(site(tooth, 'mb', 5, 0));
    }
    const suggestion = suggestExtentDistribution(merge(...parts));
    assert.equal(suggestion?.cellId, 'extent-distribution-2');
    assert.match(suggestion?.text ?? '', /generalizado/);
  });

  test('molar-incisor pattern wins when its average AL exceeds the rest by more than 2 mm', () => {
    const data = merge(
      site(16, 'mb', 6, 0),
      site(11, 'mb', 5, 0),
      site(25, 'mb', 3, 0),
    );
    const suggestion = suggestExtentDistribution(data);
    assert.equal(suggestion?.cellId, 'extent-distribution-3');
    assert.match(suggestion?.text ?? '', /molares\/incisivos/i);
  });

  test('pattern requires at least one molar and one incisor affected', () => {
    const data = merge(
      site(16, 'mb', 6, 0),
      site(25, 'mb', 3, 0),
    );
    const suggestion = suggestExtentDistribution(data);
    assert.notEqual(suggestion?.cellId, 'extent-distribution-3');
  });

  test('no affected teeth yields no suggestion', () => {
    assert.equal(suggestExtentDistribution({}), null);
    assert.equal(suggestExtentDistribution(site(16, 'mb', 2, 0)), null);
  });
});

describe('suggestBlAgeGrade', () => {
  test('ratio over 1.00 suggests grade C', () => {
    const data = site(26, 'mb', 6, 0);
    const suggestion = suggestBlAgeGrade(data, 35);
    assert.equal(suggestion?.cellId, 'bl-age-grade-c');
    assert.match(suggestion?.text ?? '', /46\.5/);
    assert.match(suggestion?.text ?? '', /35/);
  });

  test('ratio between 0.25 and 1.00 suggests grade B', () => {
    const data = site(26, 'mb', 6, 0);
    assert.equal(suggestBlAgeGrade(data, 60)?.cellId, 'bl-age-grade-b');
  });

  test('ratio under 0.25 suggests grade A', () => {
    const data = site(26, 'mb', 1, 0);
    assert.equal(suggestBlAgeGrade(data, 60)?.cellId, 'bl-age-grade-a');
  });

  test('returns null without age or for unknown root lengths', () => {
    assert.equal(suggestBlAgeGrade(site(26, 'mb', 6, 0), null), null);
    assert.equal(suggestBlAgeGrade(site(26, 'mb', 6, 0), 0), null);
  });
});

describe('suggestSmokingModifier', () => {
  test('non-smoker suggests grade A cell', () => {
    assert.equal(suggestSmokingModifier({ fuma: 'no' })?.cellId, 'smoking-grade-a');
    assert.equal(suggestSmokingModifier({ fuma: 'si', fuma_cantidad: 3 })?.cellId, 'smoking-grade-b');
    assert.equal(suggestSmokingModifier({ fuma: 'si', fuma_cantidad: 10 })?.cellId, 'smoking-grade-c');
    assert.equal(suggestSmokingModifier({ fuma: 'si' }), null);
    assert.equal(suggestSmokingModifier(null), null);
  });
});

describe('resolveClassification', () => {
  test('highest stage wins across all rows', () => {
    const resolved = resolveClassification({
      complexity: 'complexity-stage-2',
      'interproximal-al': 'interproximal-al-stage-3',
      'tooth-loss': 'tooth-loss-stage-2',
    });
    assert.equal(resolved.stage, 3);
  });

  test('highest grade wins including modifiers', () => {
    const resolved = resolveClassification({
      'bl-age': 'bl-age-grade-b',
      smoking: 'smoking-grade-c',
    });
    assert.equal(resolved.grade, 'C');
  });

  test('smoking and diabetes modifiers expose their details', () => {
    const resolved = resolveClassification({
      smoking: 'smoking-grade-c',
      diabetes: 'diabetes-grade-b',
    });
    assert.equal(resolved.smokingModifier, '≥ 10 cig/día');
    assert.equal(resolved.diabetesModifier, 'HbA1c < 7.0 %');
  });

  test('non-smoker and non-diabetic selections expose no modifier', () => {
    const resolved = resolveClassification({
      smoking: 'smoking-grade-a',
      diabetes: 'diabetes-grade-a',
    });
    assert.equal(resolved.smokingModifier, null);
    assert.equal(resolved.diabetesModifier, null);
  });

  test('extent maps to its distribution word', () => {
    assert.equal(resolveClassification({ 'extent-distribution': 'extent-distribution-1' }).extent, 'localizada');
    assert.equal(resolveClassification({ 'extent-distribution': 'extent-distribution-2' }).extent, 'generalizada');
    assert.equal(resolveClassification({ 'extent-distribution': 'extent-distribution-3' }).extent, 'molar-incisivo');
    assert.equal(resolveClassification({}).extent, null);
  });

  test('empty selection resolves to nothing', () => {
    const resolved = resolveClassification({});
    assert.equal(resolved.stage, null);
    assert.equal(resolved.grade, null);
  });
});

describe('buildDiagnosisText', () => {
  test('requires at least one stage', () => {
    assert.equal(buildDiagnosisText(resolveClassification({ smoking: 'smoking-grade-c' })), null);
  });

  test('stage alone', () => {
    assert.equal(
      buildDiagnosisText(resolveClassification({ complexity: 'complexity-stage-3' })),
      'Periodontitis, Estadio III',
    );
  });

  test('full diagnosis with extent, grade and modifiers', () => {
    const resolved = resolveClassification({
      'interproximal-al': 'interproximal-al-stage-3',
      'extent-distribution': 'extent-distribution-2',
      'bl-age': 'bl-age-grade-b',
      smoking: 'smoking-grade-b',
      diabetes: 'diabetes-grade-b',
    });
    assert.equal(
      buildDiagnosisText(resolved),
      'Periodontitis generalizada, Estadio III, Grado B, asociada a Tabaquismo (< 10 cig/día) y Diabetes (HbA1c < 7.0 %)',
    );
  });

  test('grade modifiers raise the final grade to C', () => {
    const resolved = resolveClassification({
      'interproximal-al': 'interproximal-al-stage-3',
      'bl-age': 'bl-age-grade-b',
      smoking: 'smoking-grade-c',
    });
    assert.equal(
      buildDiagnosisText(resolved),
      'Periodontitis, Estadio III, Grado C, asociada a Tabaquismo (≥ 10 cig/día)',
    );
  });

  test('molar-incisor pattern phrasing', () => {
    const resolved = resolveClassification({
      'interproximal-al': 'interproximal-al-stage-2',
      'extent-distribution': 'extent-distribution-3',
    });
    assert.equal(
      buildDiagnosisText(resolved),
      'Periodontitis con patrón de molares/incisivos, Estadio II',
    );
  });
});
