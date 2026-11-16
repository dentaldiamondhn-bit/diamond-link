import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeHistoryJsonData,
  analyzeHistorySvgData,
  extractHistoryInstanceData,
  adjustPdForComparison,
  calculatePdDifferences,
  aggregatePdDifferences,
  getHeatmapColor,
  calculateChangePercentages,
  summarizeTopWorseningSites,
  suggestMaintenanceInterval,
  computeIntervalStatus,
  formatIntervalDuration,
  formatSignedChange,
  parseHistoryDate,
  formatHistoryDate,
  formatHistoryMonthYear,
  type HistoryChartRecord,
} from '../src/lib/utils/periodontalHistory.ts';

type ChartRecord = HistoryChartRecord;

function fullMouth(): ChartRecord {
  const rec: ChartRecord = {};
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      rec[`tooth_${q}${n}`] = '1';
    }
  }
  return rec;
}

// The six probing surfaces of each arch, matching the app's data shape for
// studies restored from mediciones rows.
function probeAllSurfaces(rec: ChartRecord, pd: number, bop: '0' | '1' = '0', pi: '0' | '1' = '0') {
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      const tooth = `${q}${n}`;
      const oral = q <= 2 ? ['dp', 'p', 'mp'] : ['dl', 'l', 'ml'];
      for (const s of ['db', 'b', 'mb', ...oral]) {
        rec[`pd_${tooth}_${s}`] = pd;
        rec[`bop_${tooth}_${s}`] = bop;
        rec[`pi_${tooth}_${s}`] = pi;
      }
    }
  }
}

describe('analyzeHistoryJsonData (analyzeJsonData port)', () => {
  test('an empty chart reports zero everywhere', () => {
    const a = analyzeHistoryJsonData({});
    assert.equal(a.totalTeeth, 0);
    assert.equal(a.totalSites, 0);
    assert.equal(a.bopPercent, 0);
    assert.equal(a.piPercent, 0);
    assert.equal(a.pd4Percent, 0);
    assert.equal(a.pd5Percent, 0);
    assert.equal(a.pd6PlusPercent, 0);
    assert.equal(a.furcation2, 0);
  });

  test('full mouth of healthy 3mm pockets has zero inflammation', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.totalTeeth, 32);
    assert.equal(a.totalSites, 192);
    assert.equal(a.bopPercent, 0);
    assert.equal(a.pd4Percent, 0);
    assert.equal(a.pd6PlusPercent, 0);
    assert.equal(a.totalImplants, 0);
  });

  test('bop and pi percentages hit one decimal and count positive sites', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    // 32 teeth * 6 sites = 192 sites; 10 positive sites -> 5.2%
    const teeth = ['18', '17', '16', '36', '35'];
    const surfaces = ['db', 'b'];
    teeth.forEach(t =>
      surfaces.forEach(s => {
        rec[`bop_${t}_${s}`] = '1';
        rec[`pi_${t}_${s}`] = '1';
      }),
    );
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.bopPositiveSites, 10);
    assert.equal(a.piPositiveSites, 10);
    assert.equal(a.bopPercent, 5.2);
    assert.equal(a.piPercent, 5.2);
  });

  test('pd buckets only count on occupied teeth', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 4);
    rec['pd_18_db'] = 5;
    rec['pd_18_b'] = 6;
    rec['pd_18_mb'] = 6;
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.pd4Percent, Math.round((189 / 192) * 1000) / 10);
    assert.equal(a.pd5Percent, Math.round((1 / 192) * 1000) / 10);
    assert.equal(a.pd6PlusPercent, Math.round((2 / 192) * 1000) / 10);

    // Switch tooth 18 off: its 6 sites leave the denominator and its values
    // no longer count, implant or not.
    rec['tooth_18'] = '0';
    rec['implant_18'] = 2;
    const b = analyzeHistoryJsonData(rec);
    assert.equal(b.totalSites, 186);
    assert.equal(b.pd4Percent, 100);
    assert.equal(b.pd5Percent, 0);
    assert.equal(b.pd6PlusPercent, 0);
    assert.equal(b.totalImplants, 0);
  });

  test('values of a switched-off tooth never count (Der Zahn entscheidet)', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    rec['tooth_18'] = '0';
    rec['bop_18_db'] = '1';
    rec['pi_18_b'] = '1';
    rec['furcation_18_b'] = 2;
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.totalTeeth, 31);
    assert.equal(a.totalSites, 186);
    assert.equal(a.bopPositiveSites, 0);
    assert.equal(a.piPositiveSites, 0);
    assert.equal(a.furcation2, 0);
  });

  test('furcation2 counts grades 2 and 3 only', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    rec['furcation_16_b'] = 1;
    rec['furcation_16_mp'] = 2;
    rec['furcation_26_dp'] = 3;
    rec['furcation_36_l'] = 1;
    rec['furcation_37_b'] = 2;
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.furcation2, 3);
  });

  test('implants count when status is 1, 2 or 3', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    rec['implant_46'] = 1;
    rec['implant_36'] = 2;
    rec['implant_26'] = 3;
    rec['implant_16'] = 0;
    const a = analyzeHistoryJsonData(rec);
    assert.equal(a.totalImplants, 3);
  });
});

