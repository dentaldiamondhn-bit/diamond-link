# Dental Diamond Link — Instructions

This file documents project conventions and reverse-engineering studies. Section 20 holds the reverse-engineered analysis of the reference site's 3D Periodontal Viewer that our `Periodontal3DModal` ports.

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
