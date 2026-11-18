# Dental Diamond Link — Instructions

This file documents project conventions and reverse-engineering studies. Section 20 holds the reverse-engineered analysis of the reference site's 3D Periodontal Viewer that our `Periodontal3DModal` ports. Section 21 documents the ported periodontal modals and the Historial (study-history) section from the same reference site.

## 20. Reverse-Engineered 3D Periodontal Viewer

Source: `https://www.periodontalchart-online.com/?lang=en-gb`, triggered by the **3D** action in its toolbar. Evidence: full JavaScript tree downloaded from the live site (scripts fingerprint `?v=20261115235331`) and analyzed statically (`js/renderer/three_renderer.js` 1247 lines, `js/controls.js`, `js/navigation.js`, and the modal markup `php/modals/three_modal.php`).

### 20.1 Rendering Engine & Dependencies

- Vanilla **Three.js** (`js/libraries/three.min.js`, no module build), with **OrbitControls.js** and **GLTFExporter.js** loaded as separate library scripts. No React, no R3F.
- Renderer: `THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true })`, **fixed 968×600 canvas** (`setupRenderers()`), clear color `0xFFFFFF`.
- Camera: `THREE.PerspectiveCamera(75, 0.7524691358024691, 0.1, 1000)`.
- OrbitControls: `autoRotate = true`, `autoRotateSpeed = -0.5`; user interaction (`start` event) switches autoRotate off and flips the play/pause button icon.
- Scene: ambient `0x404040` + directional `0xffffff` 0.5 at (1,1,1); ground plane `PlaneGeometry(10,10)` `0xE0E0E0`, `GridHelper(10,10)`, `AxesHelper(5)`, and two horseshoe guide rings drawn by `drawHorseshoeLine(radius, yOffset, zOffset)`: **r = 3.5 @ y = 4.2** (upper cervical line) and **r = 3.0 @ y = 1.8** (lower cervical line), both z-offset −2.
- Modal lifecycle: toolbar action `'three'` → `fetch('php/modals/three_modal.php?lang=…')` → inject HTML → `window.prepareThreeRenderingData()` → `window.render_three_scene()`. Closing calls `window.disposeThreeJs()` (renderer/scene/controls nulled, RAF cancelled). The renderer/canvas are re-attached on reopen, not recreated.
- Export affordances: **Download GLTF** (`exportScene()` via GLTFExporter, `binary:false`), AR handoff (`exportSceneToAR()` builds a base64 `data:application/octet-stream` URI into a `<model-viewer>` element), PNG snapshot of the modal via html2canvas (scale 5).

### 20.2 3D Assets & Geometry

**There are no external mesh/model files.** Zero `.glb/.gltf/.obj/.stl` network loads; the whole scene is procedural (`GLTFExporter` is export-only). The scene is *not* anatomical teeth — it is a 3D extrusion of the 2D pocket chart:

- Per tooth, `createTrapezoidsForTooth()` builds **6 flat trapezoid quads** in a `THREE.Group`:
  - `bukkalDistal`, `bukkalMesial` (buccal side, z = +1)
  - `palatinalDistal`, `palatinalMesial` (palatal/lingual side, z = −1, mirrored Y)
  - `verbindungDistal`, `verbindungMesial` (interdental connector quads linking buccal↔palatal edges)
  - Each quad: `BufferGeometry` from 4 `scaleAndCenterCoordinates()`-projected vertices, `MeshBasicMaterial` (transparent, DoubleSide), plus a `LineSegments` gray (`0x666666`) edge outline.
- Materials opacity: red quads 0.7, blue quads 0.5.
- **Implants, furcation, mobility, plaque are read into the data model but are never rendered in 3D** (`Tooth` constructor stores `implant`/`furcation`/`mobility`; nothing consumes them downstream). Missing teeth (`tooth_N !== 1`) are simply skipped — no edentulous ridge, no implant swap.
- Comparison ("overlay") mode renders the older finding in green (`0x09FF00`, interdental `0x90EE90`, scale 1.001) and the newer in blue (`0x0000FF`, interdental `0x788FFF`, scale 1.002, z shifted ±1.1 for slight forward offset).

