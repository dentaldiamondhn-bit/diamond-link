import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MM_TO_WORLD,
  getAnatomicalSites,
  getSiteAngle,
  type GingivaManifestEntry,
  type ToothManifestEntry,
} from './archLayout';
import { getToothGeometry, loadPeriodontalAssets, type LoadedPeriodontalAssets } from './meshLoader';

export type CameraPresetKey = 'frontal' | 'superior' | 'inferior' | 'oclusal' | 'reset';

export interface ViewerToggles {
  translucentGums: boolean;
  pockets: boolean;
  bop: boolean;
  plaque: boolean;
}

export interface HoverInfo {
  tooth: number;
  x: number;
  y: number;
}

export type ChartRecord = Record<string, unknown>;

const CAMERA_PRESETS: Record<CameraPresetKey, { position: [number, number, number]; target: [number, number, number] }> = {
  frontal: { position: [0, 0.05, 2.7], target: [0, 0, -0.35] },
  superior: { position: [0, -2.5, 1.5], target: [0, 0.3, -0.35] },
  inferior: { position: [0, 2.5, 1.5], target: [0, -0.3, -0.35] },
  oclusal: { position: [0, 3.4, 1.1], target: [0, -0.2, -0.2] },
  reset: { position: [1.9, 1.2, 3.3], target: [0, 0, -0.25] },
};

const GUM_VIEW_DISTANCE = 0.24;

// vertexColors carries the CEJ gradient (crown ivory -> root dentin); DoubleSide is
// defense-in-depth: winding measured 100% outward-consistent, but belt-and-suspenders
const TOOTH_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.48, metalness: 0.03, side: THREE.DoubleSide });
const IMPLANT_CROWN_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xf8f7f2, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
const FIXTURE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xb8c2ce, roughness: 0.28, metalness: 0.92 });
const GUM_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xe0556e, roughness: 0.62, metalness: 0, transparent: true, opacity: 0.92 });
const POCKET_BOP_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff3b47, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
const POCKET_HEALTHY_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
const BOP_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff2440 });
const PLAQUE_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

function readNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isBinaryOn(value: unknown): boolean {
  return readNumber(value) === 1 || value === '1' || value === true;
}

/** A tooth is present unless explicitly marked absent ('0' / 0 / false).
 *  Missing flags (CHART_TEMPLATE, loaded/imported studies without tooth
 *  rows) must not hide the anatomy. */
function isToothPresent(value: unknown): boolean {
  if (value === '0' || value === 0 || value === false) return false;
  return true;
}

