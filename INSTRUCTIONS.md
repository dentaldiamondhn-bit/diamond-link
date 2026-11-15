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

Stack: **vanilla `three` r187 + `@types/three` inside a React ref canvas** (mirrors the original's architecture; avoids R3F peer-dep conflicts with the app's React 18). Zero external assets — everything procedural.

Deliberate upgrades over the original (documented deviations):

1. **Anatomical context added around the extracted math**: per-tooth procedural crown (scaled sphere, jaw-aware) + root cones (1/2/3 roots by FDI type), pink gingival collar ring per tooth, and two arch gum bands (`TubeGeometry` over a Catmull-Rom horseshoe through the cervical points). The original's fan (`yRotation` table) was re-projected onto a real horseshoe: `x = side·A·sin θ, z = −B·(1−cos θ)`, `rotation.y = atan2(x, z+B)` with the original's exact per-tooth angles `[0.1, 0.4, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5]`.
2. **Same site math, our conventions**: GM sign follows our port of `calculateSingleALForInput` — normal mode: margin apical offset = **−GM** (positive GM input = margin coronal to CEJ), inverted mode (`isGmInverted`): **+GM**; NIC/AL = PD + marginApical (≡ `AL = PD − GM` normal / `PD + GM` inverted, same as the app). Local y_gm = dir·marginApical·k, y_al = y_gm + dir·PD·k, dir = +1 upper (apex up) / −1 lower, **k = MM_TO_WORLD = 0.032** world units per mm.
3. **Pocket visualization**: per-site translucent ribbon GM→AL (red `0xFF3B47` if BOP, blue `0x3B82F6` otherwise) at the site's angular position (buccal sites at 0°±24°·side, palatal/lingual at 180°±24°, `side` = quadrant mirror sign) — the direct analogue of the original's trapezoids, mapped 1:1 to our 9-site store keys (`pd/gm/bop/pi_<tooth>_<site>`).
4. **Implants**: metallic fixture (cylinder + 4 torus threads) + abutment + crown replacing the natural tooth when `implant_<tooth> > 0`; peri-implant probing sites keep rendering ribbons/dots (matches the app's ausente+implante exception). **Ausente** teeth are skipped, while the arch gum bands continue through the gap (edentulous ridge).
5. **BOP/Plaque markers**: red (BOP) / amber (plaque) spheres at each positive site on the gingival margin, toggleable.
6. **Controls**: OrbitControls (damped, min/max distance), animated-tween camera presets **Vista Frontal / Maxilar Superior / Mandibular Inferior / Oclusal / Reiniciar Cámara**, auto-rotate toggle (off by default, −0.8 speed), glass pills for **Encía Translúcida / Bolsas Periodontales / BOP / Placa**.
7. **Inspection**: raycast hover on crowns → floating glass tooltip with FDI number, estado (Ausente/Implante/Presente), 6-site GM/PD/NIC/BOP table, and mobility grade.
8. Scene dressing: transparent canvas (alpha) over the dark glass panel, subtle grid at y = −1.15, ambient + key + fill lights; dynamic group rebuilt on every `chartData` change (shared geometries cached in `archLayout.ts`, per-rebuild geometries disposed).