### 20.3 Clinical Data → 3D Mapping (the deformation math)

Data model (`Tooth` class): per tooth, six sites. Upper jaw `{db, b, mb, dp, p, mp}`, lower `{db, b, mb, dl, l, ml}` with `pi/bop/pd/gm/al` maps. Input keys: `gm_<tooth>_<site>`, `pd_…`, `bop_…`, `pi_…`, `al_…`, `tooth_<tooth>`.

**Pixel-space constants** (the 2D chart canvas is the intermediate coordinate system):

```
gm_OK_b = 585   (upper buccal CEJ baseline)    gm_OK_p = 694   (upper palatal)
gm_UK_l = 1195  (lower lingual)                gm_UK_b = 1310  (lower buccal)
scaleFactor: upper 6.5 px/mm, lower 6.05 px/mm
xCoordinates: fixed per-tooth table, e.g. 11: {db:628, mb:660, b:644, dp:627, mp:658, p:642.5} …
```

**Per-site formulas** (`updatePocketsFromData`):

```
buccalSides = [db, b, mb]; innerSides = upper ? [dp,p,mp] : [dl,l,ml]
gmSignBuccal = upper ? +1 : -1     gmSignInner = upper ? -1 : +1
alSignBuccal = upper ? -1 : +1     alSignInner = upper ? +1 : -1

y_gm[side] = base(side) + gmSign(side)·scaleFactor·GM      // GM in mm (input sign: positive = margin coronal to CEJ)
y_pd[side] = scaleFactor·PD
y_al[side] = y_gm[side] + alSign(side)·y_pd[side]          // AL = GM + PD toward the apex
```

**World projection** (`scaleAndCenterCoordinates`, 100 px = 1 world unit):

```
world.x = (x − 680)/100
buccal side:  world.y = (−y + offsetY)/100          // mirrorY = true
palatal side: world.y = (y − additionalYOffset + offsetY)/100
world.z = z/5          // z = ±1 → ±0.2, ±1.1 → ±0.22
offsetY: upper 1000, lower 1500; additionalYOffsetValue: upper 1275, lower 2500
```

Consequences (verified numerically): upper cervical line sits at world y ≈ 4.15–4.19, lower at ≈ 1.90–1.95; AL extends **upward** from GM for upper teeth and **downward** for lower (roots point away from the occlusal plane), consistent with the horseshoe guide rings at y = 4.2 / 1.8.

**BOP → color** (`getColorForTrapezoid`): a quad is **red `0xFF0000`** when BOP = 1 at either of its bounding sites, otherwise **blue `0x0000FF`**; interdental connector quads use the light variants `0xFF7C7C` / `0x788FFF`. Overlay modes force solid green/blue ignoring BOP.

**Missing teeth:** skipped entirely (`present = false` → no group). **PD:** visualized as the ribbon length GM→AL (deeper pocket = longer ribbon) — there is no separate pocket sleeve, heatmap, or GM-driven gingival mesh deformation; the trapezoids *are* the deformation. **Bleeding dots:** none in 3D — BOP only re-colors the ribbons (the % surface analysis bars in the modal come from `calculateSurfaces()`: trapezoid areas `(a+b)/2·h` in px², conversion factor **42.25 px² = 1 mm²**).

### 20.4 Layout & Camera

- `toothPositions`: per-tooth `{xOffset, zOffset: 0, yRotation}` — a pure **fan**, not a horseshoe curve: 11 → −0.1 rad, 18 → −1.5; mirrored for 21–28 (+0.1…+1.5), lower 31–48 mirrors upper left/right, 41–48 mirrors 11–18. Tooth groups also get `scale.set(1.002, 1, 1.002)` (1.001 for the superimposed layer).
- Camera: single reset (`resetCamera()` → position `(−4.557234662107484, 5.707731258588391, 3.669307152816407)`, target `(0.17756233020217607, 1.178885826640126, −1.412923568387541)`) and play/pause auto-rotate. **No camera presets** (frontal/occlusal/arch views do not exist in the original).