describe('analyzeHistorySvgData (analyzeJsonDataSVG port)', () => {
  test('integer percentages over present teeth only', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 4, '1', '1');
    rec['tooth_11'] = '0';
    const svg = analyzeHistorySvgData(rec);
    // 31 teeth x 6 = 186 sites, all BOP/PI positive and PD >= 4
    assert.equal(svg.bopPercent, 100);
    assert.equal(svg.piPercent, 100);
    assert.equal(svg.pd4Percent, 100);
  });

  test('partial positive sites round to whole percent', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 2);
    rec['bop_18_db'] = '1';
    rec['pi_18_db'] = '1';
    const svg = analyzeHistorySvgData(rec);
    assert.equal(svg.bopPercent, 1); // 1/192 = 0.52 -> "1"
    assert.equal(svg.pd4Percent, 0);
  });
});

describe('extractHistoryInstanceData (extractInstanceData port)', () => {
  test('counts the comparison-table metrics', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 4, '0');
    rec.date = '15.03.2025';
    rec['pd_18_db'] = 5;
    rec['pd_18_b'] = 6;
    rec['furcation_36_l'] = 2;
    rec['implant_46'] = 1;

    const d = extractHistoryInstanceData(rec);
    assert.equal(d.date, '15.03.2025');
    assert.equal(d.teeth, 32);
    assert.equal(d.pockets4mm, 190);
    assert.equal(d.pockets5mm, 1);
    assert.equal(d.pockets6mm, 1);
    assert.equal(d.implants, 1);
    assert.equal(d.furcation2, 1);
    // closed pocket: pd == 4 with BOP '0' on an arch-appropriate surface
    // (upper: buccal + palatal; lower: buccal + lingual). 190 four-mm sites
    // remain and all of them qualify.
    assert.equal(d.closedPockets, 190);
  });

  test('cross-arch surfaces and bleeding sites are not closed pockets', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 4, '0');
    // Non-applicable surfaces must not count even if data carries them.
    rec['pd_16_dl'] = 4;
    rec['bop_16_dl'] = '0'; // upper lingual — never probed on the upper arch
    rec['pd_36_dp'] = 4;
    rec['bop_36_dp'] = '0'; // lower palatal — never probed on the lower arch
    // A bleeding site is not a closed pocket either.
    rec['bop_46_b'] = '1';

    const d = extractHistoryInstanceData(rec);
    assert.equal(d.pockets4mm, 194);
    assert.equal(d.closedPockets, 191);
  });

  test('teeth and implants count without a presence gate (site semantics)', () => {
    const rec = fullMouth();
    probeAllSurfaces(rec, 3);
    rec['tooth_38'] = '0';
    rec['implant_38'] = 2;
    rec['implant_47'] = 3;
    const d = extractHistoryInstanceData(rec);
    assert.equal(d.teeth, 31);
    assert.equal(d.implants, 2); // countImplants does not check the tooth switch
    // pd/furcation counts also run without the gate
    assert.equal(d.pockets4mm, 0);
  });
});

describe('adjustPdForComparison (adjustPdValue port)', () => {
  test('zero becomes 1mm on pure buccal/oral surfaces', () => {
    assert.equal(adjustPdForComparison(0, 'b'), 1);
    assert.equal(adjustPdForComparison(0, 'p'), 1);
    assert.equal(adjustPdForComparison(0, 'l'), 1);
  });

  test('zero becomes 2mm on interproximal surfaces', () => {
    assert.equal(adjustPdForComparison(0, 'db'), 2);
    assert.equal(adjustPdForComparison(0, 'mb'), 2);
    assert.equal(adjustPdForComparison(0, 'dp'), 2);
    assert.equal(adjustPdForComparison(0, 'mp'), 2);
    assert.equal(adjustPdForComparison(0, 'dl'), 2);
    assert.equal(adjustPdForComparison(0, 'ml'), 2);
  });

  test('non-zero values pass through', () => {
    assert.equal(adjustPdForComparison(4, 'b'), 4);
    assert.equal(adjustPdForComparison(7, 'mb'), 7);
  });
});

