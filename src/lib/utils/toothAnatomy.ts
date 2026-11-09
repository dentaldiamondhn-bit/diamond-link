import { FDIToothNumber } from '@/lib/types/clinical';

export type ToothClass =
  | 'central-incisor'
  | 'lateral-incisor'
  | 'canine'
  | 'first-premolar'
  | 'second-premolar'
  | 'first-molar'
  | 'second-molar'
  | 'third-molar';

export type ToothView = 'buccal' | 'oral';

const TOOTH_CLASS_BY_FDI: Partial<Record<FDIToothNumber, ToothClass>> = {
  11: 'central-incisor', 21: 'central-incisor', 31: 'central-incisor', 41: 'central-incisor',
  12: 'lateral-incisor', 22: 'lateral-incisor', 32: 'lateral-incisor', 42: 'lateral-incisor',
  13: 'canine', 23: 'canine', 33: 'canine', 43: 'canine',
  14: 'first-premolar', 24: 'first-premolar', 34: 'first-premolar', 44: 'first-premolar',
  15: 'second-premolar', 25: 'second-premolar', 35: 'second-premolar', 45: 'second-premolar',
  16: 'first-molar', 26: 'first-molar', 36: 'first-molar', 46: 'first-molar',
  17: 'second-molar', 27: 'second-molar', 37: 'second-molar', 47: 'second-molar',
  18: 'third-molar', 28: 'third-molar', 38: 'third-molar', 48: 'third-molar',
};

export function getToothClass(tooth: FDIToothNumber): ToothClass {
  return TOOTH_CLASS_BY_FDI[tooth] ?? 'central-incisor';
}

export function isUpperTooth(tooth: FDIToothNumber): boolean {
  return tooth >= 11 && tooth <= 28;
}

export function isLeftTooth(tooth: FDIToothNumber): boolean {
  return (tooth >= 21 && tooth <= 28) || (tooth >= 31 && tooth <= 38);
}

export interface ToothDimensions {
  crownHalfWidth: number;
  crownHeight: number;
  rootLength: number;
  rootWidth: number;
}

const DIMENSIONS: Record<ToothClass, ToothDimensions> = {
  'central-incisor': { crownHalfWidth: 40, crownHeight: 58, rootLength: 92, rootWidth: 16 },
  'lateral-incisor': { crownHalfWidth: 34, crownHeight: 52, rootLength: 86, rootWidth: 15 },
  canine: { crownHalfWidth: 38, crownHeight: 66, rootLength: 110, rootWidth: 18 },
  'first-premolar': { crownHalfWidth: 42, crownHeight: 50, rootLength: 82, rootWidth: 17 },
  'second-premolar': { crownHalfWidth: 44, crownHeight: 52, rootLength: 84, rootWidth: 18 },
  'first-molar': { crownHalfWidth: 56, crownHeight: 52, rootLength: 76, rootWidth: 20 },
  'second-molar': { crownHalfWidth: 52, crownHeight: 50, rootLength: 72, rootWidth: 19 },
  'third-molar': { crownHalfWidth: 46, crownHeight: 46, rootLength: 64, rootWidth: 17 },
};

export function getToothDimensions(tooth: FDIToothNumber): ToothDimensions {
  return DIMENSIONS[getToothClass(tooth)];
}

// ── Crown path builders ──────────────────────────────────────────────────────

