const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadTs(relPath, { stripAliasImport = false } = {}) {
  let src = fs.readFileSync(path.join(root, relPath), 'utf8');
  if (stripAliasImport) {
    src = src.replace(/^import\s+\{[^}]*\}\s+from\s+['"]@\/[^'"]+['"];?\s*$/gm, '');
  }
  const js = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'React.createElement',
      esModuleInterop: true,
    },
  }).outputText;
  const m = new Module(relPath, module);
  m.filename = path.join(root, relPath);
  m.paths = Module._nodeModulePaths(root);
  m._compile(js, m.filename);
  return m.exports;
}

const crownModule = loadTs('src/lib/periodontal/toothSvgPaths.ts');
const anatomy = loadTs('src/lib/utils/toothAnatomy.ts', { stripAliasImport: true });

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failures++;
  }
}

const teeth = [];
for (let q = 1; q <= 4; q++) for (let i = 1; i <= 8; i++) teeth.push(q * 10 + i);

check(Object.keys(crownModule.SITE_TOOTH_CROWNS).length === 32, 'expected 32 reverse-engineered crowns');
for (const tooth of teeth) {
  const crown = crownModule.SITE_TOOTH_CROWNS[tooth];
  check(!!crown, `missing crown ${tooth}`);
  if (!crown) continue;
  const keys = Object.keys(crown.surfaces);
  check(keys.length === 4, `tooth ${tooth} expected 4 surfaces, got ${keys.length}`);
  const expected = crown.arch === 'upper' ? ['p', 'b', 'd', 'm'] : ['l', 'b', 'd', 'm'];
  for (const key of expected) {
    check(typeof crown.surfaces[key] === 'string' && crown.surfaces[key].startsWith('M'), `tooth ${tooth} missing path ${key}`);
  }
  check(crown.cej === (crown.arch === 'upper' ? 'bottom' : 'top'), `tooth ${tooth} wrong CEJ side`);

  const dims = anatomy.getToothDimensions(tooth);
  const targetWidth = dims.crownHalfWidth * 2;
  const targetHeight = dims.crownHeight;
  const transform = crownModule.getSiteCrownTransform(tooth, targetWidth, targetHeight);
  const m = transform.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)/);
  check(!!m, `tooth ${tooth} bad transform ${transform}`);
  if (!m) continue;
  const [tx, ty, sx, sy] = m.slice(1).map(Number);
  const [x0, y0, x1, y1] = crown.bbox;
  const xs = [x0 * sx + tx, x1 * sx + tx];
  const ys = [y0 * sy + ty, y1 * sy + ty].sort((a, b) => a - b);
  check(Math.abs(Math.min(...xs) + targetWidth / 2) < 0.01, `tooth ${tooth} x min ${Math.min(...xs)}`);
  check(Math.abs(Math.max(...xs) - targetWidth / 2) < 0.01, `tooth ${tooth} x max ${Math.max(...xs)}`);
  check(Math.abs(ys[0]) < 0.01, `tooth ${tooth} y min ${ys[0]}`);
  check(Math.abs(ys[1] - targetHeight) < 0.01, `tooth ${tooth} y max ${ys[1]}`);
}

// Implant PNGs: the app renders the exact periodontalchart-online.com assets.
// Spot-check the copied coordinate table against the site's values.
const overlaySrc = fs.readFileSync(path.join(root, 'components/periodontal/ImplantOverlay.tsx'), 'utf8');
const coordEntries = {};
for (const m of overlaySrc.matchAll(/'(implant_\d{2}_[bpl])': \{ x: ([\d.]+), y: ([\d.]+) \},/g)) {
  coordEntries[m[1]] = { x: Number(m[2]), y: Number(m[3]) };
}
const SITE_IMPLANT_COORDS_SPOT = {
  implant_18_b: { x: 26, y: 57 },
  implant_11_b: { x: 363.9, y: 57 },
  implant_11_p: { x: 363.9, y: 106 },
  implant_28_p: { x: 761.8, y: 105 },
  implant_31_b: { x: 415, y: 112 },
  implant_31_l: { x: 415.9, y: 54 },
  implant_48_b: { x: 36, y: 112 },
  implant_41_l: { x: 371.9, y: 54 },
};
check(Object.keys(coordEntries).length === 64, `expected 64 implant coordinate entries, got ${Object.keys(coordEntries).length}`);
for (const [key, expected] of Object.entries(SITE_IMPLANT_COORDS_SPOT)) {
  const got = coordEntries[key];
  check(!!got && got.x === expected.x && got.y === expected.y, `implant coord ${key} must be {x:${expected.x}, y:${expected.y}}, got ${JSON.stringify(got)}`);
}