describe('calculatePdDifferences (calculateDifferences port)', () => {
  test('computes after-minus-before in chronological order', () => {
    const before = fullMouth();
    probeAllSurfaces(before, 3);
    before.date = '01.01.2025';
    before['pd_18_b'] = 3;
    before['pd_18_db'] = 4;

    const after = fullMouth();
    probeAllSurfaces(after, 3);
    after.date = '01.06.2025';
    after['pd_18_b'] = 5;
    after['pd_18_db'] = 2;

    const diff = calculatePdDifferences(before, after);
    assert.equal(diff['tooth_18'].before, 1);
    assert.equal(diff['tooth_18'].after, 1);
    assert.equal(diff['tooth_18'].pdDifferences['b'], 2);
    assert.equal(diff['tooth_18'].pdDifferences['db'], -2);
  });

  test('swaps studies so data1 is always the older one', () => {
    const older = fullMouth();
    probeAllSurfaces(older, 3);
    older.date = '2025-01-01';
    older['pd_18_b'] = 2;

    const newer = fullMouth();
    probeAllSurfaces(newer, 3);
    newer.date = '2025-06-01';
    newer['pd_18_b'] = 4;

    const diff = calculatePdDifferences(newer, older); // reversed on purpose
    assert.equal(diff['tooth_18'].pdDifferences['b'], 2);
  });

  test('sites missing in one study are ignored', () => {
    const older = fullMouth();
    probeAllSurfaces(older, 3);
    older.date = '2025-01-01';
    delete older['tooth_36'];
    delete older['pd_36_b']; // site without key in one study: skipped

    const newer = fullMouth();
    probeAllSurfaces(newer, 3);
    newer.date = '2025-06-01';

    const diff = calculatePdDifferences(older, newer);
    assert.equal(diff['tooth_36'].before, 0);
    assert.equal(diff['tooth_36'].after, 1);
    assert.equal(diff['tooth_36'].pdDifferences['b'], undefined);
  });

  test('zero depths use the standard-paper reference values', () => {
    const older = fullMouth();
    probeAllSurfaces(older, 0);
    older.date = '2025-01-01';

    const newer = fullMouth();
    probeAllSurfaces(newer, 3);
    newer.date = '2025-06-01';

    const diff = calculatePdDifferences(older, newer);
    assert.equal(diff['tooth_18'].pdDifferences['b'], 2); // 3 - 1
    assert.equal(diff['tooth_18'].pdDifferences['db'], 1); // 3 - 2
  });
});

describe('aggregatePdDifferences (aggregateDifferences port)', () => {
  test('upper jaw sums the interproximal pair values', () => {
    const base: Record<string, any> = { before: 1, after: 1 };
    const diff = {
      tooth_18: {
        ...base,
        pdDifferences: { db: 1, dp: 2, dl: undefined, mb: 3, mp: undefined, ml: 0, b: 1, p: -1, l: 0 },
      },
    };
    const agg = aggregatePdDifferences(diff as any);
    assert.equal(agg['tooth_18'].d, 3);
    assert.equal(agg['tooth_18'].m, 3);
    assert.equal(agg['tooth_18'].b, 1);
    assert.equal(agg['tooth_18'].p, -1);
    assert.equal(agg['tooth_18'].l, 0);
  });

  test('lower jaw averages the interproximal pair values', () => {
    const diff = {
      tooth_36: {
        before: 1,
        after: 1,
        pdDifferences: { db: 2, dl: 4, mb: 6, ml: 8, b: 0, p: 0, l: 0 },
      },
    };
    const agg = aggregatePdDifferences(diff as any);
    assert.equal(agg['tooth_36'].d, 3);
    assert.equal(agg['tooth_36'].m, 7);
  });
});

describe('getHeatmapColor (d3 scaleThreshold port)', () => {
  test('matches the threshold bands', () => {
    assert.equal(getHeatmapColor(-11), '#00FF00');
    assert.equal(getHeatmapColor(-10), '#00E700');
    assert.equal(getHeatmapColor(-3), '#33FF00');
    assert.equal(getHeatmapColor(-1.75), '#66FF00');
    assert.equal(getHeatmapColor(-1.2), '#99FF00');
    assert.equal(getHeatmapColor(-0.75), '#B2FF00');
    assert.equal(getHeatmapColor(0), '#F7F700');
    assert.equal(getHeatmapColor(-0.2), '#F7F700');
    assert.equal(getHeatmapColor(0.5), 'orange');
    assert.equal(getHeatmapColor(1.5), '#DF48A1');
    assert.equal(getHeatmapColor(3), '#B9207A');
    assert.equal(getHeatmapColor(5), undefined);
    assert.equal(getHeatmapColor(undefined), undefined);
  });
});