export function buildCrownPath(tooth: FDIToothNumber): string {
  const cls = getToothClass(tooth);
  const d = getToothDimensions(tooth);
  const w = d.crownHalfWidth;
  const h = d.crownHeight;


  switch (cls) {
    case 'central-incisor':
    case 'lateral-incisor': {
      // Flat incisal edge with rounded mesial/distal corners
      const iw = w * 0.92;
      const neck = w * 0.98;
      const edgeDip = cls === 'central-incisor' ? 1.5 : 2.5;
      return [
        `M ${-w} 0`,
        `C ${-neck} ${h * 0.28} ${-w * 0.92} ${h * 0.72} ${-iw} ${h - edgeDip}`,
        `L ${-iw * 0.3} ${h}`,
        `L ${iw * 0.3} ${h}`,
        `C ${iw * 0.92} ${h * 0.72} ${neck} ${h * 0.28} ${w} 0`,
        'Z',
      ].join(' ');
    }

    case 'canine': {
      // Pointed cusp crown
      const tip = w * 0.08;
      const neck = w * 0.96;
      return [
        `M ${-w} 0`,
        `C ${-neck} ${h * 0.25} ${-w * 0.7} ${h * 0.6} ${-tip} ${h}`,
        `L 0 ${h + 4}`,
        `L ${tip} ${h}`,
        `C ${w * 0.7} ${h * 0.6} ${neck} ${h * 0.25} ${w} 0`,
        'Z',
      ].join(' ');
    }

    case 'first-premolar':
    case 'second-premolar': {
      // Bicuspid crown with two cusps
      const cuspW = w * 0.38;
      const neck = w * 0.97;
      const buccalCusp = h;
      const palatalCusp = h - 6;
      return [
        `M ${-w} 0`,
        `C ${-neck} ${h * 0.25} ${-w * 0.85} ${h * 0.55} ${-cuspW} ${buccalCusp}`,
        `L 0 ${palatalCusp}`,
        `L ${cuspW} ${buccalCusp}`,
        `C ${w * 0.85} ${h * 0.55} ${neck} ${h * 0.25} ${w} 0`,
        'Z',
      ].join(' ');
    }

    case 'first-molar':
    case 'second-molar':
    case 'third-molar': {
      // Wide multi-cusp crown (4 cusps) with occlusal table
      const cuspW = w * 0.35;
      const neck = w * 0.98;
      const buccalCuspH = h;
      const palatalCuspH = h - 3;
      const centralFossa = h - 10;
      return [
        `M ${-w} 0`,
        `C ${-neck} ${h * 0.22} ${-w * 0.9} ${h * 0.5} ${-cuspW * 1.6} ${buccalCuspH}`,
        `L ${-cuspW * 0.5} ${centralFossa}`,
        `L 0 ${palatalCuspH}`,
        `L ${cuspW * 0.5} ${centralFossa}`,
        `L ${cuspW * 1.6} ${buccalCuspH}`,
        `C ${w * 0.9} ${h * 0.5} ${neck} ${h * 0.22} ${w} 0`,
        'Z',
      ].join(' ');
    }

    default: {
      const iw = w * 0.9;
      return [
        `M ${-w} 0`,
        `C ${-w * 0.95} ${h * 0.3} ${-w * 0.9} ${h * 0.7} ${-iw * 0.5} ${h}`,
        `L ${iw * 0.5} ${h}`,
        `C ${w * 0.9} ${h * 0.7} ${w * 0.95} ${h * 0.3} ${w} 0`,
        'Z',
      ].join(' ');
    }
  }
}

// ── Root path builders ───────────────────────────────────────────────────────

export function buildRootPaths(tooth: FDIToothNumber, view: ToothView): string[] {
  const cls = getToothClass(tooth);
  const d = getToothDimensions(tooth);
  const w = d.rootWidth;
  const len = d.rootLength;

  switch (cls) {
    case 'central-incisor':
    case 'lateral-incisor':
      return [singleRoot(0, w, len, 0)];

    case 'canine':
      return [singleRoot(0, w + 2, len + 14, 0)];

    case 'first-premolar':
    case 'second-premolar':
      return bifurcatedRoots(w, len);

    case 'first-molar':
    case 'second-molar':
    case 'third-molar':
      if (isUpperTooth(tooth)) {
        return trifurcatedRoots(w, len, view);
      }
      return bifurcatedMolarRoots(w, len);

    default:
      return [singleRoot(0, w, len, 0)];
  }
}

function singleRoot(offset: number, width: number, length: number, curve: number): string {
  const tipX = offset + curve;
  const ctrlX = offset + curve * 0.3;
  const w = width;
  return [
    `M ${offset - w} 0`,
    `C ${offset - w * 0.85} ${-length * 0.3} ${ctrlX - w * 0.4} ${-length * 0.75} ${tipX} ${-length}`,
    `C ${ctrlX + w * 0.4} ${-length * 0.75} ${offset + w * 0.85} ${-length * 0.3} ${offset + w} 0`,
    'Z',
  ].join(' ');
}

function bifurcatedRoots(width: number, length: number): string[] {
  const w = width;
  const halfLen = length * 0.55;
  const tipOffset = width * 1.6;
  // Trunk
  const trunk = [
    `M ${-w * 1.3} 0`,
    `C ${-w * 1.1} ${-halfLen * 0.4} ${-w * 0.6} ${-halfLen * 0.8} ${-w * 0.3} ${-halfLen}`,
    `L ${w * 0.3} ${-halfLen}`,
    `C ${w * 0.6} ${-halfLen * 0.8} ${w * 1.1} ${-halfLen * 0.4} ${w * 1.3} 0`,
    'Z',
  ].join(' ');
  // Left root
  const leftRoot = [
    `M ${-w * 0.3} ${-halfLen}`,
    `C ${-tipOffset * 0.6} ${-halfLen - (length - halfLen) * 0.4} ${-tipOffset} ${-halfLen - (length - halfLen) * 0.8} ${-tipOffset} ${-length}`,
    `C ${-tipOffset * 0.4} ${-halfLen - (length - halfLen) * 0.8} ${-w * 0.1} ${-halfLen - (length - halfLen) * 0.4} ${w * 0.1} ${-halfLen}`,
    'Z',
  ].join(' ');
  // Right root
  const rightRoot = [
    `M ${w * 0.3} ${-halfLen}`,
    `C ${tipOffset * 0.6} ${-halfLen - (length - halfLen) * 0.4} ${tipOffset} ${-halfLen - (length - halfLen) * 0.8} ${tipOffset} ${-length}`,
    `C ${tipOffset * 0.4} ${-halfLen - (length - halfLen) * 0.8} ${w * 0.1} ${-halfLen - (length - halfLen) * 0.4} ${-w * 0.1} ${-halfLen}`,
    'Z',
  ].join(' ');
  return [trunk, leftRoot, rightRoot];
}