### 20.5 Modal UI (original)

`three_modal` canvas container + button row: `Reset Camera`, play/pause (SVG icons), `Download GLTF`; PNG export button; "Surface Analysis" legend with three percentage bars (total, buccal/lingual, interdental) filled by `render_bopSurfaces()` from the area math above; Close.

### 20.6 Our Port (`Periodontal3DModal` + `src/lib/periodontal/3d/`)

Stack: **vanilla `three` r187 + `@types/three` inside a React ref canvas** (mirrors the original's architecture; avoids R3F peer-dep conflicts with the app's React 18). See 20.7 for the real anatomical mesh pipeline that replaced the first procedural port.

1. **Same site math, our conventions**: GM sign follows our port of `calculateSingleALForInput` — normal mode: margin apical offset = **−GM** (positive GM input = margin coronal to CEJ), inverted mode (`isGmInverted`): **+GM**; NIC/AL = PD + marginApical (≡ `AL = PD − GM` normal / `PD + GM` inverted, same as the app). Local y_gm = dir·marginApical·k, y_al = y_gm + dir·PD·k, dir = +1 upper (apex up) / −1 lower, **k = MM_TO_WORLD = 0.032** world units per mm.
2. **Pocket visualization**: per-site translucent ribbon quad GM→AL (custom `BufferGeometry`, red `0xFF3B47` if BOP, blue `0x3B82F6` otherwise) anchored to the crown surface at the site's angular position (buccal sites at 0°±24°·side, palatal/lingual at 180°±24°) — the direct analogue of the original's trapezoids, mapped 1:1 to our 9-site store keys (`pd/gm/bop/pi_<tooth>_<site>`). Anchor points are raycast once per tooth/site against the real mesh (`computeSiteAnchors`).
3. **Implants**: lathe-profile titanium fixture (tapered, 5 thread rings) + abutment + lathe crown replacing the natural tooth mesh when `implant_<tooth> > 0`; peri-implant probing sites keep rendering ribbons/dots (matches the app's ausente+implante exception). **Ausente** teeth are skipped (edentulous ridge stays in the gingiva mesh). *Deviation:* the implant remains parametric (`LatheGeometry`) — no clean CC0 implant mesh was available; revisit if one lands in `public/models/periodontal/`.
4. **BOP/Plaque markers**: red (BOP) / amber (plaque) custom octahedron markers at each positive site, snapped to the crown surface via the site anchors, toggleable.
5. **Controls**: OrbitControls (damped, min/max distance), animated-tween camera presets **Vista Frontal / Maxilar Superior / Mandibular Inferior / Oclusal / Reiniciar Cámara**, auto-rotate toggle (off by default, −0.8 speed), glass pills for **Encía Translúcida / Bolsas Periodontales / BOP / Placa**.
6. **Inspection**: raycast hover on the real tooth meshes → floating glass tooltip with FDI number, estado (Ausente/Implante/Presente), 6-site GM/PD/NIC/BOP table, and mobility grade.
7. Scene dressing: transparent canvas (alpha) over the dark glass panel, subtle grid at y = −1.05, ambient + key + fill lights; dynamic group rebuilt on every `chartData` change (loaded geometries cached module-level, per-rebuild geometries disposed).
8. **Async loading**: `viewer.loadAssets()` (idempotent, module-level fetch cache) loads manifest + 30 `.pmesh.json` files; the modal shows a "Cargando anatomía 3D…" spinner and surfaces load errors; data updates before load are queued (`pendingData`) and applied when assets land.

### 20.7 Real anatomical meshes (BodyParts3D pipeline)

The original viewer is 100% procedural (see 20.2) — it has no meshes to extract.
Our viewer instead bundles **real anatomical meshes from BodyParts3D 4.3
(Database Center for Life Science, DBCLS; CC BY-SA 2.1 JP)** — full pipeline in
`scripts/prepare-periodontal-3d-meshes.mjs`, attribution in
`public/models/periodontal/NOTICE.md`.

Assets (30 `.pmesh.json` files + `manifest.json`, ~3.9 MB, gzip-served):

- `teeth/tooth_<FDI>.pmesh.json` — 28 individual permanent teeth (11–17, 21–27, 31–37, 41–47) with FMA-verified per-quadrant identities. `.pmesh.json` = `{p, n, c?, f}` (positions/normals/optional vertex colors/triangle indices) parsed by `pmeshToBufferGeometry` in `meshLoader.ts`.
- `gingiva_upper.pmesh.json` / `gingiva_lower.pmesh.json` — the donor's actual maxillary/mandibular gingiva (FMA59763/59764).
- Wisdom teeth (FDI x8) reuse the adjacent second molar mesh, position extrapolated along the arch, scale 0.94 (BodyParts3D has no third molars).

Pipeline (`prepare-periodontal-3d-meshes.mjs`, re-runnable against a fresh BodyParts3D `download.cgi` OBJ dump):

1. **Body→scene mapping** `(X, Z, −Y)` — verified numerically against the dataset (x+ = patient left, z+ = superior, y− = anterior); the mapping is a proper rotation (det = +1, no chirality flip) putting anterior at scene +z and patient-right on the viewer's left.
2. **Cervical line per tooth** from the donor's own gingival margin: gingiva vertices horizontally near the tooth centroid, buccal half, within ±7 mm of an anatomical prior (per-type crown fraction), margin = crown-side 20/80 percentile; falls back to the prior when the estimate leaves the anatomical crown-height range.
3. **Yaw baked** so the buccal faces local +z (arch-center outward direction); cervical centroid becomes the mesh local origin; mm→world scale `MM_TO_WORLD = 0.032` baked.
4. **CEJ vertex-color gradient** baked into every tooth: crown `#f8fafc` → root dentin `#e2d5c3` (rendered with `vertexColors: true`).
5. **Occlusal regularization**: donor in-situ heights are asymmetric, so crown tips are re-anchored at ±0.07 (slight open bite, both arches visible); x/z arch shape stays the donor's real positions.
6. **Gingiva alignment**: global per-jaw vertical shift maps the donor margins onto the regularized cervicals, then a local clamp/falloff wrap deforms the gum toward each tooth neck (±0.07 u, quadratic falloff within 0.24 u).

Runtime GM deformation: each gingiva vertex keeps a precomputed (nearest tooth, weight) pair; on every `chartData` change the vertex is displaced along y by that tooth's mean margin apical offset (recession lifts upper margins apically / lowers lower ones), so the scalloped gum margin breathes with the data. Tooth meshes are one geometry per FDI (crown + curved roots, real morphology: incisor/canine/premolar/molar, single/double/triple roots).

## 21. Periodontal modals & Historial (port from periodontalchart-online.com)

Source: `https://www.periodontalchart-online.com/?lang=es` (reference site). Evidence: the live
site's JS/CSS/HTML was downloaded and analyzed statically (see section 22 for the remaining
features to port). — `js/renderer/overview_renderer.js`,
`js/renderer/profile_rendering.js`, `js/renderer/aiprompt_renderer.js`,
`js/renderer/history_renderer.js` (3106 lines), `js/coordinates/overview_coordinates.js`,
`js/coordinates/history_coordinates.js`, `js/misc/position.js`, `index.html` (embedded
`window.historyLabels` Spanish dictionary), and the modal markup. Cache-busting param used:
`?v=20261116181328`.

