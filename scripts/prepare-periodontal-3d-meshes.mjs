#!/usr/bin/env node
/**
 * Preprocesses BodyParts3D (DBCLS) permanent-teeth + gingiva OBJ meshes into
 * scene-ready meshes for the periodontal 3D viewer.
 *
 * Input:  BodyParts3D 4.3 OBJ download (download.cgi POST ids=[FJ...], rep_id=[BP...])
 *         default input dir: /tmp/opencode/bp3d_meshes/teeth_gingiva
 * Output: public/models/periodontal/teeth/tooth_<FDI>.pmesh.json (28)
 *         public/models/periodontal/gingiva_upper.pmesh.json / gingiva_lower.pmesh.json
 *         public/models/periodontal/manifest.json
 *
 * .pmesh.json format: { p: number[] (flat xyz), n: number[] (flat normals),
 *                       c?: number[] (flat rgb vertex colors), f: number[] (triangle indices) }
 *
 * Pipeline per tooth:
 *  1. body frame -> scene frame (x, z, -y) mapping (proper rotation, no chirality flip)
 *  2. cervical line detection via smoothed per-slice width local minimum (fallback: crown fraction)
 *  3. yaw baked so the buccal direction faces local +z
 *  4. cervical centroid moved to local origin, mm -> world scale applied
 *  5. CEJ vertex-color gradient baked (crown #f8fafc -> root #e2d5c3)
 *
 * Scene conventions consumed by the engine (see INSTRUCTIONS.md section 20):
 *  - y up (superior), +z anterior (toward the default camera), patient-right on viewer's left
 *  - tooth local origin = cervical centroid (y=0), crown extends toward the occlusal plane
 *
 * Attribution: BodyParts3D (c) Database Center for Life Science (DBCLS), CC BY-SA 2.1 JP.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const INPUT_DIR = process.argv[2] ?? '/tmp/opencode/bp3d_meshes/teeth_gingiva';
const OUT_DIR = join(REPO_ROOT, 'public', 'models', 'periodontal');

const MM_TO_WORLD = 0.032;
const CROWN_COLOR = [0.973, 0.98, 0.988]; // #f8fafc
const ROOT_COLOR = [0.886, 0.835, 0.765]; // #e2d5c3
const CEJ_BLEND = 0.03; // world units around the cervical plane for the gradient

// FDI -> BodyParts3D name suffix
const TOOTH_FILES = {
  11: 'Right upper central incisor tooth',
  12: 'Right upper lateral incisor tooth',
  13: 'Right upper canine tooth',
  14: 'Right first upper premolar tooth',
  15: 'Right second upper premolar tooth',
  16: 'Right first upper molar tooth',
  17: 'Right second upper molar tooth',
  21: 'Left upper central incisor tooth',
  22: 'Left upper lateral incisor tooth',
  23: 'Left upper canine tooth',
  24: 'Left first upper premolar tooth',
  25: 'Left second upper premolar tooth',
  26: 'Left first upper molar tooth',
  27: 'Left second upper molar tooth',
  31: 'Left lower central incisor tooth',
  32: 'Left lower lateral incisor tooth',
  33: 'Left lower canine tooth',
  34: 'Left first lower premolar tooth',
  35: 'Left second lower premolar tooth',
  36: 'Left first lower molar tooth',
  37: 'Left second lower molar tooth',
  41: 'Right lower central incisor tooth',
  42: 'Right lower lateral incisor tooth',
  43: 'Right lower canine tooth',
  44: 'Right first lower premolar tooth',
  45: 'Right second lower premolar tooth',
  46: 'Right first lower molar tooth',
  47: 'Right second lower molar tooth',
};
const GINGIVA_FILES = { upper: 'Maxillary gingiva', lower: 'Mandibular gingiva' };
// FDI 18/28/38/48 (no wisdom teeth in BodyParts3D) reuse the adjacent second molar mesh
const WISDOM_SOURCE = { 18: 17, 28: 27, 38: 37, 48: 47 };

const toothType = (fdi) => {
  const d = fdi % 10;
  if (d <= 2) return 'incisor';
  if (d === 3) return 'canine';
  if (d === 4 || d === 5) return 'premolar';
  return 'molar';
};

/** Body (X left+, Y anterior+, Z superior+) -> scene (x, y up, z anterior). */
const axisMap = ([x, y, z]) => [x, z, -y];

const CROWN_FRACTION = { incisor: 0.42, canine: 0.44, premolar: 0.44, molar: 0.38 };
const CROWN_H_RANGE = { incisor: [0.24, 0.44], canine: [0.24, 0.46], premolar: [0.22, 0.42], molar: [0.17, 0.34] };

