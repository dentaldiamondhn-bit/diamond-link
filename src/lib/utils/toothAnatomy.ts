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
