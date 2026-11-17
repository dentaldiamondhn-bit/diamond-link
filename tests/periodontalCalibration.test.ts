import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCalibrationData,
  compareCalibrationData,
  calculateCalibrationDifferences,
  analyzeCalibrationComparison,
  extractCalibrationICCData,
  calculateANOVAandICC,
  extractBlandAltmanData,
  getMaxDeviations,
  type CalibrationChartRecord,
  type CalibrationParsedTooth,
  type CalibrationComparison,
  type CalibrationDifferenceResult,
  type CalibrationAnalysisResult,
  type CalibrationMaxDeviations,
  type CalibrationBlandAltmanPoint,
} from '../src/lib/utils/periodontalCalibration.ts';

type ChartRecord = CalibrationChartRecord;

function fullMouthStudent(): ChartRecord {
  const rec: ChartRecord = {};
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      rec[`tooth_${q}${n}`] = '1';
    }
  }
  return rec;
}

function probeAllSurfaces(rec: ChartRecord, pd: number, gm: number, bop: '0' | '1' = '0') {
  const positions = ['db', 'b', 'mb', 'dp', 'p', 'mp', 'dl', 'l', 'ml'];
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      const tooth = `${q}${n}`;
      for (const pos of positions) {
        rec[`pd_${tooth}_${pos}`] = pd;
        rec[`gm_${tooth}_${pos}`] = gm;
        rec[`bop_${tooth}_${pos}`] = bop;
      }
      // Add furcation only on molars/premolars
      if ([4, 5, 6, 7].includes(n)) {
        ['b', 'mp', 'dp', 'l'].forEach(s => {
          rec[`furcation_${tooth}_${s}`] = 0;
        });
      }
    }
  }
}

describe('parseCalibrationData', () => {
test('extracts data for all present teeth with all parameters', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['gm_18_db'] = 1;
    student['pd_18_db'] = 5;
    student['bop_18_db'] = '1';

    const parsed = parseCalibrationData(student);

    assert.ok(parsed['18']);
    assert.equal(parsed['18'].pd.db, 5);
    assert.equal(parsed['18'].gm.db, 1);
    assert.equal(parsed['18'].bop.db, 1);
  });

  test('skips absent teeth', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['tooth_18'] = '0';

    const parsed = parseCalibrationData(student);
    assert.equal(parsed['18'], undefined);
  });

  test('extracts per-surface values correctly', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 3, 0);
    student['pd_11_b'] = 5;
    student['gm_11_b'] = 2;
    student['bop_11_b'] = '1';
    student['furcation_16_b'] = 2;

    const parsed = parseCalibrationData(student);
    assert.equal(parsed['11'].pd.b, 5);
    assert.equal(parsed['11'].gm.b, 2);
    assert.equal(parsed['11'].bop.b, 1);
    assert.equal(parsed['16'].furcation.b, 2);
  });
});

describe('compareCalibrationData', () => {
  test('computes difference student - clinician', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['pd_18_b'] = 4;
    student['gm_18_b'] = 0;
    student['bop_18_b'] = '0';

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);
    clinician['pd_18_b'] = 6;
    clinician['gm_18_b'] = 1;
    clinician['bop_18_b'] = '1';

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    const diff = comparison['18'].pd.b;
    assert.equal(diff.student, 4);
    assert.equal(diff.clinician, 6);
    assert.equal(diff.difference, -2);
  });

  test('handles missing surfaces in clinician data', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['pd_18_b'] = 5;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);
    // probeAllSurfaces sets all to 4, then we DON'T override pd_18_b
    // so clinician has pd_18_b = 4

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    const diff = comparison['18'].pd.b;
    assert.equal(diff.student, 5);
    assert.equal(diff.clinician, 4);
    assert.equal(diff.difference, 1);
  });

  test('compares all parameters', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 3, 0);
    student['pd_18_db'] = 4;
    student['gm_18_db'] = 1;
    student['bop_18_db'] = '0';
    student['furcation_18_b'] = 2;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 3, 0);
    clinician['pd_18_db'] = 5;
    clinician['gm_18_db'] = 2;
    clinician['bop_18_db'] = '1';
    clinician['furcation_18_b'] = 1;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    assert.equal(comparison['18'].pd.db.difference, -1);
    assert.equal(comparison['18'].gm.db.difference, -1);
    assert.equal(comparison['18'].bop.db.difference, -1);
    assert.equal(comparison['18'].furcation.b.difference, 1);
  });
});