### 21.1 Shared data-model facts (used by every port)

- Flat `Record<string, any>` chart data: `pd_/gm_/al_/bop_/pi_<tooth>_<site>`,
  `tooth_<FDI>`, `implant_<FDI>`, `furcation_<FDI>_<site>`, `mobility_<FDI>`, plus `date`,
  `patient_number`, `patient_first_name`, `patient_last_name`.
- **"Der Zahn entscheidet"** (site `js/misc/position.js`): a position counts as occupied only when
  `tooth_<FDI> == '1'`; an implant never rescues a switched-off tooth. Implant statuses are
  `1|2|3` (`hatImplantatStatus`); the implant marker requires tooth **and** status
  (`implantatSichtbar`).
- Probing covers the **6 applicable surfaces per arch**: upper `{db,b,mb,dp,p,mp}`,
  lower `{db,b,mb,dl,l,ml}` (site's `analyzeJsonDataSVG`); overview SVG polygons merge them into
  the letters `d/m/b/p/l` (`areaMap`: db/dp/dl→d, mb/mp/ml→m).
- The app persists studies as rows in `estudios_periodontales` + `mediciones_periodontales`
  (one row per **present** tooth; absent teeth simply have no row). `buildChartDataFromStudy`
  (`src/lib/utils/studyToChart.ts`) flattens them back to the shape above.
- All engines are **self-contained** (no imports) so plain `node --test` can execute them;
  data tables (polygon paths, coordinates) are injected by the caller from `src/lib/constants/*`.

### 21.2 Resumen (SummaryModal) — ported

- Files: `src/lib/constants/overviewSites.ts` (128 site polygons extracted from the site's
  `img/svg/ok-uk-01.svg`, ids `site_<FDI><mdbpl>`), `src/lib/constants/overviewCoordinates.ts`
  (192 PD-text slots, furcation + implant marker coordinates, left side mirrored at x=500),
  `src/lib/utils/periodontalOverview.ts` (engine), `components/periodontal/modals/SummaryModal.tsx`
  (PI blue / BOP red maps, PD texts > 3 in red, yellow circle for PD ≥ 6, missing teeth grey,
  `pd_bop.png` export), tests `tests/periodontalOverview.test.ts` (26).
- Semantics: `computeOverviewStats` counts BOP/PI/PD≥4 over present teeth only (6 surfaces/tooth);
  percentages rounded to whole numbers; an empty chart yields 0 instead of the site's NaN.
- `getOverviewSiteFills` greys a polygon only when the tooth key is **explicitly** `'0'`; the
  positionBesetzt gate is applied everywhere else.

### 21.3 Perfil (ProfileModal) + Prompt IA (AiPromptModal) — ported

- Files: `src/lib/utils/periodontalProfile.ts` (engine: `analyzeForProfile` port of
  `analyzeJsonData`, stability assessment, AI prompt builder, `detectDiabetes` regex `/diab[ée]t/i`),
  `components/periodontal/modals/ProfileModal.tsx` (pure-SVG stacked bar PI/PD/BOP,
  `profile.png`), `components/periodontal/modals/AiPromptModal.tsx` (17 languages with native
  names, copy-to-clipboard + Gemini handoff, `aiprompt.png`),
  `components/periodontal/modals/rasterizeSvg.ts` (shared SVG→PNG serializer + `wrapText`),
  tests `tests/periodontalProfile.test.ts` (21).
- Stability criteria (Spanish copy from the site dictionary): PI ≤ 20%, BOP ≤ 20% (**≤ 16% if
  smoker**), no residual pockets ≥ 6 mm, no furcation ≥ grade 2.

### 21.4 Clasificación (ClassificationModal) — ported

- Files: `src/lib/utils/periodontalClassification.ts`, `components/periodontal/modals/ClassificationModal.tsx`,
  tests `tests/periodontalClassification.test.ts`.
- Persistence: `clasificacion` column added to `estudios_periodontales` via
  `database/migrations/add_clasificacion_estudios_periodontales.sql` (**must be applied manually
  in Supabase**); wired through `useChartStore.prepareApiPayload`, `studyToChart.ts` and the
  POST/PUT routes in `app/api/estudios-periodontales/`.

### 21.5 Historial (HistoriaTab) — ported

The reference site's "Historial" is a **main-page tab** (not a modal): it compares all saved
studies of one patient. Ported as a third tab in `app/(auth)/estudio-periodontal/page.tsx`
("Historial") rendering `components/periodontal/HistoriaTab.tsx`.

Engine `src/lib/utils/periodontalHistory.ts` (self-contained; tests
`tests/periodontalHistory.test.ts`, 40 tests):

- `parseHistoryDate` / `formatHistoryDate` (DD.MM.YYYY) / `formatHistoryMonthYear`
  ("Ene 2026" Spanish abbreviations — the site hardcodes German month names even in Spanish).
- `analyzeHistoryJsonData` — port of the site's `analyzeJsonData` (one-decimal longitudinal
  percentages; BOP/PI count surfaces `> 0` and positive sites `== 1`; PD buckets `==4/==5/≥6`;
  furcation 2|3). **Deviation:** the site computes `totalTeeth = 32 − explicit tooth_==0`
  (its data flags every absent tooth); app studies omit absent teeth entirely, so the engine
  counts teeth whose switch is on — clinically equivalent for our data.
