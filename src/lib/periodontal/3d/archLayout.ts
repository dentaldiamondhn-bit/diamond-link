import * as THREE from 'three';

export type Jaw = 'upper' | 'lower';

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar';

export interface ArchTransform {
  position: THREE.Vector3;
  rotationY: number;
}

export const MM_TO_WORLD = 0.032;

const ARCH_Y: Record<Jaw, number> = { upper: 0.52, lower: -0.52 };

const FAN_ANGLES = [0.1, 0.4, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5];

const A = 1.08;
const B = 1.0;
const UPPER_SCALE = 1.07;

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

export function getArchTransform(tooth: number): ArchTransform {
  const jaw = getJaw(tooth);
  const side = SIDE_SIGN[getQuadrant(tooth)];
  const theta = FAN_ANGLES[Math.abs(tooth % 10) - 1];
  const scale = jaw === 'upper' ? UPPER_SCALE : 1;
  const x = side * A * scale * Math.sin(theta);
  const z = -B * scale * (1 - Math.cos(theta));
  const rotationY = Math.atan2(side * A * scale * Math.sin(theta), B * scale * Math.cos(theta));
  return { position: new THREE.Vector3(x, ARCH_Y[jaw], z), rotationY };
}

export function getArchY(jaw: Jaw): number {
  return ARCH_Y[jaw];
}

export function getArchCurvePoints(jaw: Jaw): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const order = jaw === 'upper' ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] : [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  order.forEach(tooth => {
    points.push(getArchTransform(tooth).position);
  });
  return points;
}

const BUCCAL_SITE_SPREAD = THREE.MathUtils.degToRad(24);

export function getAnatomicalSites(tooth: number): string[] {
  const jaw = getJaw(tooth);
  const inner = jaw === 'upper' ? ['dp', 'p', 'mp'] : ['dl', 'l', 'ml'];
  return ['db', 'b', 'mb', ...inner];
}

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

const CROWN_HEIGHT = 0.2;
const ROOT_LENGTH = 0.34;

const CROWN_WIDTH: Record<ToothKind, number> = {
  incisor: 0.135,
  canine: 0.15,
  premolar: 0.16,
  molar: 0.21,
};

interface RootSpec {
  angle: number;
  radius: number;
  length: number;
}

function getRootSpecs(kind: ToothKind, jaw: Jaw, tooth: number): RootSpec[] {
  const side = SIDE_SIGN[getQuadrant(tooth)];
  const base = CROWN_WIDTH[kind] * 0.34;
  if (kind === 'molar') {
    if (jaw === 'upper') {
      return [
        { angle: -side * Math.PI * 0.22, radius: base * 0.85, length: ROOT_LENGTH },
        { angle: side * Math.PI * 0.22, radius: base * 0.85, length: ROOT_LENGTH },
        { angle: Math.PI, radius: base * 1.05, length: ROOT_LENGTH * 1.15 },
      ];
    }
    return [
      { angle: -side * Math.PI * 0.5, radius: base, length: ROOT_LENGTH },
      { angle: side * Math.PI * 0.5, radius: base, length: ROOT_LENGTH },
    ];
  }
  if (kind === 'premolar' && jaw === 'upper') {
    return [
      { angle: -BUCCAL_SITE_SPREAD, radius: base * 0.7, length: ROOT_LENGTH * 0.95 },
      { angle: BUCCAL_SITE_SPREAD, radius: base * 0.7, length: ROOT_LENGTH * 0.95 },
    ];
  }
  return [{ angle: 0, radius: base, length: kind === 'canine' ? ROOT_LENGTH * 1.15 : ROOT_LENGTH }];
}

const CROWN_GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();
const ROOT_GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

export function getCrownGeometry(kind: ToothKind, jaw: Jaw): THREE.BufferGeometry {
  const cacheKey = `${kind}_${jaw}`;
  const cached = CROWN_GEOMETRY_CACHE.get(cacheKey);
  if (cached) return cached;
  const w = CROWN_WIDTH[kind];
  const h = kind === 'incisor' ? CROWN_HEIGHT * 1.15 : CROWN_HEIGHT;
  const d = kind === 'molar' || kind === 'premolar' ? w * 0.88 : w * 0.72;
  const geometry = new THREE.SphereGeometry(0.5, 18, 14);
  geometry.scale(w, h, d);
  geometry.translate(0, jaw === 'upper' ? -h / 2 : h / 2, 0);
  CROWN_GEOMETRY_CACHE.set(cacheKey, geometry);
  return geometry;
}

export function getRootGeometry(spec: RootSpec, jaw: Jaw, kind: ToothKind): THREE.BufferGeometry {
  const cacheKey = `${jaw}_${kind}_${spec.angle.toFixed(3)}_${spec.radius.toFixed(3)}_${spec.length.toFixed(3)}`;
  const cached = ROOT_GEOMETRY_CACHE.get(cacheKey);
  if (cached) return cached;
  const geometry = new THREE.ConeGeometry(spec.radius, spec.length, 8);
  geometry.translate(0, spec.length / 2, 0);
  if (jaw === 'lower') {
    geometry.rotateX(Math.PI);
  }
  const baseRadius = CROWN_WIDTH[kind] * 0.36;
  geometry.translate(baseRadius * Math.sin(spec.angle), 0, baseRadius * Math.cos(spec.angle));
  ROOT_GEOMETRY_CACHE.set(cacheKey, geometry);
  return geometry;
}

export function getToothRootSpecs(tooth: number): RootSpec[] {
  return getRootSpecs(getToothKind(tooth), getJaw(tooth), tooth);
}

export function getCrownDimensions(kind: ToothKind): { width: number; height: number } {
  const w = CROWN_WIDTH[kind];
  const h = kind === 'incisor' ? CROWN_HEIGHT * 1.15 : CROWN_HEIGHT;
  return { width: w, height: h };
}

export function buildImplantFixtureGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.026, 0.032, ROOT_LENGTH * 0.62, 12);
  geometry.translate(0, ROOT_LENGTH * 0.31, 0);
  return geometry;
}

export function buildImplantThreadGeometry(index: number): THREE.BufferGeometry {
  const y = 0.035 + index * 0.045;
  const geometry = new THREE.TorusGeometry(0.031, 0.006, 6, 18);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

export function buildImplantAbutmentGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.018, 0.022, 0.07, 10);
  return geometry;
}

export function getRootLength(): number {
  return ROOT_LENGTH;
}