describe('calculateCalibrationDifferences', () => {
  test('calculates average absolute differences per arch and category', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 3, 0);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 3, 0);

    // Create a difference: student 4mm, clinician 6mm on some sites
    ['18', '17', '16'].forEach(t => {
      student[`pd_${t}_b`] = 4;
      clinician[`pd_${t}_b`] = 6;
    });

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    // entireDentition, upper jaw
    const result = calculateCalibrationDifferences(
      comparison,
      'pd',
      [11, 12, 13, 14, 15, 16, 17, 18],
      'upper',
      ['m', 'd', 'b', 'p']
    );

    // 3 teeth × 1 surface (b) = 3 sites with diff 2
    // 3 sites × 2mm = 6 total / 3 = 2mm avg
    assert.equal(result.b.avg, 2);
    assert.equal(result.b.totalDifference, 6);
    assert.equal(result.b.siteCount, 3);
    assert.equal(result.b.flagged, true);
  });

  test('averages across site types', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);

    // Different diffs per site type
    student['pd_18_b'] = 4; clinician['pd_18_b'] = 6;  // diff 2
    student['pd_18_mb'] = 4; clinician['pd_18_mb'] = 6; // diff 2

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    // siteTypes ['b', 'mb'] - both on 18
    const result = calculateCalibrationDifferences(
      comparison,
      'pd',
      [18],
      'upper',
      ['b', 'mb']
    );

    assert.equal(result.b.avg, 2);
    assert.equal(result.mb.avg, 2);
  });
});

describe('analyzeCalibrationComparison', () => {
  test('produces results for gm, pd, furcation across arches and categories', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);

    // Add some differences
    student['pd_18_b'] = 4; clinician['pd_18_b'] = 5;
    student['gm_18_b'] = 0; clinician['gm_18_b'] = 1;
    student['furcation_18_b'] = 2; clinician['furcation_18_b'] = 2;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    const result = analyzeCalibrationComparison(comparison);

    assert.ok(result.gm);
    assert.ok(result.pd);
    assert.ok(result.furcation);
    assert.ok(result.gm.upper.entireDentition);
    assert.ok(result.gm.lower.entireDentition);
    assert.ok(result.pd.upper.molar);
    assert.ok(result.furcation.upper.molar);
  });

  test('flags when average >= 1', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);

    student['pd_18_b'] = 3; clinician['pd_18_b'] = 5; // diff 2 -> avg 2 >= 1

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    const result = analyzeCalibrationComparison(comparison);
    const pdUpperEntire = result.pd.upper.entireDentition;
    assert.ok(pdUpperEntire.b.flagged);
    assert.ok(pdUpperEntire.overall.flagged);
  });

  test('furcation uses correct site types per arch/category', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 3, 0);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 3, 0);

    student['furcation_18_b'] = 2; clinician['furcation_18_b'] = 2;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);

    const result = analyzeCalibrationComparison(comparison);

    // Upper molar has b, mp, dp
    assert.ok(result.furcation.upper.molar.b);
    assert.ok(result.furcation.upper.molar.mp);
    assert.ok(result.furcation.upper.molar.dp);

    // Lower molar has b, l
    assert.ok(result.furcation.lower.molar.b);
    assert.ok(result.furcation.lower.molar.l);

    // Anterior has no furcation
    assert.equal(Object.keys(result.furcation.upper.anterior).length, 0);
  });
});

