import * as THREE from 'three';
import type { PeriodontalManifest, ToothManifestEntry } from './archLayout';

export const MESH_BASE_PATH = '/models/periodontal';

export interface LoadedPeriodontalAssets {
  manifest: PeriodontalManifest;
  toothGeometryByMesh: Map<string, THREE.BufferGeometry>;
  gingivaGeometry: Record<'upper' | 'lower', THREE.BufferGeometry | null>;
}

let assetsPromise: Promise<LoadedPeriodontalAssets> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return (await response.json()) as T;
}

/** Parses a .pmesh.json payload ({p, n, c?, f}) into a BufferGeometry. */
export function pmeshToBufferGeometry(data: { p: number[]; n: number[]; c?: number[]; f: number[] }): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.p, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.n, 3));
  if (data.c && data.c.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.c, 3));
  }
  geometry.setIndex(data.f);
  geometry.computeBoundingSphere();
  return geometry;
}

async function loadAll(): Promise<LoadedPeriodontalAssets> {
  const manifest = await fetchJson<PeriodontalManifest>(`${MESH_BASE_PATH}/manifest.json`);
  const toothGeometryByMesh = new Map<string, THREE.BufferGeometry>();
  const uniqueMeshPaths = [...new Set(Object.values(manifest.teeth).map(entry => entry.mesh))];
  await Promise.all(
    uniqueMeshPaths.map(async meshPath => {
      const data = await fetchJson<{ p: number[]; n: number[]; c?: number[]; f: number[] }>(
        `${MESH_BASE_PATH}/${meshPath}`
      );
      toothGeometryByMesh.set(meshPath, pmeshToBufferGeometry(data));
    })
  );
  const gingivaGeometry: Record<'upper' | 'lower', THREE.BufferGeometry | null> = { upper: null, lower: null };
  await Promise.all(
    (['upper', 'lower'] as const).map(async jaw => {
      const entry = manifest.gingiva[jaw];
      if (!entry) return;
      const data = await fetchJson<{ p: number[]; n: number[]; c?: number[]; f: number[] }>(
        `${MESH_BASE_PATH}/${entry.mesh}`
      );
      gingivaGeometry[jaw] = pmeshToBufferGeometry(data);
    })
  );
  return { manifest, toothGeometryByMesh, gingivaGeometry };
}

export function getToothGeometry(
  assets: LoadedPeriodontalAssets,
  entry: ToothManifestEntry
): THREE.BufferGeometry | null {
  return assets.toothGeometryByMesh.get(entry.mesh) ?? null;
}

export function loadPeriodontalAssets(): Promise<LoadedPeriodontalAssets> {
  if (!assetsPromise) {
    assetsPromise = loadAll().catch(error => {
      assetsPromise = null;
      throw error;
    });
  }
  return assetsPromise;
}