describe('calculateChangePercentages (calculatePercentages port)', () => {
  test('splits sites into improvement / no change / worsening', () => {
    const diff = {
      tooth_18: { before: 1, after: 1, pdDifferences: { db: 2, b: -1, mb: 0 } },
      tooth_17: { before: 1, after: 1, pdDifferences: { db: -2, b: 3, mb: undefined } },
    };
    // values: 2, -1, 0, -2, 3 -> 2 worse, 2 better, 1 no change; 5 total
    const p = calculateChangePercentages(diff as any);
    assert.equal(p.worseningPercentage, 40);
    assert.equal(p.improvementPercentage, 40);
    assert.equal(p.nochangePercentage, 20);
  });

  test('percentages are adjusted to sum up to 100', () => {
    const diff = {
      tooth_18: { before: 1, after: 1, pdDifferences: { db: 1, b: 0, mb: -1 } },
    };
    // 33.33 / 33.33 / 33.34
    const p = calculateChangePercentages(diff as any);
    assert.equal(
      p.improvementPercentage + p.nochangePercentage + p.worseningPercentage,
      100,
    );
  });

  test('empty comparison reports zero instead of NaN', () => {
    const p = calculateChangePercentages({});
    assert.deepEqual(p, {
      improvementPercentage: 0,
      nochangePercentage: 0,
      worseningPercentage: 0,
    });
  });

  test('only sites of teeth present "after" count', () => {
    const diff = {
      tooth_18: { before: 1, after: 0, pdDifferences: { db: 5 } }, // extracted tooth: ignored
      tooth_17: { before: 1, after: 1, pdDifferences: { db: -1 } },
    };
    const p = calculateChangePercentages(diff as any);
    assert.equal(p.improvementPercentage, 100);
    assert.equal(p.worseningPercentage, 0);
  });
});

describe('summarizeTopWorseningSites port', () => {
  test('ranks only worsening sites, newest value breaks ties, tops at 16', () => {
    const before = fullMouth();
    probeAllSurfaces(before, 3);
    before.date = '2025-01-01';

    const after = fullMouth();
    probeAllSurfaces(after, 3);
    after.date = '2025-06-01';

    after['pd_18_db'] = 6; // +2 (interproximal: was 4 adjusted? both present 3->6 = +3) 

    // before 3 -> after 6 = +3 at 18 db
    // tie test: two sites both +2, the deeper after wins the higher rank
    after['pd_17_b'] = 5; // +2, after 5
    after['pd_17_mb'] = 5; // +2, after 5
    after['pd_16_b'] = 5; // +2, after 5
    after['pd_15_b'] = 5; // +2 after, same...
    after['pd_14_b'] = 5;

    const ranked = summarizeTopWorseningSites(before, after);
    assert.equal(ranked[0].site, '18 db');
    assert.equal(ranked[0].change, 3);
    assert.ok(ranked.length <= 16);
    assert.equal(ranked[0].rank, 1);

    // improving sites never appear
    assert.ok(ranked.every(entry => entry.change > 0));
  });

  test('an extracted tooth does not contribute sites', () => {
    const before = fullMouth();
    probeAllSurfaces(before, 3);
    before.date = '2025-01-01';
    const after = fullMouth();
    probeAllSurfaces(after, 3);
    after.date = '2025-06-01';
    // Realistic extraction: after losing tooth 18 its measures disappear
    // (the app only persists mediciones of present teeth).
    after['tooth_18'] = '0';
    ['db', 'b', 'mb', 'dp', 'p', 'mp'].forEach(s => {
      delete after[`pd_18_${s}`];
    });
    after['pd_17_db'] = 6; // control: a real worsening site

    const ranked = summarizeTopWorseningSites(before, after);
    assert.ok(ranked.length >= 1);
    assert.equal(ranked[0].site, '17 db');
    assert.ok(ranked.every(entry => !entry.site.startsWith('18 ')));
  });
});

