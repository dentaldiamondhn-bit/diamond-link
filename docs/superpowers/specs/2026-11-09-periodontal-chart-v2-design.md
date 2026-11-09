# Periodontal Chart v2 — Design

**Date:** 2026-11-09
**Feature:** `app/(auth)/estudio-periodontal` + `components/periodontal/`
**Reference target:** https://www.periodontalchart-online.com/?lang=es

## Intent

Replace the broken periodontal chart rendering (white rectangles where teeth should be) with a
faithful vector reproduction of the reference application, embedded in the Dental Diamond Link
app shell — no duplicated sidebar/header, dark-mode native, Clerk auth and Supabase routes
untouched.

## Goals

- Pure inline-SVG anatomical tooth silhouettes (crown + roots) for all 32 teeth.
- 3-column workspace: left action rail (140px) | center chart+grid (flex-1, max 1100px) | right clinical rail (140px).
- Upper arch: data grid **above** SVG canvases. Lower arch: SVG canvases **above** data grid.
- Live summary banner (top and bottom): mean PD, mean CAL, BOP %, PI %.
- Bi-directional sync between grid inputs, SVG surface clicks and chart state.
- Payload compatibility with the existing `estudios_periodontales` / `mediciones_periodontales` schema — **no DB migration**.

## Non-goals

- No new DB columns. Per-site BOP/PI is a front-end concern; the DB keeps its per-tooth booleans.
- No 3D renderer, no QR encoder library, no full AAP/EFP classification engine — those are
  functional-but-simple dialogs in this pass.
- No changes to the API routes, the auth layout, or the rest of the app.

## Root cause of the "white rectangles"

Not broken images. `getSurfaceElementBounds()` (`src/lib/utils/coordinateMaps.ts:252`) returns a
hardcoded rectangle path `M0,0 L100,0 L100,100 L0,100 Z`, and `ToothSurfaceSvg` fills it with
`#F2F2F2` for every surface whenever the active remote control is not `bop`/`plaque` (default is
`pockets`). No tooth-outline path data exists anywhere in the repo.

## Architecture

### Directory move

`components/chart/` → `components/periodontal/` (git mv). `PeriodontalTable.tsx` and
`RemoteControlPanel.tsx` are removed — replaced by `ArchDataGrid.tsx` and the two action rails.
All other files move and are rewritten.

### Coordinate system

Single source of truth: `src/lib/utils/chartGeometry.ts`.

- viewBox `0 0 1800 400`, `preserveAspectRatio="xMidYMid meet"`.
- `TOOTH_PITCH = 110` SVG units; tooth centre = the `b` surface X from the existing `X_COORDINATES`.
- `POLYGON_SCALE = 6.45` units/mm, `POLYGON_ZERO_LINES` unchanged
  (`upper-01` 180, `upper-02` 220, `lower-01` 180, `lower-02` 220).

**Orientation — one model for all four views.** Each view has a `rootDirection`:

| View | Label | rootDirection | Roots point |
|---|---|---|---|
| `upper-svg-placeholder-01` | Vestibular Superior | -1 | UP |
| `upper-svg-placeholder-02` | Palatino Superior | -1 | UP |
| `lower-svg-placeholder-01` | Lingual Inferior | +1 | DOWN |
| `lower-svg-placeholder-02` | Vestibular Inferior | +1 | DOWN |

With `adjustedGm = isGmInverted ? -gm : gm`:

```
gmY  = zeroLineY - rootDirection * adjustedGm * scale
pdY  = gmY + rootDirection * pd * scale
mucY = gmY + rootDirection * muc * scale
```

> **This changes current output.** The existing `PerioPolygon` draws `upper-02` and `lower-01`
> with the sign inverted (their PD polylines run into the crown instead of apically), which
> contradicts the required root directions. The unified model fixes both views.

### Tooth anatomy engine

`src/lib/utils/toothAnatomy.ts` + `components/periodontal/ToothOutlineSvg.tsx`.

Eight parametric templates: central incisor, lateral incisor, canine, 1st premolar, 2nd premolar,
1st molar, 2nd molar, 3rd molar. Each template returns crown path + root paths in a local
coordinate system (x centred on 0, y = 0 at the CEJ, crown toward the crown direction, roots
toward the root direction). Per-FDI overrides supply crown width, crown height, root length and
root count (single / double / triple). Upper molars get 3 roots (mesiobuccal, distobuccal,
palatal), lower molars 2 (mesiobuccal, distobuccal); upper premolars may split distally.
Templates are mirrored for left/right quadrants and flipped for upper/lower.

Outlines are stroked with `vectorEffect="non-scaling-stroke"` so they stay crisp at any zoom.

### SVG layer order (z-stack)

Inside a single `<svg>` per view:

1. `<defs>` — gradients, clip paths.
2. 1 mm gridlines (`stroke="#4b5563"`, `strokeWidth="0.5"`) at `POLYGON_SCALE` spacing.
3. Red zero/CEJ reference line (`stroke="#ef4444"`, `strokeWidth="1.5"`).
4. `ToothOutlineSvg` — crown + roots.
5. `InterProximalPolygon` — bone loss between teeth.
6. `PerioPolygon` — navy AL polygon (`#000080`, opacity .45), blue PD polyline (`#3b82f6`, w 2),
   red dashed GM polyline (`#ef4444`, w 1.5, dash `4,4`), magenta MUC polyline (`#d011a6`, w 1.5).
7. `PdHighlighter` — amber `#fbbf24` at ≥5 mm, red `#ef4444` at ≥6 mm.
8. `FurcationMarker` — grade 1 open triangle, grade 2 half-filled, grade 3 filled black.
9. `ImplantMarker` — threaded screw vector; 1 gray `#9ca3af`, 2 red `#ef4444`, 3 green `#22c55e`.
10. `MissingToothDiagonal` — black X across absent teeth.
11. `ToothSurfaceSvg` — per-site click paths, clipped to the tooth outline.