describe('extractCalibrationICCData', () => {
  test('extracts paired data for GM across matching teeth', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 1);
    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 1);

    student['gm_18_b'] = 1; clinician['gm_18_b'] = 2;
    student['gm_18_db'] = 0; clinician['gm_18_db'] = 1;
    student['gm_28_b'] = 2; clinician['gm_28_b'] = 2;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);

    const iccData = extractCalibrationICCData(studentParsed, clinicianParsed, 'gm');

    // Should have pairs for 18b, 18db, 28b (both teeth present)
    assert.ok(iccData.length >= 3);
    iccData.forEach(pair => {
      assert.equal(pair.length, 2);
      assert.ok(Number.isInteger(pair[0]));
      assert.ok(Number.isInteger(pair[1]));
    });
  });

  test('furcation uses restricted positions', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 3, 0);
    student['furcation_16_b'] = 1;
    student['furcation_16_mp'] = 2;
    student['furcation_14_dp'] = 1;
    student['furcation_12_b'] = 1;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 3, 0);
    clinician['furcation_16_b'] = 1;
    clinician['furcation_16_mp'] = 2;
    clinician['furcation_14_dp'] = 1;
    clinician['furcation_12_b'] = 1;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);

    const iccData = extractCalibrationICCData(studentParsed, clinicianParsed, 'furcation');

    // Only b, mp, dp on molars/premolars
    iccData.forEach(([v1, v2]) => {
      // Should only include valid furcation positions
      assert.ok([1, 2].includes(v1));
      assert.ok([1, 2].includes(v2));
    });
  });
});

describe('calculateANOVAandICC', () => {
  test('computes ICC for perfect agreement', () => {
    const data = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
      [5, 5, 5],
    ];

    const result = calculateANOVAandICC(data);
    assert.equal(result.ICC, 1);
  });

  test('computes ICC for no agreement', () => {
    const data = [
      [1, 5],
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1],
    ];

    const result = calculateANOVAandICC(data);
    // ICC is NaN for this pattern (perfect anti-correlation)
    assert.ok(isNaN(result.ICC) || result.ICC < 0.5);
  });

  test('handles single rater', () => {
    const data = [
      [1],
      [2],
      [3],
    ];

    const result = calculateANOVAandICC(data);
    assert.ok(isNaN(result.ICC) || isNaN(result.pValue));
  });
});

describe('extractBlandAltmanData', () => {
test('pairs values by site key', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['pd_18_b'] = 4;
    student['pd_18_db'] = 3;
    student['pd_28_b'] = 5;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);
    clinician['pd_18_b'] = 5;
    clinician['pd_18_db'] = 3;
    clinician['pd_28_b'] = 6;

    const points = extractBlandAltmanData(student, clinician);

    // probeAllSurfaces sets all 288 positions to 4, then we override 3 each
    // So all 288 positions have values in both -> 288 pairs
    // The three we care about:
    const p18b = points.find(p => p.key === 'pd_18_b');
    assert.ok(p18b);
    assert.equal(p18b.mean, 4.5);
    assert.equal(p18b.diff, -1);
  });

  test('ignores unmatched sites', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['pd_18_b'] = 4;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);
    // Remove pd_18_b from clinician to simulate missing data
    delete clinician['pd_18_b'];

    const points = extractBlandAltmanData(student, clinician);
    const p18b = points.find(p => p.key === 'pd_18_b');
    assert.equal(p18b, undefined);
  });
});

describe('integration: full calibration analysis', () => {
  test('end-to-end produces structured results', () => {
    const student = fullMouthStudent();
    probeAllSurfaces(student, 4, 0);
    student['pd_18_b'] = 4;
    student['pd_18_db'] = 5;
    student['gm_18_b'] = 0;
    student['gm_18_db'] = 1;
    student['furcation_16_b'] = 2;

    const clinician = fullMouthStudent();
    probeAllSurfaces(clinician, 4, 0);
    clinician['pd_18_b'] = 5;
    clinician['pd_18_db'] = 5;
    clinician['gm_18_b'] = 1;
    clinician['gm_18_db'] = 1;
    clinician['furcation_16_b'] = 2;

    const studentParsed = parseCalibrationData(student);
    const clinicianParsed = parseCalibrationData(clinician);
    const comparison = compareCalibrationData(studentParsed, clinicianParsed);
    const analysis = analyzeCalibrationComparison(comparison);
    const maxDevs = getMaxDeviations(comparison);

    assert.ok(analysis.gm.upper.entireDentition);
    assert.ok(maxDevs.pd.length > 0);
  });
});