- `analyzeHistorySvgData` — port of `analyzeJsonDataSVG` (integer % for the map stamps).
- `extractHistoryInstanceData` — port of `extractInstanceData` counters (teeth, pockets 4/5/6,
  closed pockets = PD 4 + BOP `0` on the probed side of the arch, furcation 1/2/3, implants);
  the site's counters deliberately run **without** a presence gate.
- `adjustPdForComparison` (PD 0 → 1 mm for b/p/l, 2 mm interproximal) +
  `calculatePdDifferences` (chronological ordering, sites missing in one study skipped) +
  `aggregatePdDifferences` (d/m sums; lower jaw averages the pair) +
  `getHeatmapColor` (d3 threshold scale port; ≥ 5 mm → no fill, like the original).
- `calculateChangePercentages` (improvement / no change / worsening, adjusted to sum 100),
  `summarizeTopWorseningSites` (only worsening sites, tie-break by newest value, top 16).
- `suggestMaintenanceInterval` — the site's interval ladder (max over the three PD-percentage
  thresholds, in months), `computeIntervalStatus` (expected = months × 30 days; ±30 days
  tolerance → TEMPRANO / A TIEMPO / TARDE).

UI (`HistoriaTab.tsx`, reusing `modals/OverviewMap.tsx` — extracted from SummaryModal with an
additive `layerVisibility` prop):