function percentile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[idx];
}

function parseObj(path) {
  const verts = [];
  const normals = [];
  const faces = []; // triangle corner triples [vi, ni] (0-based)
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      verts.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
    } else if (line.startsWith('vn ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      normals.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
    } else if (line.startsWith('f ')) {
      const corners = [];
      for (const token of line.trim().split(/\s+/).slice(1)) {
        const [vi, , ni] = token.split('/');
        corners.push([parseInt(vi, 10) - 1, ni ? parseInt(ni, 10) - 1 : -1]);
      }
      for (let i = 1; i < corners.length - 1; i++) faces.push([corners[0], corners[i], corners[i + 1]]);
    }
  }
  return { verts, normals, faces };
}

function writeMesh(path, verts, normals, faces, colors) {
  const data = {
    p: verts.flat(),
    n: normals.flat(),
    ...(colors ? { c: colors.flat() } : {}),
    f: faces.flat(),
  };
  writeFileSync(path, JSON.stringify(data));
}

/** Cervical line: anatomical prior (per-type crown fraction), refined by the
 *  donor's own gingival margin — gingiva vertices horizontally near the tooth,
 *  buccal half, within a +/-7mm window around the prior; margin = crown-side
 *  percentile (robust to papilla dips). Falls back to the prior when the
 *  resulting crown height leaves anatomical range. */
