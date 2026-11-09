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

export interface RootSpec {
  offset: number;
  width: number;
  length: number;
  curve: number;
  views: ToothView[];
}

export interface ToothTemplate {
  class: ToothClass;
  crownHalfWidth: number;
  crownHeight: number;
  incisalRatio: number;
  roots: RootSpec[];
  lowerRoots?: RootSpec[];
}

const TEMPLATES: Record<ToothClass, ToothTemplate> = {
  'central-incisor': {
    class: 'central-incisor',
    crownHalfWidth: 42,
    crownHeight: 62,
    incisalRatio: 0.56,
    roots: [{ offset: 0, width: 18, length: 88, curve: 0, views: ['buccal', 'oral'] }],
  },
  'lateral-incisor': {
    class: 'lateral-incisor',
    crownHalfWidth: 36,
    crownHeight: 55,
    incisalRatio: 0.48,
    roots: [{ offset: 0, width: 16, length: 82, curve: 0, views: ['buccal', 'oral'] }],
  },
  canine: {
    class: 'canine',
    crownHalfWidth: 44,
    crownHeight: 68,
    incisalRatio: 0.2,
    roots: [{ offset: 0, width: 19, length: 100, curve: 0, views: ['buccal', 'oral'] }],
  },
  'first-premolar': {
    class: 'first-premolar',
    crownHalfWidth: 46,
    crownHeight: 52,
    incisalRatio: 0.68,
    roots: [{ offset: 0, width: 18, length: 80, curve: 7, views: ['buccal', 'oral'] }],
  },
  'second-premolar': {
    class: 'second-premolar',
    crownHalfWidth: 48,
    crownHeight: 54,
    incisalRatio: 0.72,
    roots: [{ offset: 0, width: 19, length: 84, curve: 4, views: ['buccal', 'oral'] }],
  },
  'first-molar': {
    class: 'first-molar',
    crownHalfWidth: 52,
    crownHeight: 54,
    incisalRatio: 0.84,
    roots: [
      { offset: -21, width: 20, length: 74, curve: -8, views: ['buccal'] },
      { offset: 21, width: 20, length: 74, curve: 8, views: ['buccal'] },
      { offset: 0, width: 24, length: 88, curve: 0, views: ['oral'] },
    ],
    lowerRoots: [
      { offset: -19, width: 22, length: 68, curve: -7, views: ['buccal', 'oral'] },
      { offset: 19, width: 22, length: 68, curve: 7, views: ['buccal', 'oral'] },
    ],
  },
  'second-molar': {
    class: 'second-molar',
    crownHalfWidth: 50,
    crownHeight: 52,
    incisalRatio: 0.84,
    roots: [
      { offset: -20, width: 19, length: 70, curve: -8, views: ['buccal'] },
      { offset: 20, width: 19, length: 70, curve: 8, views: ['buccal'] },
      { offset: 0, width: 23, length: 82, curve: 0, views: ['oral'] },
    ],
    lowerRoots: [
      { offset: -18, width: 21, length: 64, curve: -7, views: ['buccal', 'oral'] },
      { offset: 18, width: 21, length: 64, curve: 7, views: ['buccal', 'oral'] },
    ],
  },
  'third-molar': {
    class: 'third-molar',
    crownHalfWidth: 44,
    crownHeight: 46,
    incisalRatio: 0.78,
    roots: [
      { offset: -17, width: 16, length: 60, curve: -6, views: ['buccal', 'oral'] },
      { offset: 17, width: 16, length: 60, curve: 6, views: ['buccal', 'oral'] },
      { offset: 0, width: 19, length: 66, curve: 0, views: ['oral'] },
    ],
    lowerRoots: [
      { offset: -16, width: 17, length: 54, curve: -5, views: ['buccal', 'oral'] },
      { offset: 16, width: 17, length: 54, curve: 5, views: ['buccal', 'oral'] },
    ],
  },
};

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

export function getToothTemplate(tooth: FDIToothNumber): ToothTemplate {
  return TEMPLATES[getToothClass(tooth)];
}

export function isUpperTooth(tooth: FDIToothNumber): boolean {
  return tooth >= 11 && tooth <= 28;
}

export function buildCrownPath(template: ToothTemplate): string {
  const w = template.crownHalfWidth;
  const h = template.crownHeight;
  const iw = w * template.incisalRatio;
  const neck = w * 0.99;

  return [
    `M ${(-w).toFixed(1)} 0`,
    `C ${(-neck).toFixed(1)} ${(h * 0.26).toFixed(1)} ${(-w * 0.82).toFixed(1)} ${(h * 0.68).toFixed(1)} ${(-iw).toFixed(1)} ${h.toFixed(1)}`,
    `L ${iw.toFixed(1)} ${h.toFixed(1)}`,
    `C ${(w * 0.82).toFixed(1)} ${(h * 0.68).toFixed(1)} ${neck.toFixed(1)} ${(h * 0.26).toFixed(1)} ${w.toFixed(1)} 0`,
    'Z',
  ].join(' ');
}

export function buildRootPath(root: RootSpec): string {
  const tipX = root.offset + root.curve;
  const ctrlX = root.offset + root.curve * 0.35;
  const len = root.length;

  return [
    `M ${(root.offset - root.width).toFixed(1)} 0`,
    `C ${(root.offset - root.width * 0.97).toFixed(1)} ${(-len * 0.34).toFixed(1)} ${(ctrlX - root.width * 0.52).toFixed(1)} ${(-len * 0.78).toFixed(1)} ${tipX.toFixed(1)} ${(-len).toFixed(1)}`,
    `C ${(ctrlX + root.width * 0.52).toFixed(1)} ${(-len * 0.78).toFixed(1)} ${(root.offset + root.width * 0.97).toFixed(1)} ${(-len * 0.34).toFixed(1)} ${(root.offset + root.width).toFixed(1)} 0`,
    'Z',
  ].join(' ');
}

export function getRootPaths(tooth: FDIToothNumber, view: ToothView): string[] {
  const template = getToothTemplate(tooth);
  const roots = !isUpperTooth(tooth) && template.lowerRoots ? template.lowerRoots : template.roots;
  return roots
    .filter(root => root.views.includes(view))
    .map(root => buildRootPath(root));
}

export function getCrownPath(tooth: FDIToothNumber): string {
  return buildCrownPath(getToothTemplate(tooth));
}

export function getToothSpread(tooth: FDIToothNumber): number {
  return getToothTemplate(tooth).crownHalfWidth * 0.78;
}

export function getToothRootLength(tooth: FDIToothNumber): number {
  const roots = getToothTemplate(tooth).roots;
  return roots.reduce((max, root) => Math.max(max, root.length), 0);
}