- Header (patient ID, latest date, apellidos, nombre, birth date, clinician) + suggested-months
  badge; toggle row **PD/BOP · PD ≥ 6mm · Furcaciones · Implantes · PI +** (same defaults and
  per-map gating as the site, including the quirk that furcation/implant markers on the PI map
  follow the "PI +" toggle).
- Three pure-SVG trend charts (Inflamación red, Profundidades stacked 4/5/≥6, Higiene blue).
- One BOP + PI map pair per study (newest first) with PD texts, furcation/implant markers,
  missing-teeth grey, and a per-block PNG export (combined 1000×640 SVG via `rasterizeSvg`).
- Between consecutive studies: interval strip (status + expected/actual days) and an expandable
  comparison panel — heatmap superimpose map + legend + change histogram on the left;
  transposed comparison table (Antes/Después/Diferencia) + stacked improvement bar, toggling
  ("Tabla 1/2" ⇄ "Tabla 2/2") to the top-16 worsening-sites table on the right.
- Data: per-study detail fetches (`/api/estudios-periodontales/[id]`, which returns full
  `mediciones_periodontales(*)`; the list endpoint only ships PD/AL).

**Intentional omissions / deviations:** the site's timelapse animation slide and cumulative-BOP
overlay slide are not ported; HTML-panel PNG downloads (html2canvas on the site) are not ported
(no html2canvas dependency — SVG parts use `rasterizeSvg`); the "seleccionado" interval badge is
not shown because `intervalo_mantenimiento` is not persisted by the API; "Mostrar cambios"
tooltip is Spanish (the site shows a German fallback); map date stamps use numeric DD.MM.YYYY
(consistent with Resumen).

