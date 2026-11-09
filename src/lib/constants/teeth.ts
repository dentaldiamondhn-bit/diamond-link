import { FDIToothNumber, UniversalToothNumber } from '@/lib/types/clinical';
import { getAllSurfacesForTooth as getAllSurfacesForToothImpl, isUpperJaw, isLowerJaw, isRightSide } from './surfaces';

export const UPPER_TEETH: FDIToothNumber[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH: FDIToothNumber[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_TEETH: FDIToothNumber[] = [...UPPER_TEETH, ...LOWER_TEETH];

export const QUADRANT_TEETH: Record<number, FDIToothNumber[]> = {
  1: [18, 17, 16, 15, 14, 13, 12, 11],
  2: [21, 22, 23, 24, 25, 26, 27, 28],
  3: [38, 37, 36, 35, 34, 33, 32, 31],
  4: [41, 42, 43, 44, 45, 46, 47, 48],
};

export const UNIVERSAL_TO_FDI: Record<UniversalToothNumber, FDIToothNumber> = {
  1: 18, 2: 17, 3: 16, 4: 15, 5: 14, 6: 13, 7: 12, 8: 11,
  9: 21, 10: 22, 11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
  17: 48, 18: 47, 19: 46, 20: 45, 21: 44, 22: 43, 23: 42, 24: 41,
  25: 31, 26: 32, 27: 33, 28: 34, 29: 35, 30: 36, 31: 37, 32: 38,
};

export const FDI_TO_UNIVERSAL: Record<FDIToothNumber, UniversalToothNumber> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  48: 17, 47: 18, 46: 19, 45: 20, 44: 21, 43: 22, 42: 23, 41: 24,
  31: 25, 32: 26, 33: 27, 34: 28, 35: 29, 36: 30, 37: 31, 38: 32,
};

export function getQuadrant(tooth: FDIToothNumber): 1 | 2 | 3 | 4 {
  if (tooth >= 11 && tooth <= 18) return 1;
  if (tooth >= 21 && tooth <= 28) return 2;
  if (tooth >= 31 && tooth <= 38) return 3;
  return 4;
}

export { isUpperJaw, isLowerJaw, isRightSide };

export function getOpposingTooth(tooth: FDIToothNumber): FDIToothNumber {
  const opposites: Record<FDIToothNumber, FDIToothNumber> = {
    18: 48, 17: 47, 16: 46, 15: 45, 14: 44, 13: 43, 12: 42, 11: 41,
    21: 31, 22: 32, 23: 33, 24: 34, 25: 35, 26: 36, 27: 37, 28: 38,
    31: 21, 32: 22, 33: 23, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38,
    41: 11, 42: 12, 43: 13, 44: 14, 45: 15, 46: 16, 47: 17, 48: 18,
  };
  return opposites[tooth];
}

export function universalToFDI(universal: UniversalToothNumber): FDIToothNumber {
  return UNIVERSAL_TO_FDI[universal];
}

export function fdiToUniversal(fdi: FDIToothNumber): UniversalToothNumber {
  return FDI_TO_UNIVERSAL[fdi];
}

export function getAllSurfacesForTooth(tooth: FDIToothNumber) {
  return getAllSurfacesForToothImpl(tooth);
}