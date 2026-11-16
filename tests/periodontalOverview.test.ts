import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOverviewStats,
  getOverviewSiteFills,
  buildOverviewPdTexts,
  getOverviewFurcationMarkers,
  getOverviewImplantMarkers,
  formatOverviewDate,
} from '../src/lib/utils/periodontalOverview.ts';

type ChartRecord = Record<string, any>;

// Build a record with all 32 teeth present (like the store's initial data).
function fullMouth(): ChartRecord {
  const rec: ChartRecord = {};
  for (const q of [1, 2, 3, 4]) {
    for (let n = 1; n <= 8; n++) {
      rec[`tooth_${q}${n}`] = '1';
    }
  }
  return rec;
}

describe('computeOverviewStats', () => {
  test('counts the 6 per-arch sites over present teeth', () => {
    const rec = fullMouth();
    // Tooth 16 (upper): 2 of its 6 sites bleed, 1 has plaque, 1 has PD >= 4.
    rec.bop_16_db = 1;
    rec.bop_16_b = 1;
    rec.pi_16_mb = 1;
    rec.pd_16_dp = 5;
    const stats = computeOverviewStats(rec);
    assert.equal(stats.totalSites, 32 * 6);
    assert.equal(stats.bopCount, 2);
    assert.equal(stats.piCount, 1);
    assert.equal(stats.pd4Count, 1);
    assert.equal(stats.bopPercent, Math.round((2 / 192) * 100));
    assert.equal(stats.piPercent, Math.round((1 / 192) * 100));
    assert.equal(stats.pd4Percent, Math.round((1 / 192) * 100));
  });

  test('counts percentages per affected tooth share of the whole mouth', () => {
    const rec = fullMouth();
    // Set every tooth's db site to bleed: 32 of 192 sites.
    for (const t of Object.keys(rec)) {
      const tooth = t.replace('tooth_', '');
      rec[`bop_${tooth}_db`] = 1;
    }
    const stats = computeOverviewStats(rec);
    assert.equal(stats.bopCount, 32);
    assert.equal(stats.bopPercent, 17); // 16.67 -> 17
  });

  test('excludes missing and unkeyed teeth from numerator and denominator', () => {
    const rec = fullMouth();
    rec.bop_16_mb = 1;
    rec.tooth_16 = '0'; // missing
    rec.pi_17_mb = 1;
    delete rec.tooth_17; // key absent entirely: neither counted nor grayed
    const stats = computeOverviewStats(rec);
    assert.equal(stats.totalSites, 30 * 6);
    assert.equal(stats.bopCount, 0);
    assert.equal(stats.piCount, 0);
  });

  test('pd threshold is >= 4 like the site (parseInt(pdKey) >= 4)', () => {
    const rec = fullMouth();
    rec.pd_11_db = 3;
    rec.pd_12_db = 4;
    rec.pd_13_db = '5';
    const stats = computeOverviewStats(rec);
    assert.equal(stats.pd4Count, 2);
  });

  test('returns zero percentages for an empty chart', () => {
    const stats = computeOverviewStats({});
    assert.equal(stats.totalSites, 0);
    assert.equal(stats.bopPercent, 0);
    assert.equal(stats.piPercent, 0);
    assert.equal(stats.pd4Percent, 0);
  });
});

describe('getOverviewSiteFills', () => {
  const paths = [
    { id: 'site_16d', d: 'x' },
    { id: 'site_16m', d: 'x' },
    { id: 'site_16b', d: 'x' },
    { id: 'site_16p', d: 'x' },
    { id: 'site_38l', d: 'x' },
    { id: 'site_38b', d: 'x' },
  ];

  test('aggregates the three interproximal surfaces per merged polygon', () => {
    const rec = fullMouth();
    rec.bop_16_db = 1;
    rec.bop_16_dp = 1;
    rec.pi_16_ml = 1; // the site's areaMap merges ml into the m polygon too
    rec.bop_16_mb = 1; // mb merges into the m polygon
    rec.bop_16_p = 1; // the p polygon only takes a plain p surface
    const fills = getOverviewSiteFills(rec, paths as any);
    const byId = Object.fromEntries(fills.map(f => [f.id, f]));
    assert.equal(byId['site_16d'].bop, 1);
    assert.equal(byId['site_16m'].bop, 1);
    assert.equal(byId['site_16m'].pi, 1);
    assert.equal(byId['site_16p'].bop, 1);
    assert.equal(byId['site_16b'].bop, 0);
  });

  test('maps lingual surfaces to the l polygon on lower teeth', () => {
    const rec = fullMouth();
    rec.pi_38_l = 1;  // l polygon takes the plain l surface
    rec.pi_38_dl = 1; // dl merges into the d polygon like the site's areaMap
    const byId = Object.fromEntries(
      getOverviewSiteFills(rec, paths as any).map(f => [f.id, f]),
    );
    assert.equal(byId['site_38l'].pi, 1);
    assert.equal(byId['site_38b'].pi, 0);
  });

  test('marks teeth with tooth_X == 0 as missing', () => {
    const rec = fullMouth();
    rec.tooth_16 = '0';
    rec.bop_16_db = 1; // bleeding flag should not matter for a missing tooth
    const byId = Object.fromEntries(
      getOverviewSiteFills(rec, paths as any).map(f => [f.id, f]),
    );
    assert.equal(byId['site_16d'].missing, true);
    // But the raw flag is preserved so overlays can decide
    assert.equal(byId['site_16d'].bop, 0);
    assert.equal(byId['site_38b'].missing, false);
  });

  test('returns 0/1 aggregation (flags, not sums) for merged polygons', () => {
    const rec = fullMouth();
    rec.bop_16_db = 1;
    rec.bop_16_dp = 1;
    rec.bop_16_dl = 1;
    const byId = Object.fromEntries(
      getOverviewSiteFills(rec, paths as any).map(f => [f.id, f]),
    );
    assert.equal(byId['site_16d'].bop, 1);
  });
});