### Interactive surface layer

The click targets move **inside** the main `<svg>` (no more absolutely-positioned HTML SVGs or
percentage math). Each site gets a path: a narrow band from the gingival margin down the root
axis, clipped to that tooth's outline.

- BOP active → fill `#ef4444`; plaque active → fill `#3b82f6`; otherwise transparent.
- Clicking toggles that **site** only: `toggleBop(tooth, surface)` / `togglePlaque(tooth, surface)`.
- The grid's per-tooth Sangrado / Placa cell is a tri-state indicator (filled = all sites,
  half = some, empty = none) that sets every site on click.

### Data grid (transposed)

`components/periodontal/ArchDataGrid.tsx` — one grid per arch, teeth as columns.

- Upper columns: 18 → 11, separator, 21 → 28. Lower columns: 48 → 41, separator, 31 → 38.
- Each tooth spans 6 sub-columns: `VM · VMe · VD · PM · PMe · PD` (vestibular mesial/medio/distal,
  palatal mesial/medio/distal).
- Upper row order: Movilidad, Implante, Furcación, Sangrado al sondaje, Placa, Margen gingival,
  Profundidad de sondaje, Nivel de inserción.
- Lower row order: reversed (Nivel de inserción first … Movilidad last).
- Per-tooth rows use `colSpan={6}`; per-site rows use the 6 sub-columns.
- Nivel de inserción is read-only (derived).

### Action rails

`LeftActionPanel.tsx` (140px): Save, Export JSON, Import JSON, then paint-mode buttons
**Placa** (blue), **BOP** (red), **5mm** (amber `#fbbf24`), **≥6mm** (red `#ef4444`), **PRA**.
The active paint mode is indicated by the matching colour.

`RightClinicalPanel.tsx` (140px): **Clasificación**, **Resumen**, **Análisis**, **Intervalo**,
**3D**, **Código QR**, **Calibración** — each opens a dialog.

### Dialogs

`components/periodontal/modals/`

- `SummaryModal` — real: full per-tooth measurement table + the four banner metrics.
- `AnalysisModal` — real: risk assessment with contributing factors.
- `ClassificationModal` — functional: AAP/EFP 2017 stage per tooth derived from PD, AL, furcation and mobility.
- `IntervalModal` — functional: select and store the maintenance recall interval.
- `CalibrationModal` — functional: probe calibration offset applied to displayed PD.
- `ThreeDModal`, `QrModal` — placeholders that state what they will do.

### Analysis utilities

`src/lib/utils/periodontalAnalysis.ts`

- `calculateChartStatistics(data)` → `{ meanPd, meanAl, bopPercent, plaquePercent, sitesEvaluated, … }`
  - BOP % = positive sites / evaluated sites. Evaluated sites = the 6 applicable sites of present
    teeth (not all 9) — fixes the current denominator, which counts non-applicable surfaces.
- `calculateRiskAssessment(data)` → `{ level, score, factors[] }` from BOP %, plaque %, % sites
  PD ≥ 5 mm and ≥ 6 mm, furcation II–III, mobility II–III and missing teeth.
- `classifyTooth(data, tooth)` → AAP/EFP 2017 stage 0–III with the driving criteria.

### Store

`src/lib/store/useChartStore.ts` keeps `chartData` (the spec's `data` name would break the rest of
the app) and gains:

```ts
updateToothSurface(tooth, surface, field, value)
toggleBop(tooth, surface)
togglePlaque(tooth, surface)
toggleToothPresence(tooth)
cycleImplantStatus(tooth)
setFurcation(tooth, site, grade)
setMobility(tooth, grade)
calculateAL()
calculateIndices() => { bopPercent, plaquePercent, meanPd, meanAl }
```

`toggleToothIndex(tooth, type)` stays and remains the "all sites of a tooth" toggle used by the grid.

All calculations that were previously invoked **inside** a `set()` producer are called **outside**
it — zustand's immer middleware is `set(produce(recipe))`, so a nested `set` is overwritten by the
outer produce and the update is silently lost. This already bit the AL/index recalculation.

### Persistence

Unchanged schema. `prepareApiPayload` maps the 9-surface front-end state to the DB's 6 sites using
the semantic mapping (`getTableSiteSurfaces`: vestibular `mb/b/db`, palatal `mp/p/dp` upper and
`ml/l/dl` lower, zipped with mesial/medio/distal). Per-tooth `sangrado` / `placa` are written as
`any site positive`; on load, a positive per-tooth flag is applied to all 6 applicable sites so the
loaded chart is internally consistent.

## Constraints

- No new runtime dependencies. `qrcode` is not available; the QR dialog stays a placeholder.
- Dark mode: every new surface uses `dark:` variants and `bg-gray-900` / `bg-gray-800` /
  `border-gray-700` / `text-white`.
- Spanish-only labels.
- No comments in code unless asked.

## Validation

- `npx tsc --noEmit --skipLibCheck` → 0 errors.
- `npx eslint` over the feature scope → 0 errors.
- `npx next build --no-lint` → compiles, `/estudio-periodontal` generated.
- Manual: no white rectangles; crown/root silhouettes visible; roots up for both upper views and
  down for both lower views; red zero line present; BOP/PI paint toggles from the SVG and reflects
  in the grid; PD typed in the grid moves the blue polyline; save → reload round-trips.

## Open items resolved during design

- Root orientation of `upper-02` / `lower-01` — corrected per the spec (see coordinate system).
- BOP/PI denominator — restricted to applicable sites of present teeth.
- Grid granularity — 6 sub-columns per tooth; furcation and mobility stay per tooth.
