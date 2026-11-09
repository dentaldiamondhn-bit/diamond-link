import { FDIToothNumber, SurfaceId, FurcationSite } from '@/lib/types/clinical';

export const BUCCAL_SURFACES: SurfaceId[] = ['mb', 'b', 'db'];
export const ORAL_SURFACES_UPPER: SurfaceId[] = ['mp', 'p', 'dp'];
export const ORAL_SURFACES_LOWER: SurfaceId[] = ['ml', 'l', 'dl'];

export function getBuccalSurfaces(tooth: FDIToothNumber): SurfaceId[] {
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
  return isRight ? ['db', 'b', 'mb'] : ['mb', 'b', 'db'];
}

export function getOralSurfaces(tooth: FDIToothNumber): SurfaceId[] {
  const isUpper = tooth >= 11 && tooth <= 28;
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);

  if (isUpper) {
    return isRight ? ['mp', 'p', 'dp'] : ['dp', 'p', 'mp'];
  } else {
    return isRight ? ['dl', 'l', 'ml'] : ['ml', 'l', 'dl'];
  }
}

export function getAllSurfacesForTooth(tooth: FDIToothNumber): SurfaceId[] {
  return [...getBuccalSurfaces(tooth), ...getOralSurfaces(tooth)];
}

export type TableSiteSurfaces = {
  vestibular: [SurfaceId, SurfaceId, SurfaceId];
  palatino: [SurfaceId, SurfaceId, SurfaceId];
};

export function getTableSiteSurfaces(tooth: FDIToothNumber): TableSiteSurfaces {
  return {
    vestibular: ['mb', 'b', 'db'],
    palatino: isUpperJaw(tooth) ? ['mp', 'p', 'dp'] : ['ml', 'l', 'dl'],
  };
}

export const FURCATION_SITES_UPPER: Partial<Record<FDIToothNumber, FurcationSite[]>> = {
  18: ['b', 'dp', 'mp'], 17: ['b', 'dp', 'mp'], 16: ['b', 'dp', 'mp'],
  15: ['dp', 'mp'], 14: ['dp', 'mp'], 13: [], 12: [], 11: [],
  21: [], 22: [], 23: [], 24: ['dp', 'mp'], 25: ['dp', 'mp'],
  26: ['b', 'dp', 'mp'], 27: ['b', 'dp', 'mp'], 28: ['b', 'dp', 'mp'],
};

export const FURCATION_SITES_LOWER: Partial<Record<FDIToothNumber, FurcationSite[]>> = {
  48: ['b', 'l'], 47: ['b', 'l'], 46: ['b', 'l'],
  45: [], 44: [], 43: [], 42: [], 41: [],
  31: [], 32: [], 33: [], 34: [], 35: [],
  36: ['b', 'l'], 37: ['b', 'l'], 38: ['b', 'l'],
};

export function getFurcationSitesForTooth(tooth: FDIToothNumber): FurcationSite[] {
  const isUpper = tooth >= 11 && tooth <= 28;
  return isUpper
    ? (FURCATION_SITES_UPPER[tooth] || [])
    : (FURCATION_SITES_LOWER[tooth] || []);
}

export function isUpperJaw(tooth: FDIToothNumber): boolean {
  return tooth >= 11 && tooth <= 28;
}

export function isLowerJaw(tooth: FDIToothNumber): boolean {
  return tooth >= 31 && tooth <= 48;
}

export function isRightSide(tooth: FDIToothNumber): boolean {
  return (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
}