### 21.6 Verification

```bash
node --test tests/periodontalHistory.test.ts tests/periodontalOverview.test.ts \
  tests/periodontalProfile.test.ts tests/periodontalClassification.test.ts   # 115 tests
npx eslint <changed files> --ext .ts,.tsx    # 0 errors (accepted no-explicit-any warnings)
### 21.7 Código QR (QrModal) — ported (2026-11-17)

Source: `js/qrcode_modal.js` (ES labels from `?lang=es` inline dictionary; `decoder.js` lives
behind the public `/api/` viewer and was not reachable — the encoder's key list is the contract).
Evidence: generated key sequence verified **byte-identical** to the site's 900-key array.

- Files: `src/lib/utils/periodontalQr.ts` (self-contained engine), `components/periodontal/modals/QrModal.tsx`,
  tests `tests/periodontalQr.test.ts` (20) pinning the exact reference blocks for teeth 18 and 36.
- Encoding (`encodeChartDataForQr`): exactly **900 keys → 1800 chars**. Starts `initial_exam`,
  `reevaluation`; teeth in order 18→11, 28→21, 38→31, 48→41; per tooth: `tooth_`, `mobility_`,
  furcation keys (**upper molars b/dp/mp, upper premolars 14/24 dp/mp, lower molars b/l, nothing
  else**), `implant_`, then 4 six-key blocks [BOP buccal, PI buccal], [BOP inner, PI inner],
  [GM buccal, PD buccal], [GM inner, PD inner] with sites `db,b,mb` + `dp,p,mp` (upper) /
  `dl,l,ml` (lower). Each value: `Math.round(v) + 50` padded to 2 digits (offset supports GM
  ≥ −50; missing → "50").
- URL (`buildPerioChartUrl`): `<base>?i=<encoded>` where base defaults to
  `https://www.periodontalchart-online.com/api/` — the site's public viewer decodes `?i=` and
  shows the full interactive chart, so scanning the QR works with zero backend on our side.
- Modal (Spanish, from the site dictionary): "Periodontograma"; QR shown client-side via the
  `qrcode` package (error correction L — the ~1830-char payload needs a v34+ symbol);
  "Abrir Periodontograma" opens the URL in a new tab; "Este periodontograma no está registrado
  con nosotros." when `hasRecordedFindings` is false; the site's privacy notice verbatim.

**Deviations:** the site renders the QR through `api.qrserver.com` (third-party request leaking
the chart URL); we generate it locally with `qrcode` — no data leaves the device. The payload
URL points at the reference site's viewer (our app has no public unauthenticated chart viewer;
revisit `PERIO_QR_TARGET_BASE` if one is added).

### 21.8 Intervalo (IntervalModal) — ported (2026-11-17)

Source: `js/renderer/interval_renderer.js` + the site's `window.intervalLabels` ES dictionary.
Replaced the previous placeholder radio-picker (which wrote a `intervalo_mantenimiento` chart
field that was never persisted).

- Files: `src/lib/utils/periodontalInterval.ts` (self-contained engine), rewritten
  `components/periodontal/modals/IntervalModal.tsx`, tests `tests/periodontalInterval.test.ts`
  (23), migration `database/migrations/add_interval_data_estudios_periodontales.sql`
  (**must be applied manually in Supabase**).