const sizeEntries = {};
for (const m of overlaySrc.matchAll(/'(\d{2}[bpl])': \[(\d+), (\d+)\],/g)) {
  sizeEntries[m[1]] = [Number(m[2]), Number(m[3])];
}
check(Object.keys(sizeEntries).length === 64, `expected 64 implant PNG size entries, got ${Object.keys(sizeEntries).length}`);

// Verify every referenced PNG exists on disk (all three status folders) with
// matching IHDR dimensions.
function pngSize(relPath) {
  const buf = fs.readFileSync(path.join(root, relPath));
  check(buf.length > 24 && buf.readUInt32BE(12) === 0x49484452, `${relPath} is not a valid PNG (missing IHDR)`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
for (const [key, [w, h]] of Object.entries(sizeEntries)) {
  const quadrant = Math.floor(Number(key.slice(0, 2)) / 10);
  for (const folder of ['', 'r/', 'g/']) {
    const relPath = `public/img/implants/${folder}${quadrant}/${key}.png`;
    if (!fs.existsSync(path.join(root, relPath))) {
      check(false, `missing implant asset ${relPath}`);
      continue;
    }
    if (folder === '') {
      const [gw, gh] = pngSize(relPath);
      check(gw === w && gh === h, `implant asset ${relPath} is ${gw}x${gh}, table says ${w}x${h}`);
    }
  }
}
for (const view of ['upper-svg-placeholder-01', 'upper-svg-placeholder-02', 'lower-svg-placeholder-01', 'lower-svg-placeholder-02']) {
  check(overlaySrc.includes(`'${view}':`), `ImplantOverlay VIEW_SUFFIX must map ${view}`);
}
check(overlaySrc.includes("'upper-svg-placeholder-02': 'p'"), 'ImplantOverlay must use palatino (p) PNGs in the palatino view');
check(overlaySrc.includes("'lower-svg-placeholder-01': 'l'"), 'ImplantOverlay must use lingual (l) PNGs in the lingual view');
check(overlaySrc.includes("transform: 'translate(-50%, -50%)'"), 'ImplantOverlay must center PNGs like the site (translate(-50%, -50%))');
check(overlaySrc.includes("status === 2 ? 'r' : status === 3 ? 'g'"), 'ImplantOverlay must pick red/green PNG folders by status');
check(overlaySrc.includes('linear-gradient(to bottom, transparent, black 4px, black calc(100% - 4px), transparent)'), 'ImplantOverlay must apply the site 4px fade mask on colored implants');
check(overlaySrc.includes('pointerEvents'), 'ImplantOverlay must not intercept pointer events');
check(overlaySrc.includes('/img/implants/'), 'ImplantOverlay must reference the copied site PNG assets');

const outlineSrc = fs.readFileSync(path.join(root, 'components/periodontal/ToothOutlineSvg.tsx'), 'utf8');
check(!outlineSrc.includes('getRootPaths'), 'ToothOutlineSvg must not render parametric roots');
check(!outlineSrc.includes('getCrownPath'), 'ToothOutlineSvg must not use old crown path');
check(!outlineSrc.includes('ImplantScrewVector'), 'ToothOutlineSvg must not render implants');
check(outlineSrc.includes('getSiteCrownPaths'), 'ToothOutlineSvg must use reverse-engineered crown paths');

const anatomySrc = fs.readFileSync(path.join(root, 'src/lib/utils/toothAnatomy.ts'), 'utf8');
check(!anatomySrc.includes('buildRootPaths'), 'toothAnatomy must not keep procedural root builders');
check(!anatomySrc.includes('getRootPaths'), 'toothAnatomy must not export procedural root paths');
check(!anatomySrc.includes('buildCrownPath'), 'toothAnatomy must not keep procedural crown builder');

const placeholderSrc = fs.readFileSync(path.join(root, 'components/periodontal/SvgPlaceholder.tsx'), 'utf8');
check(placeholderSrc.includes('z-[1]'), 'SvgPlaceholder must have background layer z-index 1');
check(placeholderSrc.includes('z-[2]'), 'SvgPlaceholder must have implant overlay layer z-index 2');
check(placeholderSrc.includes('z-[3]'), 'SvgPlaceholder must have mm-line/CEJ layer z-index 3');
check(placeholderSrc.includes('z-[4]'), 'SvgPlaceholder must have polygon layer z-index 4');
check(placeholderSrc.includes('z-[5]'), 'SvgPlaceholder must have interaction SVG layer z-index 5');
check(placeholderSrc.indexOf('z-[2]') < placeholderSrc.indexOf('z-[3]'), 'implant layer (z-2) must render below the mm-line layer (z-3), like the site');
check(placeholderSrc.indexOf('z-[3]') < placeholderSrc.indexOf('z-[4]'), 'mm-line layer (z-3) must render below the GM/PD polygon layer (z-4)');
check(placeholderSrc.includes('ImplantOverlay'), 'SvgPlaceholder must render ImplantOverlay');
check(placeholderSrc.includes('ToothSurfaceMarkers'), 'SvgPlaceholder must render visible BOP/plaque markers in layer 4');
check(!placeholderSrc.includes('ToothOutlineSvg'), 'SvgPlaceholder must not mount vector crown outlines');
check(!placeholderSrc.includes('implant-mask-'), 'SvgPlaceholder must not render inline implant masks');
check(placeholderSrc.includes('getMmLineYs(id).map'), 'SvgPlaceholder must draw the site mm lines (16 lines from the CEJ into the root area)');
check(placeholderSrc.includes('stroke="#000"'), 'mm lines must be black like the site');
check(placeholderSrc.includes('strokeWidth={1.25}'), 'mm lines must be 1.25 wide like the site');
check(placeholderSrc.includes('#f59e0b'), 'zero (CEJ) line must stay amber');

const surfaceSrc = fs.readFileSync(path.join(root, 'components/periodontal/ToothSurfaceSvg.tsx'), 'utf8');
check(surfaceSrc.includes('getSiteToothCrown'), 'ToothSurfaceSvg must use exact crown surfaces');
check(surfaceSrc.includes('getSiteCrownTransform'), 'ToothSurfaceSvg must align hitboxes to crown geometry');
check(surfaceSrc.includes('pointerEvents="all"'), 'ToothSurfaceSvg crown hitboxes must receive pointer events');
check(!surfaceSrc.includes('BOP_COLOR'), 'ToothSurfaceSvg must contain only invisible hitboxes');

const markersSrc = fs.readFileSync(path.join(root, 'components/periodontal/ToothSurfaceMarkers.tsx'), 'utf8');
check(markersSrc.includes('pointerEvents="none"'), 'ToothSurfaceMarkers must not intercept clicks');

const geometrySrc = fs.readFileSync(path.join(root, 'src/lib/utils/chartGeometry.ts'), 'utf8');
for (const [view, value] of [
  ['upper-svg-placeholder-01', 106],
  ['upper-svg-placeholder-02', 53],
  ['lower-svg-placeholder-01', 108],
  ['lower-svg-placeholder-02', 61],
]) {
  check(geometrySrc.includes(`'${view}': ${value}`), `chartGeometry missing site CEJ ${view}=${value}`);
}

const rootDirections = [];
for (const m of geometrySrc.matchAll(/rootDirection: (-?\d+),/g)) rootDirections.push(Number(m[1]));
check(
  JSON.stringify(rootDirections) === JSON.stringify([-1, 1, -1, 1]),
  `chartGeometry rootDirections must be -1/1/-1/1 (01 views roots up, 02 views roots down), got ${JSON.stringify(rootDirections)}`
);
check(geometrySrc.includes('SVG_VIEWBOX_HEIGHT = (SVG_VIEWBOX_WIDTH / 3248) * 652'), 'canvas height must match the background JPG aspect so teeth render unsquashed');
check(geometrySrc.includes('POLYGON_SCALE = SITE_MM_SCALE * SITE_SVG_SCALE * SITE_DISPLAY_TO_APP'), 'chartGeometry must scale the site mm scale (6.45 units/mm) into app units');
check(geometrySrc.includes('i <= 16'), 'chartGeometry must emit 16 mm lines like the site');
check(geometrySrc.includes('rootDirection'), 'chartGeometry mm lines must extend into the root area only');

// --- GM/PD/AL: site-faithful polygon x coordinates, colors and AL formula ---

const geometryModule = loadTs('src/lib/utils/chartGeometry.ts', { stripAliasImport: true });
const siteX = geometryModule.SITE_X_COORDINATES;
check(!!siteX && Object.keys(siteX).length === 32, 'chartGeometry must carry the site xCoordinates for all 32 teeth');
const X_SPOT = {
  11: { db: 345, mb: 377, dp: 344, mp: 375 },
  21: { db: 446, mb: 415, dp: 448, mp: 417 },
  36: { mb: 604, ml: 604, db: 653, dl: 649 },
  48: { mb: 59, ml: 63, db: 13, dl: 14 },
};
for (const [tooth, surfaces] of Object.entries(X_SPOT)) {
  for (const [surface, value] of Object.entries(surfaces)) {
    check(siteX[tooth] && siteX[tooth][surface] === value, `site xCoordinates ${tooth}.${surface} must be ${value}, got ${siteX[tooth] && siteX[tooth][surface]}`);
  }
}

// Site SVG -> app transform measured live: SVG (viewBox 790) displayed 787px
// wide, its left edge 9px right of the JPG (806.671875px for 3248px bitmap).
const svgToApp = geometryModule.siteSvgXToApp;
const expectedApp = x => (x * (787 / 790) + 9) * (1800 / 806.671875);
check(Math.abs(svgToApp(345) - expectedApp(345)) < 0.001, 'siteSvgXToApp(345) must match the measured site transform');
check(Math.abs(svgToApp(345) - 786.97) < 0.05, `siteSvgXToApp(345) must be ≈786.97 (live-measured tooth-11 line edge), got ${svgToApp(345)}`);
// getSurfaceX must reproduce the site getXCoord midpoint rule (b/p/l).
check(Math.abs(geometryModule.getSurfaceX(11, 'b') - svgToApp((345 + 377) / 2)) < 0.001, "getSurfaceX(11,'b') must be the midpoint of db/mb like the site");
check(Math.abs(geometryModule.getSurfaceX(36, 'l') - svgToApp((649 + 604) / 2)) < 0.001, "getSurfaceX(36,'l') must be the midpoint of dl/ml like the site");
check(Math.abs(geometryModule.getSurfaceX(18, 'mb') - svgToApp(49)) < 0.001, "getSurfaceX(18,'mb') must map the site coordinate directly");

// Vertical mapping: both site layers are letterboxed inside their own boxes
// (measured live, probe6): the SVG (xMidYMid meet) sits in a 162.5px slot with
// a 0.5576px letterbox, the JPG in an 806.67x166.56 element box (object-fit
// contain) with a 2.3160px letterbox. The site's own mm lines confirm the
// uniform 787/790 scale (slope 6.4254px per 6.45 units) and put SVG y=106 on
// screen 954.155 -> app y = 231.71.
const svgToAppY = geometryModule.siteSvgYToApp;
const S = 787 / 790;
const Vy = (162.5 - 162 * S) / 2;
const Jy = (162.5 * 1.025 - 652 * (806.671875 / 3248)) / 2;
const K = 1800 / 806.671875;
const expectedAppY = y => (y * S + Vy - Jy) * K;
check(Math.abs(svgToAppY(106) - expectedAppY(106)) < 0.001, 'siteSvgYToApp(106) must match the site CSS box model');
check(Math.abs(svgToAppY(106) - 231.71) < 0.1, `siteSvgYToApp(106) must be ≈231.71 (upper-01 CEJ, live-measured), got ${svgToAppY(106)}`);
// The old mapping had no vertical offset and drifted ~4.7 app units (≈2 site
// px) below the raster CEJ; the 325px-parent letterbox model drifted the
// other way (~4.5 units). Both are wrong; the slot-level letterbox is exact.
check(Math.abs(svgToAppY(106) - 106 * (361.33 / 162)) > 3, 'siteSvgYToApp must not reproduce the old un-offset CEJ mapping');
for (const [view, siteY] of [
  ['upper-svg-placeholder-01', 106],
  ['upper-svg-placeholder-02', 53],
  ['lower-svg-placeholder-01', 108],
  ['lower-svg-placeholder-02', 61],
]) {
  const zeroLineY = geometryModule.getViewConfig(view).zeroLineY;
  check(Math.abs(zeroLineY - expectedAppY(siteY)) < 0.001, `${view} zeroLineY must use the site-derived Y mapping, got ${zeroLineY}`);
}
check(Math.abs(geometryModule.POLYGON_SCALE - 6.45 * S * K) < 0.001, 'POLYGON_SCALE must derive from the same site-to-app factor as the Y mapping');

const perioSrc = fs.readFileSync(path.join(root, 'components/periodontal/PerioPolygon.tsx'), 'utf8');
check(perioSrc.includes("PD_STROKE = '#0000ff'"), 'PerioPolygon PD line must be blue like the site');
check(perioSrc.includes("GM_STROKE = '#ff0000'"), 'PerioPolygon GM line must be red like the site');
check(perioSrc.includes("MUC_STROKE = '#D011A6'"), 'PerioPolygon muc line must be #D011A6 like the site');
check(perioSrc.includes('fillOpacity={0.5}'), 'PerioPolygon polygon fill must be opacity 0.5 like the site');
check(perioSrc.includes('STROKE_WIDTH = 3'), 'PerioPolygon strokes must be 3px like the site');
check((perioSrc.match(/strokeDasharray="4,4"/g) || []).length === 1, 'only the Neubefund overlay line may be dashed (site GM/PD lines are solid)');
check(perioSrc.indexOf('perio-muc') < perioSrc.lastIndexOf('perio-gm'), 'muc line must stack below the GM line like the site');
check(!perioSrc.includes('hasMeasurement'), 'PerioPolygon must render flat CEJ lines for every present tooth (no data gate)');
check(perioSrc.includes('isToothCharted(data, tooth)'), 'PerioPolygon must keep polygons on implanted positions even when the tooth toggle is off');

const interSrc = fs.readFileSync(path.join(root, 'components/periodontal/InterProximalPolygon.tsx'), 'utf8');
check(interSrc.includes('fillOpacity={0.5}'), 'InterProximalPolygon fill must be opacity 0.5 like the site');
check(interSrc.includes('inter-gm') && interSrc.includes('inter-pd'), 'InterProximalPolygon must draw continuous GM/PD lines between teeth like the site');
check(interSrc.includes('(prevTooth === 11 && tooth === 21) || (prevTooth === 41 && tooth === 31)'), 'InterProximalPolygon must skip the midline pairs like the site');
check(!interSrc.includes('hasMeasurement'), 'InterProximalPolygon must render for every adjacent present pair (no data gate)');
check(interSrc.includes('isToothCharted(data, tooth)') && interSrc.includes('isToothCharted(data, prevTooth)'), 'InterProximalPolygon must gate on isToothCharted like the site presence-only rule');
check(!/implant_\$\{tooth\}|implant_\$\{prevTooth\}/.test(interSrc), 'InterProximalPolygon must not skip pairs involving implants (the site connects present implanted teeth)');

const analysisSrc = fs.readFileSync(path.join(root, 'src/lib/utils/periodontalAnalysis.ts'), 'utf8');
check(analysisSrc.includes('inverted ? pd + gm : pd - gm'), 'getToothAl must use the site formula AL = PD - GM (sign flipped in inverted mode)');
check(!/const stored = data\[`al_/.test(analysisSrc), 'getToothAl must derive AL from PD/GM, never from a stored al_* field');

// The site's validateAndFormatInput semantics: signed GM keeps its minus, a
// lone "-" is a legal intermediate state, magnitude clamped to 0..99.
const analysisModule = loadTs('src/lib/utils/periodontalAnalysis.ts', { stripAliasImport: true });
const fmt = analysisModule.formatMeasurementInput;
const fmtCases = [
  ['gm', '-2', '-2'],
  ['gm', '-', '-'],
  ['gm', '-12', '-12'],
  ['gm', '-123', '-12'],
  ['gm', '2', '2'],
  ['gm', '', ''],
  ['gm', '007', '0'],
  ['gm', '-99', '-99'],
  ['gm', '-100', '-10'],
  ['pd', '5', '5'],
  ['pd', '99', '99'],
  ['pd', '', ''],
  ['pd', '12a', '12'],
];
for (const [field, input, expected] of fmtCases) {
  check(fmt(input, field) === expected, `formatMeasurementInput('${field}', '${input}') must be '${expected}', got '${fmt(input, field)}'`);
}
check(fmt('-4', 'pd') === '-4', 'formatMeasurementInput must keep the minus sign on PD (signed probing depth)');

const clinicalSrc = fs.readFileSync(path.join(root, 'src/lib/types/clinical.ts'), 'utf8');
check(clinicalSrc.includes('isGmInverted ? pd + gm : pd - gm'), 'calculateAL must use the site formula AL = PD - GM (sign flipped in inverted mode)');
check(/isGmInverted: false,/.test(clinicalSrc), 'CHART_TEMPLATE.isGmInverted must default to false (site lang=es default)');

const storeSrc = fs.readFileSync(path.join(root, 'src/lib/store/useChartStore.ts'), 'utf8');
check(/isGmInverted: false,/.test(storeSrc), 'store must default isGmInverted to false (site lang=es default, AL = PD - GM)');
check(storeSrc.includes('isGmInverted: state.isGmInverted'), 'initializeFromPatient must sync the store flag into chartData (single source of truth)');
check(storeSrc.includes('get().calculateAllAL();'), 'loadFromApiData must recompute AL after loading');

const settingsSrc = fs.readFileSync(path.join(root, 'src/lib/store/useSettingsStore.ts'), 'utf8');
check(/isGmInverted: false,/.test(settingsSrc), 'useSettingsStore must default isGmInverted to false (no split-brain default)');

const gridSrc = fs.readFileSync(path.join(root, 'components/periodontal/ArchDataGrid.tsx'), 'utf8');
check(gridSrc.includes('type="text"'), 'ArchDataGrid GM/PD inputs must be type="text" (a controlled number input drops the intermediate "-")');
check(!/<input[\s\S]{0,200}type="number"/.test(gridSrc), 'ArchDataGrid must not keep type="number" inputs for GM/PD');
check(gridSrc.includes('formatMeasurementInput(next, field)'), 'ArchDataGrid must format GM/PD input with the site validateAndFormatInput rules');
check(gridSrc.includes("updateField(cellKey, '0')"), 'ArchDataGrid must reset an empty or lone "-" value to 0 on blur, like the site');
check(gridSrc.includes('isDistalFirst'), 'ArchDataGrid must order grid columns anatomically (Q1/Q4 distal-first like the site DOM order)');
check(gridSrc.includes("['VD', 'VMe', 'VM']"), 'ArchDataGrid Q1/Q4 vestibular columns must read VD|VMe|VM left to right');
check(gridSrc.includes("['VM', 'VMe', 'VD']"), 'ArchDataGrid Q2/Q3 vestibular columns must read VM|VMe|VD left to right');
check(gridSrc.includes("['PD', 'PMe', 'PM']"), 'ArchDataGrid Q1/Q4 palatal columns must read PD|PMe|PM left to right');
check(gridSrc.includes("['PM', 'PMe', 'PD']"), 'ArchDataGrid Q2/Q3 palatal columns must read PM|PMe|PD left to right');
check(gridSrc.includes("['LD', 'LMe', 'LM']"), 'ArchDataGrid Q1/Q4 lingual columns must read LD|LMe|LM left to right');
check(gridSrc.includes("['LM', 'LMe', 'LD']"), 'ArchDataGrid Q2/Q3 lingual columns must read LM|LMe|LD left to right');
check(gridSrc.includes('sites.slice().reverse()'), 'ArchDataGrid must reverse the surface order for Q1/Q4 columns');

const analysisGatesSrc = fs.readFileSync(path.join(root, 'src/lib/utils/periodontalAnalysis.ts'), 'utf8');
check(analysisGatesSrc.includes('export function isToothCharted'), 'periodontalAnalysis must export isToothCharted (present OR implanted) so polygons draw over implant PNGs');
check(analysisGatesSrc.includes('export function isImplanted'), 'periodontalAnalysis must export isImplanted');

const summarySrc = fs.readFileSync(path.join(root, 'components/periodontal/modals/SummaryModal.tsx'), 'utf8');
check(summarySrc.includes('getToothAl(chartData, tooth, surface)'), 'SummaryModal must read AL through getToothAl so it agrees with the grid');

const studySrc = fs.readFileSync(path.join(root, 'src/lib/utils/studyToChart.ts'), 'utf8');
check(studySrc.includes('vestibular_gm_mesial') && studySrc.includes('palatino_gm_mesial'), 'studyToChart must restore the signed gingival margin from the study');
check(!/chartData\[`gm_\$\{tooth\}_\$\{surface\}`\] = 0;/.test(studySrc), 'studyToChart must not hardcode gm_* to 0 (signed GM must round-trip)');

console.log(
  failures === 0
    ? 'PASS: raster crowns only, unsquashed JPG-aspect canvas, 5 render layers (implant under mm grid under polygons), site mm grid in root area only, exact site implant PNGs (192 assets), exact crown hitboxes, CEJ alignment, site-faithful GM/PD lines (site x coords, blue/red 3px, no data gate), AL = PD - GM (site convention), GM accepts negatives (-99..99), anatomical site order (Q1/Q4 distal-first), polygons + mm lines painted over implant PNGs'
    : `${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
