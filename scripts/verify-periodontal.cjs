const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadTs(relPath, { stripAliasImport = false } = {}) {
  let src = fs.readFileSync(path.join(root, relPath), 'utf8');
  if (stripAliasImport) {
    src = src.replace(/^import\s+\{[^}]*\}\s+from\s+['"]@\/[^'"]+['"];?\s*$/m, '');
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
check(placeholderSrc.includes('z-[3]'), 'SvgPlaceholder must have grid/CEJ layer z-index 3');
check(placeholderSrc.includes('z-[4]'), 'SvgPlaceholder must have polygon layer z-index 4');
check(placeholderSrc.includes('z-[5]'), 'SvgPlaceholder must have interaction SVG layer z-index 5');
check(placeholderSrc.indexOf('z-[2]') < placeholderSrc.indexOf('z-[3]'), 'implant layer (z-2) must render below the mm-line layer (z-3), like the site');
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
check(geometrySrc.includes('POLYGON_SCALE = SITE_MM_SCALE * CEJ_SCALE'), 'chartGeometry must scale the site mm scale (6.45 units/mm) into app units');
check(geometrySrc.includes('i <= 16'), 'chartGeometry must emit 16 mm lines like the site');
check(geometrySrc.includes('rootDirection'), 'chartGeometry mm lines must extend into the root area only');

console.log(failures === 0 ? 'PASS: raster crowns only, unsquashed JPG-aspect canvas, 5 render layers (implant behind mm lines), site mm grid in root area only, exact site implant PNGs (192 assets), exact crown hitboxes, CEJ alignment' : `${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
