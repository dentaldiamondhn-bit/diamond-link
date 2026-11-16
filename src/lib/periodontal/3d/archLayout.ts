/**
 * Shared conventions for the 3D periodontal viewer.
 *
 * All tooth/gingiva geometry comes from preprocessed BodyParts3D meshes under
 * /models/periodontal (see scripts/prepare-periodontal-3d-meshes.mjs and
 * INSTRUCTIONS.md section 20). This module no longer builds any procedural
 * tooth geometry; it only exposes FDI conventions, site angles and the
 * manifest schema.
 */

export type Jaw = 'upper' | 'lower';

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar';

export const MM_TO_WORLD = 0.032;

const SIDE_SIGN: Record<number, -1 | 1> = {
  1: -1,
  2: 1,
  3: 1,
  4: -1,
};

export function getQuadrant(tooth: number): number {
  return Math.floor(tooth / 10);
}

export function getJaw(tooth: number): Jaw {
  const q = getQuadrant(tooth);
  return q === 1 || q === 2 ? 'upper' : 'lower';
}

export function getToothKind(tooth: number): ToothKind {
  const unit = tooth % 10;
  if (unit <= 2) return 'incisor';
  if (unit === 3) return 'canine';
  if (unit <= 5) return 'premolar';
  return 'molar';
}

const BUCCAL_SITE_SPREAD = (24 * Math.PI) / 180;

export function getAnatomicalSites(tooth: number): string[] {
  const jaw = getJaw(tooth);
  const inner = jaw === 'upper' ? ['dp', 'p', 'mp'] : ['dl', 'l', 'ml'];
  return ['db', 'b', 'mb', ...inner];
}

/** Angle of a probing site around the tooth axis; buccal = local +z (yaw is
 *  baked into the meshes, so local +z always faces the buccal side). */
export function getSiteAngle(tooth: number, site: string): number {
  const jaw = getJaw(tooth);
  const side = SIDE_SIGN[getQuadrant(tooth)];
  const inner = jaw === 'upper' ? 'p' : 'l';
  const innerDistal = jaw === 'upper' ? 'dp' : 'dl';
  const innerMesial = jaw === 'upper' ? 'mp' : 'ml';
  if (site === 'b') return 0;
  if (site === 'db') return side * BUCCAL_SITE_SPREAD;
  if (site === 'mb') return -side * BUCCAL_SITE_SPREAD;
  if (site === inner) return Math.PI;
  if (site === innerDistal) return Math.PI - side * BUCCAL_SITE_SPREAD;
  if (site === innerMesial) return Math.PI + side * BUCCAL_SITE_SPREAD;
  return 0;
}

export interface ToothManifestEntry {
  mesh: string;
  type: ToothKind;
  jaw: Jaw;
  dir: 1 | -1;
  cervicalMethod: 'gingiva-margin' | 'fraction' | 'extrapolated';
  crownH: number;
  pos: [number, number, number];
  buccal: [number, number];
  scale?: number;
  source: string;
}

export interface GingivaManifestEntry {
  mesh: string;
  source: string;
  pos: [number, number, number];
  offsetY: number;
}

export interface PeriodontalManifest {
  generator: string;
  source: string;
  mmToWorld: number;
  teeth: Record<string, ToothManifestEntry>;
  gingiva: Record<Jaw, GingivaManifestEntry>;
}