describe('suggestMaintenanceInterval port (SVG interval ladder)', () => {
  test('deep pockets force the 3-month minimum', () => {
    assert.equal(suggestMaintenanceInterval({ pd4: 40, pd5: 30, pd6: 20 }), 3);
  });

  test('clean charts earn the 12-month maximum', () => {
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 0, pd6: 0 }), 12);
  });

  test('ladder boundaries match last-condition-wins semantics', () => {
    // pd4 ladder: <=2 -> 12, <=5 -> 9, <=10 -> 6, <=20 -> 4, else 3
    assert.equal(suggestMaintenanceInterval({ pd4: 20, pd5: 0, pd6: 0 }), 4);
    assert.equal(suggestMaintenanceInterval({ pd4: 10, pd5: 0, pd6: 0 }), 6);
    assert.equal(suggestMaintenanceInterval({ pd4: 5, pd5: 0, pd6: 0 }), 9);
    assert.equal(suggestMaintenanceInterval({ pd4: 2, pd5: 0, pd6: 0 }), 12);
    // pd5 ladder: <=2 -> 12, <=4 -> 9, <=6 -> 6, <=10 -> 4
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 2, pd6: 0 }), 12);
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 5, pd6: 0 }), 6);
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 8, pd6: 0 }), 4);
    // pd6 ladder: ==0 -> 12, <=1 -> 9, <=2 -> 6, <=3 -> 4
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 0, pd6: 1 }), 9);
    assert.equal(suggestMaintenanceInterval({ pd4: 0, pd5: 0, pd6: 2 }), 6);
  });

  test('the minimum of the three ladders wins', () => {
    assert.equal(suggestMaintenanceInterval({ pd4: 3, pd5: 8, pd6: 0 }), 4);
  });
});

describe('computeIntervalStatus port', () => {
  test('within 30 days of the expectation is A TIEMPO', () => {
    const s = computeIntervalStatus(6, 6 * 30 + 25);
    assert.equal(s.status, 'timely');
    assert.equal(s.label, 'A TIEMPO');
    assert.equal(s.color, 'green');
    assert.equal(s.expectedDays, 180);
  });

  test('more than 30 days early', () => {
    const s = computeIntervalStatus(6, 100);
    assert.equal(s.status, 'early');
    assert.equal(s.label, 'TEMPRANO');
    assert.equal(s.color, 'green');
    assert.equal(s.diffDays, -80);
  });

  test('more than 30 days late', () => {
    const s = computeIntervalStatus(6, 6 * 30 + 31);
    assert.equal(s.status, 'late');
    assert.equal(s.label, 'TARDE');
    assert.equal(s.color, 'red');
  });
});

describe('formatIntervalDuration (calculateDateDifference port)', () => {
  test('months are floor(days / 30) with the day count appended', () => {
    assert.equal(formatIntervalDuration(180), '6 Mes(es) (180 Días)');
    assert.equal(formatIntervalDuration(1), '0 Mes(es) (1 Día)');
    assert.equal(formatIntervalDuration(45), '1 Mes(es) (45 Días)');
  });
});

describe('formatSignedChange (calculateChange port)', () => {
  test('positive changes get a plus sign', () => {
    assert.equal(formatSignedChange(2, 5), '+3');
    assert.equal(formatSignedChange(5, 2), '-3');
    assert.equal(formatSignedChange(4, 4), '0');
    assert.equal(formatSignedChange(null, 4), 'NA');
  });
});

describe('date helpers', () => {
  test('parseHistoryDate handles ISO and dotted dates', () => {
    assert.equal(parseHistoryDate('2025-03-15')?.getUTCFullYear(), 2025);
    assert.equal(parseHistoryDate('15.03.2025')?.getUTCMonth(), 2);
    assert.equal(parseHistoryDate('15.03.2025')?.getUTCDate(), 15);
    assert.equal(parseHistoryDate(''), null);
    assert.equal(parseHistoryDate(null), null);
  });

  test('formatHistoryDate renders DD.MM.YYYY', () => {
    assert.equal(formatHistoryDate('2025-03-15'), '15.03.2025');
    assert.equal(formatHistoryDate('15.03.2025'), '15.03.2025');
    assert.equal(formatHistoryDate(''), '');
  });

  test('formatHistoryMonthYear renders Spanish month abbreviations', () => {
    assert.equal(formatHistoryMonthYear('2025-03-15'), 'Mar 2025');
    assert.equal(formatHistoryMonthYear('15.01.2025'), 'Ene 2025');
    assert.equal(formatHistoryMonthYear('10.10.2024'), 'Oct 2024');
    assert.equal(formatHistoryMonthYear(''), '');
  });
});