/** Small octahedron marker (custom BufferGeometry: no primitive classes). */
function buildMarkerGeometry(radius: number): THREE.BufferGeometry {
  const vertices = [
    [0, radius, 0], [0, -radius, 0],
    [radius, 0, 0], [-radius, 0, 0],
    [0, 0, radius], [0, 0, -radius],
  ];
  const faces = [
    [0, 4, 2], [0, 2, 5], [0, 5, 3], [0, 3, 4],
    [1, 2, 4], [1, 5, 2], [1, 3, 5], [1, 4, 3],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setIndex(faces.flat());
  geometry.computeVertexNormals();
  return geometry;
}

interface LatheSpec {
  profile: [number, number][];
  segments?: number;
}

function buildLathe(spec: LatheSpec): THREE.BufferGeometry {
  const points = spec.profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  return new THREE.LatheGeometry(points, spec.segments ?? 24);
}

function flipY(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.rotateX(Math.PI);
  return geometry;
}

interface GingivaDeform {
  basePositions: Float32Array;
  nearestTooth: Int32Array;
  nearestWeight: Float32Array;
}

class Periodontal3dViewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private staticGroup = new THREE.Group();
  private dynamicGroup = new THREE.Group();
  private pickables: THREE.Mesh[] = [];
  private rebuildDisposables: THREE.BufferGeometry[] = [];
  private markerGeometries: THREE.BufferGeometry[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerScreen = { x: 0, y: 0 };
  private pointerActive = false;
  private frameId = 0;
  private resizeObserver: ResizeObserver;
  private camGoal: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private toggles: ViewerToggles = { translucentGums: false, pockets: true, bop: true, plaque: false };
  private onHover: (info: HoverInfo | null) => void;
  private lastHoverTooth: number | null = null;
  private disposed = false;

  private assets: LoadedPeriodontalAssets | null = null;
  private assetsLoading: Promise<void> | null = null;
  private pendingData: ChartRecord | null = null;
  private toothEntryByFdi = new Map<number, ToothManifestEntry>();
  private siteAnchors = new Map<number, Map<string, { x: number; z: number; angle: number }>>();
  private gingivaDeform = new Map<'upper' | 'lower', GingivaDeform>();

  constructor(container: HTMLElement, onHover: (info: HoverInfo | null) => void) {
    this.container = container;
    this.onHover = onHover;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
    this.camera.position.set(...CAMERA_PRESETS.reset.position);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CAMERA_PRESETS.reset.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 12;
    this.controls.autoRotateSpeed = -0.8;
    this.controls.addEventListener('start', () => {
      this.camGoal = null;
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 5, 4);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
    fill.position.set(-3, 2, -4);
    this.scene.add(ambient, key, fill);

    const grid = new THREE.GridHelper(6, 12, 0x1e293b, 0x111827);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.35;
    grid.position.y = -1.05;
    this.scene.add(grid);

    this.scene.add(this.staticGroup, this.dynamicGroup);

    this.markerGeometries.push(buildMarkerGeometry(0.017), buildMarkerGeometry(0.012));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);

    this.animate();
  }

  /** Loads manifest + anatomical meshes (cached across instances). Must be
   *  awaited before the first meaningful updateData; pending data is applied
   *  automatically once loading completes. */
  loadAssets(): Promise<void> {
    if (this.assets) return Promise.resolve();
    if (!this.assetsLoading) {
      this.assetsLoading = loadPeriodontalAssets()
        .then(assets => {
          if (this.disposed) return;
          this.assets = assets;
          for (const [fdi, entry] of Object.entries(assets.manifest.teeth)) {
            this.toothEntryByFdi.set(Number(fdi), entry);
          }
          this.buildGingiva();
          this.computeSiteAnchors();
          const pending = this.pendingData;
          this.pendingData = null;
          if (pending) this.updateData(pending);
        })
        .catch(error => {
          this.assetsLoading = null;
          throw error;
        });
    }
    return this.assetsLoading;
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerScreen = { x: event.clientX, y: event.clientY };
    this.pointerActive = true;
  };

  private handlePointerLeave = (): void => {
    this.pointerActive = false;
    this.lastHoverTooth = null;
    this.onHover(null);
  };

  /** Static gingiva meshes + per-vertex nearest-tooth mapping for GM deformation. */
  private buildGingiva(): void {
    if (!this.assets) return;
    (['upper', 'lower'] as const).forEach(jaw => {
      const entry: GingivaManifestEntry | undefined = this.assets.manifest.gingiva[jaw];
      const geometry = this.assets.gingivaGeometry[jaw];
      if (!entry || !geometry) return;
      const mesh = new THREE.Mesh(geometry, GUM_MATERIAL);
      this.staticGroup.add(mesh);

      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      const basePositions = new Float32Array(position.array as Float32Array);
      const count = position.count;
      const nearestTooth = new Int32Array(count).fill(-1);
      const nearestWeight = new Float32Array(count);
      const jawTeeth = Object.entries(this.assets.manifest.teeth)
        .map(([fdi, t]) => ({ fdi: Number(fdi), t }))
        .filter(({ t }) => t.jaw === jaw);
      for (let i = 0; i < count; i++) {
        const x = basePositions[i * 3];
        const z = basePositions[i * 3 + 2];
        let bestFdi = -1;
        let bestD = Infinity;
        for (const { fdi, t } of jawTeeth) {
          const d = Math.hypot(x - t.pos[0], z - t.pos[2]);
          if (d < bestD) {
            bestD = d;
            bestFdi = fdi;
          }
        }
        if (bestFdi >= 0 && bestD < GUM_VIEW_DISTANCE) {
          nearestTooth[i] = bestFdi;
          nearestWeight[i] = (1 - bestD / GUM_VIEW_DISTANCE) ** 2;
        }
      }
      this.gingivaDeform.set(jaw, { basePositions, nearestTooth, nearestWeight });
    });
  }

  /** One-time raycast per tooth/site to find the crown-surface anchor point the
   *  data markers (pockets, BOP, plaque) attach to. */
  private computeSiteAnchors(): void {
    if (!this.assets) return;
    const raycaster = new THREE.Raycaster();
    for (const [fdiStr, entry] of Object.entries(this.assets.manifest.teeth)) {
      const tooth = Number(fdiStr);
      const geometry = getToothGeometry(this.assets, entry);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, TOOTH_MATERIAL);
      mesh.position.set(...entry.pos);
      if (entry.scale) mesh.scale.setScalar(entry.scale);
      mesh.updateMatrixWorld(true);

      const anchors = new Map<string, { x: number; z: number; angle: number }>();
      for (const site of getAnatomicalSites(tooth)) {
        const angle = getSiteAngle(tooth, site);
        const dx = Math.sin(angle);
        const dz = Math.cos(angle);
        const crownMidY = entry.pos[1] - entry.dir * entry.crownH * 0.5;
        raycaster.set(
          new THREE.Vector3(entry.pos[0] - dx * 0.03, crownMidY, entry.pos[2] - dz * 0.03),
          new THREE.Vector3(dx, 0, dz)
        );
        const hits = raycaster.intersectObject(mesh, false);
        const hit = hits.length > 0 ? hits[0].point : null;
        anchors.set(site, {
          x: hit ? hit.x : entry.pos[0] + dx * entry.crownH * 0.5,
          z: hit ? hit.z : entry.pos[2] + dz * entry.crownH * 0.5,
          angle,
        });
      }
      this.siteAnchors.set(tooth, anchors);
    }
  }

  /** Realistic threaded titanium implant built from lathe profiles:
   *  tapered self-tapping fixture + thread rings + abutment + crown. */
  private buildImplantParts(toothGroup: THREE.Group, dir: 1 | -1, crownH: number): THREE.Mesh {
    const fixtureLength = crownH * 1.5;
    const fixtureProfile: [number, number][] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      fixtureProfile.push([0.013 + 0.016 * t, t * fixtureLength]);
    }
    const fixtureGeometry = dir === 1 ? buildLathe({ profile: fixtureProfile }) : flipY(buildLathe({ profile: fixtureProfile }));
    this.rebuildDisposables.push(fixtureGeometry);
    const fixture = new THREE.Mesh(fixtureGeometry, FIXTURE_MATERIAL);
    toothGroup.add(fixture);

    const threadCount = 5;
    for (let i = 0; i < threadCount; i++) {
      const y = fixtureLength * (0.18 + (0.64 * i) / (threadCount - 1));
      const r = 0.013 + 0.016 * (y / fixtureLength);
      const threadProfile: [number, number][] = [
        [r + 0.001, 0],
        [r + 0.006, 0.005],
        [r + 0.001, 0.01],
      ];
      const threadGeometry = buildLathe({ profile: threadProfile, segments: 20 });
      this.rebuildDisposables.push(threadGeometry);
      const thread = new THREE.Mesh(threadGeometry, FIXTURE_MATERIAL);
      thread.position.y = dir === 1 ? y : -y;
      toothGroup.add(thread);
    }

    const abutmentProfile: [number, number][] = [
      [0.012, 0],
      [0.017, 0.035],
      [0.012, 0.07],
    ];
    const abutmentGeometry = dir === 1 ? flipY(buildLathe({ profile: abutmentProfile })) : buildLathe({ profile: abutmentProfile });
    this.rebuildDisposables.push(abutmentGeometry);
    toothGroup.add(new THREE.Mesh(abutmentGeometry, FIXTURE_MATERIAL));

    const h = crownH * 0.92;
    const crownProfile: [number, number][] = [
      [0.055, 0],
      [0.1, h * 0.15],
      [0.105, h * 0.45],
      [0.085, h * 0.75],
      [0.05, h],
    ];
    const crownGeometry = dir === 1 ? flipY(buildLathe({ profile: crownProfile })) : buildLathe({ profile: crownProfile });
    this.rebuildDisposables.push(crownGeometry);
    const crown = new THREE.Mesh(crownGeometry, IMPLANT_CROWN_MATERIAL);
    toothGroup.add(crown);
    return crown;
  }

  updateData(chartData: ChartRecord): void {
    if (!this.assets) {
      this.pendingData = chartData;
      return;
    }
    this.clearDynamic();
    this.pickables = [];
    const inverted = Boolean(chartData.isGmInverted);

    // per-tooth mean gingival margin (world units) for gingiva deformation
    const marginByTooth = new Map<number, number>();
    for (const [fdiStr, entry] of this.toothEntryByFdi) {
      const sites = getAnatomicalSites(Number(fdiStr));
      let sum = 0;
      sites.forEach(site => {
        const gm = readNumber(chartData[`gm_${fdiStr}_${site}`]);
        sum += inverted ? gm : -gm;
      });
      marginByTooth.set(Number(fdiStr), (sum / sites.length) * entry.dir * MM_TO_WORLD);
    }
    this.applyGingivaDeformation(marginByTooth);

    for (let tooth = 11; tooth <= 48; tooth++) {
      const unit = tooth % 10;
      if (unit === 0 || unit > 8) continue;
      const quadrant = Math.floor(tooth / 10);
      if (quadrant === 0 || quadrant > 4) continue;

      const entry = this.toothEntryByFdi.get(tooth);
      if (!entry) continue;
      if (!isToothPresent(chartData[`tooth_${tooth}`])) continue;
      const implanted = readNumber(chartData[`implant_${tooth}`]) > 0;

      const toothGroup = new THREE.Group();
      toothGroup.position.set(...entry.pos);

      const dir: 1 | -1 = entry.dir;
      const sites = getAnatomicalSites(tooth);
      const anchors = this.siteAnchors.get(tooth);
      const ribbonWidth = Math.min(0.09, Math.max(0.05, entry.crownH * 0.3));

      let pickTarget: THREE.Mesh;
      if (implanted) {
        pickTarget = this.buildImplantParts(toothGroup, dir, entry.crownH);
      } else {
        const geometry = getToothGeometry(this.assets, entry);
        if (!geometry) continue;
        const mesh = new THREE.Mesh(geometry, TOOTH_MATERIAL);
        if (entry.scale) mesh.scale.setScalar(entry.scale);
        toothGroup.add(mesh);
        pickTarget = mesh;
      }
      pickTarget.userData.tooth = tooth;
      this.pickables.push(pickTarget);

      sites.forEach(site => {
        const gm = readNumber(chartData[`gm_${tooth}_${site}`]);
        const pd = readNumber(chartData[`pd_${tooth}_${site}`]);
        const bop = isBinaryOn(chartData[`bop_${tooth}_${site}`]);
        const plaque = isBinaryOn(chartData[`pi_${tooth}_${site}`]);
        const marginApical = inverted ? gm : -gm;
        const yGm = marginApical * dir * MM_TO_WORLD;
        const yAl = yGm + dir * pd * MM_TO_WORLD;
        const anchor = anchors?.get(site);
        if (!anchor) return;
        const ax = anchor.x - entry.pos[0];
        const az = anchor.z - entry.pos[2];
        const sinA = Math.sin(anchor.angle);
        const cosA = Math.cos(anchor.angle);

        if (this.toggles.pockets && pd > 0) {
          const half = ribbonWidth / 2;
          const y0 = Math.min(yGm, yAl);
          const y1 = Math.max(yGm, yAl);
          const quad = new THREE.BufferGeometry();
          quad.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
              [
                ax - cosA * half, y0, az + sinA * half,
                ax + cosA * half, y0, az - sinA * half,
                ax - cosA * half, y1, az + sinA * half,
                ax + cosA * half, y1, az - sinA * half,
              ],
              3
            )
          );
          quad.setIndex([0, 1, 2, 2, 1, 3]);
          this.rebuildDisposables.push(quad);
          const ribbon = new THREE.Mesh(quad, bop ? POCKET_BOP_MATERIAL : POCKET_HEALTHY_MATERIAL);
          toothGroup.add(ribbon);
        }

        if (this.toggles.bop && bop) {
          const dot = new THREE.Mesh(this.markerGeometries[0], BOP_MATERIAL);
          dot.position.set(ax + sinA * 0.006, yGm, az + cosA * 0.006);
          toothGroup.add(dot);
        }

        if (this.toggles.plaque && plaque) {
          const dot = new THREE.Mesh(this.markerGeometries[1], PLAQUE_MATERIAL);
          dot.position.set(ax + sinA * 0.01, yGm + dir * 0.015, az + cosA * 0.01);
          toothGroup.add(dot);
        }
      });

      this.dynamicGroup.add(toothGroup);
    }
  }

  /** Displaces gingiva vertices near each tooth by that tooth's mean margin
   *  (recession lifts the upper margin apically, lowers the lower one). */
  private applyGingivaDeformation(marginByTooth: Map<number, number>): void {
    (['upper', 'lower'] as const).forEach(jaw => {
      const deform = this.gingivaDeform.get(jaw);
      const geometry = this.assets?.gingivaGeometry[jaw];
      if (!deform || !geometry) return;
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = position.array as Float32Array;
      const { basePositions, nearestTooth, nearestWeight } = deform;
      for (let i = 0; i < nearestTooth.length; i++) {
        const tooth = nearestTooth[i];
        let y = basePositions[i * 3 + 1];
        if (tooth >= 0) {
          const margin = marginByTooth.get(tooth);
          if (margin != null) y += margin * nearestWeight[i];
        }
        array[i * 3 + 1] = y;
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }

  private clearDynamic(): void {
    this.rebuildDisposables.forEach(geometry => geometry.dispose());
    this.rebuildDisposables = [];
    this.dynamicGroup.clear();
  }

  applyToggles(toggles: ViewerToggles): void {
    this.toggles = toggles;
    GUM_MATERIAL.opacity = toggles.translucentGums ? 0.45 : 0.92;
  }

  setCameraPreset(key: CameraPresetKey): void {
    const preset = CAMERA_PRESETS[key];
    this.camGoal = {
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
    };
  }

  setAutoRotate(enabled: boolean): void {
    this.controls.autoRotate = enabled;
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);

    if (this.camGoal) {
      const posDone = this.camera.position.lerp(this.camGoal.position, 0.12).distanceTo(this.camGoal.position) < 0.005;
      const targetDone = this.controls.target.lerp(this.camGoal.target, 0.12).distanceTo(this.camGoal.target) < 0.005;
      if (posDone && targetDone) this.camGoal = null;
    }

    if (this.pointerActive) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      const tooth = hits.length > 0 ? (hits[0].object.userData.tooth as number | undefined) : null;
      if (tooth != null) {
        if (tooth !== this.lastHoverTooth) {
          this.lastHoverTooth = tooth;
          this.onHover({ tooth, x: this.pointerScreen.x, y: this.pointerScreen.y });
        }
      } else if (this.lastHoverTooth != null) {
        this.lastHoverTooth = null;
        this.onHover(null);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.controls.dispose();
    this.clearDynamic();
    this.markerGeometries.forEach(geometry => geometry.dispose());
    this.markerGeometries = [];
    this.assets = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export type Periodontal3dViewerInstance = Periodontal3dViewer;

export function createPeriodontal3dViewer(
  container: HTMLElement,
  onHover: (info: HoverInfo | null) => void
): Periodontal3dViewerInstance {
  return new Periodontal3dViewer(container, onHover);
}