- Engine ports `analyzeIntervalData` (denominator = 6 sites × present teeth; "der Zahn
  entscheidet" gate; BOP/PI > 0 surfaces + == 1 positive sites; PD buckets 4/5/≥6; furcation
  2|3 advanced; the site's `pi_sci_*` guard is kept via a strict `^(bop|pi|pd|furcation)_\d\d_`
  key regex), `calculateIntervalCumulative` (≥4/≥5/≥6 %, 1 decimal), and
  `calculateRecommendedInterval` (risk factors BOP > 16% smoker / 23% non-smoker, S, D,
  furcations ≥2 shorten the interval one step in [3,4,6,9,12]; label order BOP, S, D, F).
- **Ladder difference:** the site has TWO interval ladders. The Historial one (already ported in
  `periodontalHistory.suggestMaintenanceInterval`, thresholds 20/10/5/2 → 4/6/9/12) is NOT the
  Interval modal's. The Interval modal's ladder contains duplicated conditions whose effective
  result is: cum4 ≤10→12, ≤20→6, else 3 (the "≤20→4" line is dead); cum5 ≤2→12, ≤4→9, ≤6→6,
  ≤10→4, else 3; cum6 ≤1→12, ≤2→6, ≤3→4, else 3 (the "≤1→9" line is dead); suggested =
  min(st4, st5, st6). `findLadderHighlightRow` mirrors the table highlight (bottom-most row
  whose threshold covers the value; none → whole column critical/red).
- UI: Evaluación table (count/%/cumulative per 4/5/≥6), pure-SVG stacked bar chart with the
  site's colors (#7D97E3 PI, #CCCCCC/#656565/#FD0000 PD, #FDA5A5 BOP, #E7F3FD background) and
  black threshold lines (PI 20%, BOP 16/23%), threshold table with green/critical highlighting
  and amber suggested row, clickable month boxes [3,4,6,9,12] (suggested grey, recommended
  white outline, selected teal) with an SVG suggested→recommended arrow labelled with the
  factor codes, and Tabaquismo/Diabetes checkboxes (initialized from saved interval_data, else
  from the patient record like ProfileModal).
- Persistence: `interval_data` jsonb column `{recommended, suggested, smoking, diabetes}`
  (same shape the site stores on its studies) wired through `buildChartDataFromStudy`,
  `prepareApiPayload` and the POST/PUT routes. The legacy `intervalo_mantenimiento` chart
  field is no longer written (nothing read it).
- Export: composed SVG → `interval.png` via `rasterizeSvg` (chart + evaluation + threshold
  grid with highlights + recommendation lines), matching the site's html2canvas artifact.

**Deviations:** the site auto-saves interval changes into its local JSON every second; our port
persists on each user action into `chartData.interval_data` and ships it with the study save
flow. Month boxes come from the site's 5-ladder (the old placeholder offered 24 months, which
the reference never uses). The chart keeps the site's light background so its original colors
and threshold lines stay readable.



## 22. Pending ports (backlog)

Features from the reference site not yet ported, queued in requested order:

1. **Lector PDF (`js/pdf_reader_manager.js`, `css/reader_modal.css`)** — client-side import of the
   site's own PDF chart report: parses metadata + per-tooth findings (GM/PD/BOP/PI/furcation/
   mobility/implants) with pdf.js and feeds them back into the chart as a new study.
2. **3D Surface analysis panel** — `render_bopSurfaces()` area-percentage bars (total,
   buccal/lingual, interdental; trapezoid area `(a+b)/2·h`, 42.25 px² = 1 mm²) from the site's
   `three_modal` (see 20.5); our `Periodontal3DModal` has no equivalent yet.
3. **Historial timelapse + cumulative overlay** — the site's history slides 2–3: play-through
   animation with loop + draggable timeline slider (timelapse BOP/PI map pairs per date) and the
   cumulative BOP overlay heatmap frames (`prepareCumulativeOverlayFrames`). These were noted as
   intentional omissions in 21.5; queued for porting on request (2026-11-17).