describe('buildOverviewPdTexts', () => {
  const slots = [
    { tooth: 16, surface: 'db', x: 226, y: 45 },
    { tooth: 16, surface: 'b', x: 248, y: 43 },
    { tooth: 16, surface: 'mb', x: 268, y: 45 },
    { tooth: 46, surface: 'db', x: 249, y: 270 },
    { tooth: 46, surface: 'b', x: 271, y: 273 },
    { tooth: 46, surface: 'mb', x: 293, y: 268 },
  ];

  test('shows PD > 3 for present teeth only', () => {
    const rec = fullMouth();
    rec.pd_16_db = 3; // threshold: strictly greater
    rec.pd_16_b = 4;
    rec.pd_16_mb = '7';
    rec.pd_46_db = 6;
    rec.tooth_46 = '0'; // missing: excluded
    const texts = buildOverviewPdTexts(rec, slots as any);
    assert.deepEqual(
      texts.map(t => ({ tooth: t.tooth, surface: t.surface, value: t.value })),
      [
        { tooth: 16, surface: 'b', value: 4 },
        { tooth: 16, surface: 'mb', value: 7 },
      ],
    );
  });

  test('flags PD >= 6 for the yellow highlight circle', () => {
    const rec = fullMouth();
    rec.pd_16_b = 6;
    rec.pd_16_mb = 5;
    const texts = buildOverviewPdTexts(rec, slots as any);
    assert.equal(texts.length, 2);
    assert.equal(texts[0].highlighted, true);
    assert.equal(texts[1].highlighted, false);
    assert.equal(texts[0].x, 248);
    assert.equal(texts[0].y, 43);
  });
});

describe('getOverviewFurcationMarkers', () => {
  const coords = {
    furcation_16_dp: { x: 226, y: 108 },
    furcation_36_l: { x: 725, y: 195 },
    furcation_14_mp: { x: 355, y: 92 },
  };

  test('keeps grades > 0 on present, non-implanted teeth', () => {
    const rec = fullMouth();
    rec.furcation_16_dp = 1;
    rec.furcation_36_l = '2';
    rec.furcation_14_mp = 0;
    const markers = getOverviewFurcationMarkers(rec, coords as any);
    assert.deepEqual(
      markers.map(m => ({ tooth: m.tooth, site: m.site, grade: m.grade })),
      [
        { tooth: 16, site: 'dp', grade: 1 },
        { tooth: 36, site: 'l', grade: 2 },
      ],
    );
    assert.equal(markers[0].x, 226);
    assert.equal(markers[0].y, 108);
  });

  test('skips implanted and missing teeth', () => {
    const rec = fullMouth();
    rec.furcation_16_dp = 3;
    rec.furcation_36_l = 2;
    rec.implant_16 = 2; // implanted teeth show no furcation markers
    rec.tooth_36 = '0';
    const markers = getOverviewFurcationMarkers(rec, coords as any);
    assert.equal(markers.length, 0);
  });

  test('ignores coordinate keys that have no furcation value', () => {
    const rec = fullMouth();
    rec.furcation_17_b = 2; // no coordinate entry for 17
    const markers = getOverviewFurcationMarkers(rec, coords as any);
    assert.equal(markers.length, 0);
  });
});

describe('getOverviewImplantMarkers', () => {
  const coords = {
    implant_16: { x: 242, y: 82 },
    implant_11: { x: 473, y: 71 },
    implant_27: { x: 758, y: 71 },
  };

  test('shows implants 1..3 on present teeth and reports their status', () => {
    const rec = fullMouth();
    rec.implant_16 = 1;
    rec.implant_11 = '3';
    rec.implant_27 = 0;
    const markers = getOverviewImplantMarkers(rec, coords as any);
    assert.deepEqual(
      markers.map(m => ({ tooth: m.tooth, status: m.status })),
      [
        { tooth: 16, status: 1 },
        { tooth: 11, status: 3 },
      ],
    );
    assert.equal(markers[0].x, 242);
  });

  test('hides implants on switched-off tooth positions', () => {
    const rec = fullMouth();
    rec.implant_16 = 2;
    rec.tooth_16 = '0';
    const markers = getOverviewImplantMarkers(rec, coords as any);
    assert.equal(markers.length, 0);
  });
});

describe('formatOverviewDate', () => {
  test('formats ISO dates as DD.MM.YYYY like the site', () => {
    assert.equal(formatOverviewDate('2026-11-16'), '16.11.2026');
  });

  test('passes through unexpected values', () => {
    assert.equal(formatOverviewDate(''), '');
    assert.equal(formatOverviewDate('16/11/2026'), '16/11/2026');
  });
});