function bifurcatedMolarRoots(width: number, length: number): string[] {
  const w = width;
  const trunkLen = length * 0.35;
  const rootLen = length - trunkLen;
  const spread = w * 2.2;
  // Trunk
  const trunk = [
    `M ${-w * 1.6} 0`,
    `C ${-w * 1.4} ${-trunkLen * 0.4} ${-w * 0.8} ${-trunkLen * 0.8} ${-w * 0.4} ${-trunkLen}`,
    `L ${w * 0.4} ${-trunkLen}`,
    `C ${w * 0.8} ${-trunkLen * 0.8} ${w * 1.4} ${-trunkLen * 0.4} ${w * 1.6} 0`,
    'Z',
  ].join(' ');
  // Mesial root
  const mesial = [
    `M ${-w * 0.4} ${-trunkLen}`,
    `C ${-spread * 0.5} ${-trunkLen - rootLen * 0.35} ${-spread} ${-trunkLen - rootLen * 0.75} ${-spread} ${-length}`,
    `C ${-spread * 0.6} ${-trunkLen - rootLen * 0.75} ${-w * 0.1} ${-trunkLen - rootLen * 0.35} ${w * 0.1} ${-trunkLen}`,
    'Z',
  ].join(' ');
  // Distal root
  const distal = [
    `M ${w * 0.4} ${-trunkLen}`,
    `C ${spread * 0.5} ${-trunkLen - rootLen * 0.35} ${spread} ${-trunkLen - rootLen * 0.75} ${spread} ${-length}`,
    `C ${spread * 0.6} ${-trunkLen - rootLen * 0.75} ${w * 0.1} ${-trunkLen - rootLen * 0.35} ${-w * 0.1} ${-trunkLen}`,
    'Z',
  ].join(' ');
  return [trunk, mesial, distal];
}

function trifurcatedRoots(width: number, length: number, view: ToothView): string[] {
  const w = width;
  const trunkLen = length * 0.28;
  const rootLen = length - trunkLen;
  const isOral = view === 'oral';

  if (isOral) {
    // Palatal root (single, prominent) for oral view
    return [singleRoot(0, w * 1.4, length, 0)];
  }

  // Buccal view: MB and DB roots with furcation notch
  const spread = w * 1.9;
  const trunk = [
    `M ${-w * 1.8} 0`,
    `C ${-w * 1.5} ${-trunkLen * 0.4} ${-w * 0.9} ${-trunkLen * 0.85} ${-w * 0.4} ${-trunkLen}`,
    `L ${w * 0.4} ${-trunkLen}`,
    `C ${w * 0.9} ${-trunkLen * 0.85} ${w * 1.5} ${-trunkLen * 0.4} ${w * 1.8} 0`,
    'Z',
  ].join(' ');
  // Mesial root
  const mesial = [
    `M ${-w * 0.4} ${-trunkLen}`,
    `C ${-spread * 0.45} ${-trunkLen - rootLen * 0.3} ${-spread} ${-trunkLen - rootLen * 0.7} ${-spread} ${-length}`,
    `C ${-spread * 0.5} ${-trunkLen - rootLen * 0.7} ${-w * 0.1} ${-trunkLen - rootLen * 0.3} ${w * 0.1} ${-trunkLen}`,
    'Z',
  ].join(' ');
  // Distal root
  const distal = [
    `M ${w * 0.4} ${-trunkLen}`,
    `C ${spread * 0.45} ${-trunkLen - rootLen * 0.3} ${spread} ${-trunkLen - rootLen * 0.7} ${spread} ${-length}`,
    `C ${spread * 0.5} ${-trunkLen - rootLen * 0.7} ${w * 0.1} ${-trunkLen - rootLen * 0.3} ${-w * 0.1} ${-trunkLen}`,
    'Z',
  ].join(' ');
  return [trunk, mesial, distal];
}

// ── Public API (kept compatible with existing callers) ────────────────────────

export function getCrownPath(tooth: FDIToothNumber): string {
  return buildCrownPath(tooth);
}

export function getRootPaths(tooth: FDIToothNumber, view: ToothView): string[] {
  return buildRootPaths(tooth, view);
}

export function getToothSpread(tooth: FDIToothNumber): number {
  return getToothDimensions(tooth).crownHalfWidth * 0.78;
}

export function getToothRootLength(tooth: FDIToothNumber): number {
  return getToothDimensions(tooth).rootLength;
}

export function getToothTemplate(tooth: FDIToothNumber) {
  const d = getToothDimensions(tooth);
  return {
    class: getToothClass(tooth),
    crownHalfWidth: d.crownHalfWidth,
    crownHeight: d.crownHeight,
    incisalRatio: 0.8,
    roots: [{ offset: 0, width: d.rootWidth, length: d.rootLength, curve: 0, views: ['buccal' as ToothView, 'oral' as ToothView] }],
  };
}
