import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MM_TO_WORLD,
  buildImplantAbutmentGeometry,
  buildImplantFixtureGeometry,
  buildImplantThreadGeometry,
  getArchCurvePoints,
  getArchTransform,
  getAnatomicalSites,
  getCrownDimensions,
  getCrownGeometry,
  getJaw,
  getRootGeometry,
  getRootLength,
  getSiteAngle,
  getToothKind,
  getToothRootSpecs,
  type Jaw,
  type ToothKind,
} from './archLayout';

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
  frontal: { position: [0, 0.1, 4.8], target: [0, 0, 0] },
  superior: { position: [0, -2.1, 2.4], target: [0, 0.72, -0.05] },
  inferior: { position: [0, 2.1, 2.4], target: [0, -0.72, -0.05] },
  oclusal: { position: [0, 3.6, 1.2], target: [0, -0.3, 0] },
  reset: { position: [2.7, 1.8, 4.3], target: [0, 0.05, -0.1] },
};

const TOOTH_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: 0.5, metalness: 0.05 });
const IMPLANT_CROWN_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xf8f7f2, roughness: 0.4, metalness: 0.1 });
const FIXTURE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.35, metalness: 0.85 });
const GUM_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xe08a96, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.95 });
const POCKET_BOP_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff3b47, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
const POCKET_HEALTHY_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
const BOP_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff2440 });
const PLAQUE_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

function readNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isBinaryOn(value: unknown): boolean {
  return readNumber(value) === 1 || value === '1' || value === true;
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
  private staticDisposables: THREE.BufferGeometry[] = [];
  private rebuildDisposables: THREE.BufferGeometry[] = [];
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
    grid.position.y = -1.15;
    this.scene.add(grid);

    this.scene.add(this.staticGroup, this.dynamicGroup);
    this.buildGumBands();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);

    this.animate();
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

  private buildGumBands(): void {
    (['upper', 'lower'] as Jaw[]).forEach(jaw => {
      const curve = new THREE.CatmullRomCurve3(getArchCurvePoints(jaw));
      const geometry = new THREE.TubeGeometry(curve, 96, 0.075, 10, false);
      this.staticDisposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, GUM_MATERIAL);
      this.staticGroup.add(mesh);
    });
  }

  updateData(chartData: ChartRecord): void {
    this.clearDynamic();
    this.pickables = [];
    const inverted = Boolean(chartData.isGmInverted);

    for (let tooth = 11; tooth <= 48; tooth++) {
      const unit = tooth % 10;
      if (unit === 0 || unit > 8) continue;
      const quadrant = Math.floor(tooth / 10);
      if (quadrant === 0 || quadrant > 4) continue;

      if (!isBinaryOn(chartData[`tooth_${tooth}`])) continue;
      const implanted = readNumber(chartData[`implant_${tooth}`]) > 0;

      const transform = getArchTransform(tooth);
      const toothGroup = new THREE.Group();
      toothGroup.position.copy(transform.position);
      toothGroup.rotation.y = transform.rotationY;

      const jaw = getJaw(tooth);
      const dir = jaw === 'upper' ? 1 : -1;
      const kind = getToothKind(tooth);
      const { width } = getCrownDimensions(kind);
      const siteRadius = width * 0.5 * 1.02 + 0.006;
      const ribbonWidth = width * 0.42;
      const sites = getAnatomicalSites(tooth);

      let marginSum = 0;
      sites.forEach(site => {
        const gm = readNumber(chartData[`gm_${tooth}_${site}`]);
        marginSum += inverted ? gm : -gm;
      });
      const meanMargin = (marginSum / sites.length) * dir * MM_TO_WORLD;

      const gumRingGeometry = new THREE.TorusGeometry(width * 0.56, 0.042, 8, 24);
      gumRingGeometry.rotateX(Math.PI / 2);
      this.rebuildDisposables.push(gumRingGeometry);
      const gumRing = new THREE.Mesh(gumRingGeometry, GUM_MATERIAL);
      gumRing.position.y = meanMargin;
      toothGroup.add(gumRing);

      let crown: THREE.Mesh;
      if (implanted) {
        const fixtureGeometry = buildImplantFixtureGeometry();
        const abutmentGeometry = buildImplantAbutmentGeometry();
        this.rebuildDisposables.push(fixtureGeometry, abutmentGeometry);
        const fixture = new THREE.Mesh(fixtureGeometry, FIXTURE_MATERIAL);
        for (let i = 0; i < 4; i++) {
          const threadGeometry = buildImplantThreadGeometry(i);
          this.rebuildDisposables.push(threadGeometry);
          fixture.add(new THREE.Mesh(threadGeometry, FIXTURE_MATERIAL));
        }
        toothGroup.add(fixture);
        const abutment = new THREE.Mesh(abutmentGeometry, FIXTURE_MATERIAL);
        abutment.position.y = dir * (getRootLength() * 0.62 + 0.035);
        toothGroup.add(abutment);
        crown = new THREE.Mesh(getCrownGeometry(kind, jaw), IMPLANT_CROWN_MATERIAL);
        toothGroup.add(crown);
      } else {
        crown = new THREE.Mesh(getCrownGeometry(kind, jaw), TOOTH_MATERIAL);
        getToothRootSpecs(tooth).forEach(spec => {
          const rootGeometry = getRootGeometry(spec, jaw, kind);
          toothGroup.add(new THREE.Mesh(rootGeometry, TOOTH_MATERIAL));
        });
        toothGroup.add(crown);
      }
      crown.userData.tooth = tooth;
      this.pickables.push(crown);

      sites.forEach(site => {
        const gm = readNumber(chartData[`gm_${tooth}_${site}`]);
        const pd = readNumber(chartData[`pd_${tooth}_${site}`]);
        const bop = isBinaryOn(chartData[`bop_${tooth}_${site}`]);
        const plaque = isBinaryOn(chartData[`pi_${tooth}_${site}`]);
        const marginApical = inverted ? gm : -gm;
        const yGm = marginApical * dir * MM_TO_WORLD;
        const yAl = yGm + dir * pd * MM_TO_WORLD;
        const angle = getSiteAngle(tooth, site);

        if (this.toggles.pockets && pd > 0) {
          const ribbonGeometry = new THREE.PlaneGeometry(ribbonWidth, Math.abs(yAl - yGm));
          this.rebuildDisposables.push(ribbonGeometry);
          const ribbon = new THREE.Mesh(ribbonGeometry, bop ? POCKET_BOP_MATERIAL : POCKET_HEALTHY_MATERIAL);
          ribbon.position.set(siteRadius * Math.sin(angle), (yGm + yAl) / 2, siteRadius * Math.cos(angle));
          ribbon.rotation.y = angle;
          toothGroup.add(ribbon);
        }

        if (this.toggles.bop && bop) {
          const dotGeometry = new THREE.SphereGeometry(0.016, 8, 8);
          this.rebuildDisposables.push(dotGeometry);
          const dot = new THREE.Mesh(dotGeometry, BOP_MATERIAL);
          dot.position.set((siteRadius + 0.012) * Math.sin(angle), yGm, (siteRadius + 0.012) * Math.cos(angle));
          toothGroup.add(dot);
        }

        if (this.toggles.plaque && plaque) {
          const dotGeometry = new THREE.SphereGeometry(0.013, 8, 8);
          this.rebuildDisposables.push(dotGeometry);
          const dot = new THREE.Mesh(dotGeometry, PLAQUE_MATERIAL);
          dot.position.set((siteRadius + 0.02) * Math.sin(angle), yGm + dir * 0.014, (siteRadius + 0.02) * Math.cos(angle));
          toothGroup.add(dot);
        }
      });

      this.dynamicGroup.add(toothGroup);
    }
  }

  private clearDynamic(): void {
    this.rebuildDisposables.forEach(geometry => geometry.dispose());
    this.rebuildDisposables = [];
    this.dynamicGroup.clear();
  }

  applyToggles(toggles: ViewerToggles): void {
    this.toggles = toggles;
    GUM_MATERIAL.opacity = toggles.translucentGums ? 0.45 : 0.95;
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
    this.staticDisposables.forEach(geometry => geometry.dispose());
    this.staticDisposables = [];
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