function detectCervical(scene, dir, type, buccal, gingivaScene) {
  const ys = scene.map((v) => v[1]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const totalH = yMax - yMin;
  const tipY = dir === 1 ? yMin : yMax; // crown tip toward the occlusal plane
  const prior = tipY + dir * CROWN_FRACTION[type] * totalH;

  const centroidX = scene.reduce((s, v) => s + v[0], 0) / scene.length;
  const centroidZ = scene.reduce((s, v) => s + v[2], 0) / scene.length;
  const radius = { incisor: 4.5, canine: 5.0, premolar: 5.5, molar: 6.5 }[type];
  const candidates = [];
  for (const [x, y, z] of gingivaScene) {
    const dx = x - centroidX;
    const dz = z - centroidZ;
    if (Math.hypot(dx, dz) <= radius && dx * buccal[0] + dz * buccal[1] > 0.05 && Math.abs(y - prior) <= 7) {
      candidates.push(y);
    }
  }
  if (candidates.length >= 4) {
    const sorted = candidates.sort((a, b) => a - b);
    const marginY = dir === 1 ? percentile(sorted, 0.2) : percentile(sorted, 0.8);
    const crownH = Math.abs(tipY - marginY) * MM_TO_WORLD;
    const [lo, hi] = CROWN_H_RANGE[type];
    if (crownH >= lo * 0.9 && crownH <= hi * 1.08) {
      return { yCerv: marginY, method: 'gingiva-margin', totalH, tipY };
    }
  }
  return { yCerv: prior, method: 'fraction', totalH, tipY };
}

function main() {
  const files = readdirSync(INPUT_DIR);
  const findFile = (suffix) => files.find((f) => f.includes(suffix) && f.endsWith('.obj'));

  // ---- pass 1: parse, map to scene frame
  const gingivaParsed = {};
  for (const [jaw, suffix] of Object.entries(GINGIVA_FILES)) {
    const file = findFile(suffix);
    if (!file) throw new Error(`missing gingiva file: ${suffix}`);
    const { verts, normals, faces } = parseObj(join(INPUT_DIR, file));
    gingivaParsed[jaw] = { verts, normals, faces, scene: verts.map(([X, Y, Z]) => [X, Z, -Y]) };
  }

  const teeth = {};
  for (const [fdiStr, suffix] of Object.entries(TOOTH_FILES)) {
    const fdi = Number(fdiStr);
    const file = findFile(suffix);
    if (!file) throw new Error(`missing source file for: ${suffix}`);
    const { verts, normals, faces } = parseObj(join(INPUT_DIR, file));
    // body (X left+, Y anterior+ in body but anterior = -y after map, Z superior+) -> scene0 (x, y up, z anterior)
    const scene = verts.map(([X, Y, Z]) => [X, Z, -Y]);
    const dir = fdi < 30 ? 1 : -1; // upper apex +y, lower apex -y
    const cxFull = scene.reduce((s, v) => s + v[0], 0) / scene.length;
    const czFull = scene.reduce((s, v) => s + v[2], 0) / scene.length;
    teeth[fdi] = { fdi, file, verts, normals, faces, scene, dir, type: toothType(fdi), cx: cxFull, cz: czFull };
  }

  // ---- buccal directions from the arch centers (full-mesh centroids are
  //      horizontally aligned with the cervix)
  for (const jaw of ['upper', 'lower']) {
    const list = Object.values(teeth).filter((t) => (jaw === 'upper' ? t.dir === 1 : t.dir === -1));
    const ax = list.reduce((s, t) => s + t.cx, 0) / list.length;
    const az = list.reduce((s, t) => s + t.cz, 0) / list.length;
    for (const t of list) {
      const bx = t.cx - ax;
      const bz = t.cz - az;
      const len = Math.hypot(bx, bz) || 1;
      t.buccal = [bx / len, bz / len];
    }
  }

  // ---- cervical line per tooth (donor gingival margin, anatomical fallback)
  for (const t of Object.values(teeth)) {
    const gingivaScene = t.dir === 1 ? gingivaParsed.upper.scene : gingivaParsed.lower.scene;
    const det = detectCervical(t.scene, t.dir, t.type, t.buccal, gingivaScene);
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const [x, y, z] of t.scene) {
      if (Math.abs(y - det.yCerv) <= 0.03 * det.totalH) {
        cx += x;
        cz += z;
        n++;
      }
    }
    if (n > 0) {
      t.cx = cx / n;
      t.cz = cz / n;
    }
    Object.assign(t, det);
  }

  // ---- global offsets (closed in-situ bite kept, arch centered for the camera)
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const midX = mean([11, 21, 31, 41].map((f) => teeth[f].cx));
  const midZ = mean(Object.values(teeth).map((t) => t.cz));
  const offsetX = -midX;
  const offsetZ = -midZ;
  const bakeXZ = (p) => [(p[0] + offsetX) * MM_TO_WORLD, (p[2] + offsetZ) * MM_TO_WORLD];
  // vertical: regularized occlusal plane (donor in-situ heights are asymmetric);
  // upper tips at +0.07, lower tips at -0.07 -> slight open bite, both arches visible
  const TIP_OFFSET = 0.07;

  mkdirSync(join(OUT_DIR, 'teeth'), { recursive: true });
  const manifest = {
    generator: 'scripts/prepare-periodontal-3d-meshes.mjs',
    source: 'BodyParts3D 4.3 (Database Center for Life Science, DBCLS) - CC BY-SA 2.1 JP',
    mmToWorld: MM_TO_WORLD,
    teeth: {},
    gingiva: {},
  };

  // ---- pass 2: bake tooth meshes
  for (const t of Object.values(teeth)) {
    const theta = Math.atan2(t.buccal[0], t.buccal[1]); // buccal angle from +z toward +x
    const cos = Math.cos(-theta);
    const sin = Math.sin(-theta);
    const rot = ([x, y, z]) => [x * cos + z * sin, y, -x * sin + z * cos];

    const tipLocal = (t.tipY - t.yCerv) * MM_TO_WORLD; // signed crown extent
    const outVerts = [];
    const outNormals = [];
    const outColors = [];
    for (let i = 0; i < t.verts.length; i++) {
      const [X, Y, Z] = t.verts[i];
      const local = rot([X - t.cx, Z - t.yCerv, -Y - t.cz]).map((c) => c * MM_TO_WORLD);
      outVerts.push(local);
      // normals need the same body->scene axis map as positions, then the yaw
      const nrm = rot(axisMap(t.normals[i] ?? [0, 1, 0]));
      const len = Math.hypot(...nrm) || 1;
      outNormals.push([nrm[0] / len, nrm[1] / len, nrm[2] / len]);
      // CEJ vertex-color gradient (signed > 0 on the crown side)
      const signed = t.dir === 1 ? -local[1] : local[1];
      const k = Math.max(0, Math.min(1, signed / CEJ_BLEND + 0.5));
      outColors.push([
        ROOT_COLOR[0] + (CROWN_COLOR[0] - ROOT_COLOR[0]) * k,
        ROOT_COLOR[1] + (CROWN_COLOR[1] - ROOT_COLOR[1]) * k,
        ROOT_COLOR[2] + (CROWN_COLOR[2] - ROOT_COLOR[2]) * k,
      ]);
    }
    const outFaces = t.faces.map((tri) => tri.map(([vi]) => vi));
    writeMesh(join(OUT_DIR, 'teeth', `tooth_${t.fdi}.pmesh.json`), outVerts, outNormals, outFaces, outColors);
    const [px, pz] = bakeXZ([t.cx, t.yCerv, t.cz]);
    const crownH = Math.abs(tipLocal);
    manifest.teeth[t.fdi] = {
      mesh: `teeth/tooth_${t.fdi}.pmesh.json`,
      type: t.type,
      jaw: t.dir === 1 ? 'upper' : 'lower',
      dir: t.dir,
      cervicalMethod: t.method,
      crownH,
      pos: [px, t.dir * (TIP_OFFSET + crownH), pz],
      buccal: [t.buccal[0], t.buccal[1]],
      source: t.file,
    };
  }

  // ---- gingiva (global xz transform; vertical shifted so the donor's gum
  //      margins align with the regularized tooth cervicals)
  for (const [jaw, parsed] of Object.entries(gingivaParsed)) {
    const jawTeeth = Object.values(manifest.teeth).filter((t) => t.jaw === jaw && t.cervicalMethod !== 'extrapolated');
    // world-space delta that maps each donor cervical onto its regularized position
    const deltas = jawTeeth.map((t) => {
      const fdi = Number(Object.keys(manifest.teeth).find((k) => manifest.teeth[k] === t));
      return t.pos[1] - teeth[fdi].yCerv * MM_TO_WORLD;
    });
    const offsetYWorld = mean(deltas);
    const outVerts = parsed.scene.map(([x, y, z]) => [
      (x + offsetX) * MM_TO_WORLD,
      y * MM_TO_WORLD + offsetYWorld,
      (z + offsetZ) * MM_TO_WORLD,
    ]);
    // local wrap: shift the gum toward each tooth's regularized cervical so the
    // margin hugs the necks. Margin measured with the same seeded-window /
    // buccal-half semantics as detectCervical (robust to papilla + retromolar
    // verts); delta clamped to +/-0.07u, quadratic falloff within 0.16u.
    const jawDir = jaw === 'upper' ? 1 : -1;
    const wrapDeltas = [];
    for (const t of Object.values(manifest.teeth).filter((x) => x.jaw === jaw)) {
      const [cx, cy, cz] = t.pos;
      const near = outVerts.filter((v) => {
        const dx = v[0] - cx;
        const dz = v[2] - cz;
        return Math.hypot(dx, dz) <= 0.1 && dx * t.buccal[0] + dz * t.buccal[1] > 0.05 * 0.1 && Math.abs(v[1] - cy) <= 0.13;
      });
      if (near.length < 4) continue;
      const sorted = near.map((v) => v[1]).sort((a, b) => a - b);
      const margin = jawDir === 1 ? percentile(sorted, 0.2) : percentile(sorted, 0.8);
      const delta = Math.max(-0.07, Math.min(0.07, cy - margin));
      if (Math.abs(delta) > 0.002) wrapDeltas.push({ cx, cz, delta });
    }
    if (wrapDeltas.length > 0) {
      for (const v of outVerts) {
        let bestD = Infinity;
        let bestDelta = 0;
        for (const w of wrapDeltas) {
          const d = Math.hypot(v[0] - w.cx, v[2] - w.cz);
          if (d < bestD) {
            bestD = d;
            bestDelta = w.delta;
          }
        }
        if (bestD < 0.24) v[1] += bestDelta * 0.9 * (1 - bestD / 0.24) ** 2;
      }
    }
    const outNormals = parsed.normals.map((n) => {
      const [x, y, z] = axisMap(n);
      const len = Math.hypot(x, y, z) || 1;
      return [x / len, y / len, z / len];
    });
    writeMesh(join(OUT_DIR, `gingiva_${jaw}.pmesh.json`), outVerts, outNormals, parsed.faces.map((tri) => tri.map(([vi]) => vi)));
    manifest.gingiva[jaw] = {
      mesh: `gingiva_${jaw}.pmesh.json`,
      source: GINGIVA_FILES[jaw],
      pos: [0, 0, 0],
      offsetY: Number(offsetYWorld.toFixed(4)),
    };
  }

  // ---- wisdom slots reuse the adjacent second molar mesh, extrapolated along the arch
  for (const [fdiStr, src] of Object.entries(WISDOM_SOURCE)) {
    const fdi = Number(fdiStr);
    const p = manifest.teeth[src];
    const prev = manifest.teeth[src - 1]; // tooth mesial of the second molar
    manifest.teeth[fdi] = {
      ...p,
      type: 'molar',
      dir: fdi < 30 ? 1 : -1,
      cervicalMethod: 'extrapolated',
      crownH: p.crownH * 0.94,
      pos: [p.pos[0] + (p.pos[0] - prev.pos[0]) * 0.55, p.pos[1], p.pos[2] + (p.pos[2] - prev.pos[2]) * 0.55],
      scale: 0.94,
      source: `reuse of ${p.source}`,
    };
  }

  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${Object.keys(manifest.teeth).length} tooth entries + gingiva to ${OUT_DIR}`);
}

main();
