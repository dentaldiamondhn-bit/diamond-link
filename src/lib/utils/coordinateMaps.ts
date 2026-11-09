import { FDIToothNumber, SurfaceId } from '@/lib/types/clinical';

export const POLYGON_SCALE = 6.45;

export const SVG_VIEWBOX_WIDTH = 1800;
export const SVG_VIEWBOX_HEIGHT = 400;

export const SURFACE_WIDTH = 20;
export const SURFACE_HEIGHT = 240;

export const X_COORDINATES: Record<FDIToothNumber, Record<SurfaceId, number>> = {
  18: { mb: 45, b: 65, db: 85, mp: 45, p: 65, dp: 85, ml: 0, l: 0, dl: 0 },
  17: { mb: 155, b: 175, db: 195, mp: 155, p: 175, dp: 195, ml: 0, l: 0, dl: 0 },
  16: { mb: 265, b: 285, db: 305, mp: 265, p: 285, dp: 305, ml: 0, l: 0, dl: 0 },
  15: { mb: 375, b: 395, db: 415, mp: 375, p: 395, dp: 415, ml: 0, l: 0, dl: 0 },
  14: { mb: 485, b: 505, db: 525, mp: 485, p: 505, dp: 525, ml: 0, l: 0, dl: 0 },
  13: { mb: 595, b: 615, db: 635, mp: 595, p: 615, dp: 635, ml: 0, l: 0, dl: 0 },
  12: { mb: 705, b: 725, db: 745, mp: 705, p: 725, dp: 745, ml: 0, l: 0, dl: 0 },
  11: { mb: 815, b: 835, db: 855, mp: 815, p: 835, dp: 855, ml: 0, l: 0, dl: 0 },
  21: { mb: 885, b: 905, db: 925, mp: 885, p: 905, dp: 925, ml: 0, l: 0, dl: 0 },
  22: { mb: 995, b: 1015, db: 1035, mp: 995, p: 1015, dp: 1035, ml: 0, l: 0, dl: 0 },
  23: { mb: 1105, b: 1125, db: 1145, mp: 1105, p: 1125, dp: 1145, ml: 0, l: 0, dl: 0 },
  24: { mb: 1215, b: 1235, db: 1255, mp: 1215, p: 1235, dp: 1255, ml: 0, l: 0, dl: 0 },
  25: { mb: 1325, b: 1345, db: 1365, mp: 1325, p: 1345, dp: 1365, ml: 0, l: 0, dl: 0 },
  26: { mb: 1435, b: 1455, db: 1475, mp: 1435, p: 1455, dp: 1475, ml: 0, l: 0, dl: 0 },
  27: { mb: 1545, b: 1565, db: 1585, mp: 1545, p: 1565, dp: 1585, ml: 0, l: 0, dl: 0 },
  28: { mb: 1655, b: 1675, db: 1695, mp: 1655, p: 1675, dp: 1695, ml: 0, l: 0, dl: 0 },

  48: { mb: 45, b: 65, db: 85, mp: 0, p: 0, dp: 0, ml: 45, l: 65, dl: 85 },
  47: { mb: 155, b: 175, db: 195, mp: 0, p: 0, dp: 0, ml: 155, l: 175, dl: 195 },
  46: { mb: 265, b: 285, db: 305, mp: 0, p: 0, dp: 0, ml: 265, l: 285, dl: 305 },
  45: { mb: 375, b: 395, db: 415, mp: 0, p: 0, dp: 0, ml: 375, l: 395, dl: 415 },
  44: { mb: 485, b: 505, db: 525, mp: 0, p: 0, dp: 0, ml: 485, l: 505, dl: 525 },
  43: { mb: 595, b: 615, db: 635, mp: 0, p: 0, dp: 0, ml: 595, l: 615, dl: 635 },
  42: { mb: 705, b: 725, db: 745, mp: 0, p: 0, dp: 0, ml: 705, l: 725, dl: 745 },
  41: { mb: 815, b: 835, db: 855, mp: 0, p: 0, dp: 0, ml: 815, l: 835, dl: 855 },
  31: { mb: 885, b: 905, db: 925, mp: 0, p: 0, dp: 0, ml: 885, l: 905, dl: 925 },
  32: { mb: 995, b: 1015, db: 1035, mp: 0, p: 0, dp: 0, ml: 995, l: 1015, dl: 1035 },
  33: { mb: 1105, b: 1125, db: 1145, mp: 0, p: 0, dp: 0, ml: 1105, l: 1125, dl: 1145 },
  34: { mb: 1215, b: 1235, db: 1255, mp: 0, p: 0, dp: 0, ml: 1215, l: 1235, dl: 1255 },
  35: { mb: 1325, b: 1345, db: 1365, mp: 0, p: 0, dp: 0, ml: 1325, l: 1345, dl: 1365 },
  36: { mb: 1435, b: 1455, db: 1475, mp: 0, p: 0, dp: 0, ml: 1435, l: 1455, dl: 1475 },
  37: { mb: 1545, b: 1565, db: 1585, mp: 0, p: 0, dp: 0, ml: 1545, l: 1565, dl: 1585 },
  38: { mb: 1655, b: 1675, db: 1695, mp: 0, p: 0, dp: 0, ml: 1655, l: 1675, dl: 1695 },
};

export const POLYGON_ZERO_LINES: Record<string, number> = {
  'upper-svg-placeholder-01': 180,
  'upper-svg-placeholder-02': 220,
  'lower-svg-placeholder-01': 180,
  'lower-svg-placeholder-02': 220,
};

export const IMPLANT_COORDINATES: Record<string, { x: number; y: number }> = {
  'implant_18_b': { x: 65, y: 100 },
  'implant_18_p': { x: 65, y: 260 },
  'implant_17_b': { x: 175, y: 100 },
  'implant_17_p': { x: 175, y: 260 },
  'implant_16_b': { x: 285, y: 100 },
  'implant_16_p': { x: 285, y: 260 },
  'implant_15_b': { x: 395, y: 100 },
  'implant_15_p': { x: 395, y: 260 },
  'implant_14_b': { x: 505, y: 100 },
  'implant_14_p': { x: 505, y: 260 },
  'implant_13_b': { x: 615, y: 100 },
  'implant_13_p': { x: 615, y: 260 },
  'implant_12_b': { x: 725, y: 100 },
  'implant_12_p': { x: 725, y: 260 },
  'implant_11_b': { x: 835, y: 100 },
  'implant_11_p': { x: 835, y: 260 },
  'implant_21_b': { x: 905, y: 100 },
  'implant_21_p': { x: 905, y: 260 },
  'implant_22_b': { x: 1015, y: 100 },
  'implant_22_p': { x: 1015, y: 260 },
  'implant_23_b': { x: 1125, y: 100 },
  'implant_23_p': { x: 1125, y: 260 },
  'implant_24_b': { x: 1235, y: 100 },
  'implant_24_p': { x: 1235, y: 260 },
  'implant_25_b': { x: 1345, y: 100 },
  'implant_25_p': { x: 1345, y: 260 },
  'implant_26_b': { x: 1455, y: 100 },
  'implant_26_p': { x: 1455, y: 260 },
  'implant_27_b': { x: 1565, y: 100 },
  'implant_27_p': { x: 1565, y: 260 },
  'implant_28_b': { x: 1675, y: 100 },
  'implant_28_p': { x: 1675, y: 260 },

  'implant_48_b': { x: 65, y: 100 },
  'implant_48_l': { x: 65, y: 260 },
  'implant_47_b': { x: 175, y: 100 },
  'implant_47_l': { x: 175, y: 260 },
  'implant_46_b': { x: 285, y: 100 },
  'implant_46_l': { x: 285, y: 260 },
  'implant_45_b': { x: 395, y: 100 },
  'implant_45_l': { x: 395, y: 260 },
  'implant_44_b': { x: 505, y: 100 },
  'implant_44_l': { x: 505, y: 260 },
  'implant_43_b': { x: 615, y: 100 },
  'implant_43_l': { x: 615, y: 260 },
  'implant_42_b': { x: 725, y: 100 },
  'implant_42_l': { x: 725, y: 260 },
  'implant_41_b': { x: 835, y: 100 },
  'implant_41_l': { x: 835, y: 260 },
  'implant_31_b': { x: 905, y: 100 },
  'implant_31_l': { x: 905, y: 260 },
  'implant_32_b': { x: 1015, y: 100 },
  'implant_32_l': { x: 1015, y: 260 },
  'implant_33_b': { x: 1125, y: 100 },
  'implant_33_l': { x: 1125, y: 260 },
  'implant_34_b': { x: 1235, y: 100 },
  'implant_34_l': { x: 1235, y: 260 },
  'implant_35_b': { x: 1345, y: 100 },
  'implant_35_l': { x: 1345, y: 260 },
  'implant_36_b': { x: 1455, y: 100 },
  'implant_36_l': { x: 1455, y: 260 },
  'implant_37_b': { x: 1565, y: 100 },
  'implant_37_l': { x: 1565, y: 260 },
  'implant_38_b': { x: 1675, y: 100 },
  'implant_38_l': { x: 1675, y: 260 },
};

export const FURCATION_COORDINATES: Record<string, { x: number; y: number }> = {
  'furcation_18_b': { x: 65, y: 100 },
  'furcation_18_dp': { x: 85, y: 150 },
  'furcation_18_mp': { x: 45, y: 150 },
  'furcation_17_b': { x: 175, y: 100 },
  'furcation_17_dp': { x: 195, y: 150 },
  'furcation_17_mp': { x: 155, y: 150 },
  'furcation_16_b': { x: 285, y: 100 },
  'furcation_16_dp': { x: 305, y: 150 },
  'furcation_16_mp': { x: 265, y: 150 },
  'furcation_15_dp': { x: 415, y: 150 },
  'furcation_15_mp': { x: 375, y: 150 },
  'furcation_14_dp': { x: 525, y: 150 },
  'furcation_14_mp': { x: 485, y: 150 },
  'furcation_24_dp': { x: 1255, y: 150 },
  'furcation_24_mp': { x: 1215, y: 150 },
  'furcation_25_dp': { x: 1365, y: 150 },
  'furcation_25_mp': { x: 1325, y: 150 },
  'furcation_26_b': { x: 1455, y: 100 },
  'furcation_26_dp': { x: 1475, y: 150 },
  'furcation_26_mp': { x: 1435, y: 150 },
  'furcation_27_b': { x: 1565, y: 100 },
  'furcation_27_dp': { x: 1585, y: 150 },
  'furcation_27_mp': { x: 1545, y: 150 },
  'furcation_28_b': { x: 1675, y: 100 },
  'furcation_28_dp': { x: 1695, y: 150 },
  'furcation_28_mp': { x: 1655, y: 150 },

  'furcation_48_b': { x: 65, y: 100 },
  'furcation_48_l': { x: 65, y: 260 },
  'furcation_47_b': { x: 175, y: 100 },
  'furcation_47_l': { x: 175, y: 260 },
  'furcation_46_b': { x: 285, y: 100 },
  'furcation_46_l': { x: 285, y: 260 },
  'furcation_36_b': { x: 1455, y: 100 },
  'furcation_36_l': { x: 1455, y: 260 },
  'furcation_37_b': { x: 1565, y: 100 },
  'furcation_37_l': { x: 1565, y: 260 },
  'furcation_38_b': { x: 1675, y: 100 },
  'furcation_38_l': { x: 1675, y: 260 },
};

export const MISSING_TOOTH_X_POSITIONS: Record<FDIToothNumber, { buccal: number; palatinal: number; lingual: number }> = {
  18: { buccal: 65, palatinal: 65, lingual: 65 },
  17: { buccal: 175, palatinal: 175, lingual: 175 },
  16: { buccal: 285, palatinal: 285, lingual: 285 },
  15: { buccal: 395, palatinal: 395, lingual: 395 },
  14: { buccal: 505, palatinal: 505, lingual: 505 },
  13: { buccal: 615, palatinal: 615, lingual: 615 },
  12: { buccal: 725, palatinal: 725, lingual: 725 },
  11: { buccal: 835, palatinal: 835, lingual: 835 },
  21: { buccal: 905, palatinal: 905, lingual: 905 },
  22: { buccal: 1015, palatinal: 1015, lingual: 1015 },
  23: { buccal: 1125, palatinal: 1125, lingual: 1125 },
  24: { buccal: 1235, palatinal: 1235, lingual: 1235 },
  25: { buccal: 1345, palatinal: 1345, lingual: 1345 },
  26: { buccal: 1455, palatinal: 1455, lingual: 1455 },
  27: { buccal: 1565, palatinal: 1565, lingual: 1565 },
  28: { buccal: 1675, palatinal: 1675, lingual: 1675 },
  48: { buccal: 65, palatinal: 65, lingual: 65 },
  47: { buccal: 175, palatinal: 175, lingual: 175 },
  46: { buccal: 285, palatinal: 285, lingual: 285 },
  45: { buccal: 395, palatinal: 395, lingual: 395 },
  44: { buccal: 505, palatinal: 505, lingual: 505 },
  43: { buccal: 615, palatinal: 615, lingual: 615 },
  42: { buccal: 725, palatinal: 725, lingual: 725 },
  41: { buccal: 835, palatinal: 835, lingual: 835 },
  31: { buccal: 905, palatinal: 905, lingual: 905 },
  32: { buccal: 1015, palatinal: 1015, lingual: 1015 },
  33: { buccal: 1125, palatinal: 1125, lingual: 1125 },
  34: { buccal: 1235, palatinal: 1235, lingual: 1235 },
  35: { buccal: 1345, palatinal: 1345, lingual: 1345 },
  36: { buccal: 1455, palatinal: 1455, lingual: 1455 },
  37: { buccal: 1565, palatinal: 1565, lingual: 1565 },
  38: { buccal: 1675, palatinal: 1675, lingual: 1675 },
};

export const DIAGONAL_WIDTH = 40;
export const DIAGONAL_HEIGHT = 400;

export function getSurfaceElementBounds(
  tooth: FDIToothNumber,
  surface: SurfaceId,
  svgId: string
): { x: number; y: number; w: number; h: number; path: string } {
  const isUpper = tooth >= 11 && tooth <= 28;
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
  const toothXCoords = X_COORDINATES[tooth];
  const zeroLineY = POLYGON_ZERO_LINES[svgId] || 200;

  let baseX: number;
  let baseY: number;
  const width = SURFACE_WIDTH;
  const height = SURFACE_HEIGHT;

  if (isUpper) {
    if (svgId === 'upper-svg-placeholder-01') {
      const positions = isRight ? ['db', 'b', 'mb'] : ['mb', 'b', 'db'];
      const index = positions.indexOf(surface as 'mb' | 'b' | 'db');
      if (index === -1) return { x: 0, y: 0, w: 0, h: 0, path: '' };
      baseX = toothXCoords[surface as 'mb' | 'b' | 'db'] - width / 2;
      baseY = zeroLineY - height / 2;
    } else {
      const positions = isRight ? ['mp', 'p', 'dp'] : ['dp', 'p', 'mp'];
      const index = positions.indexOf(surface as 'mp' | 'p' | 'dp');
      if (index === -1) return { x: 0, y: 0, w: 0, h: 0, path: '' };
      baseX = toothXCoords[surface as 'mp' | 'p' | 'dp'] - width / 2;
      baseY = zeroLineY - height / 2;
    }
  } else {
    if (svgId === 'lower-svg-placeholder-01') {
      const positions = isRight ? ['dl', 'l', 'ml'] : ['ml', 'l', 'dl'];
      const index = positions.indexOf(surface as 'ml' | 'l' | 'dl');
      if (index === -1) return { x: 0, y: 0, w: 0, h: 0, path: '' };
      baseX = toothXCoords[surface as 'ml' | 'l' | 'dl'] - width / 2;
      baseY = zeroLineY - height / 2;
    } else {
      const positions = isRight ? ['mb', 'b', 'db'] : ['db', 'b', 'mb'];
      const index = positions.indexOf(surface as 'mb' | 'b' | 'db');
      if (index === -1) return { x: 0, y: 0, w: 0, h: 0, path: '' };
      baseX = toothXCoords[surface as 'mb' | 'b' | 'db'] - width / 2;
      baseY = zeroLineY - height / 2;
    }
  }

  return {
    x: baseX,
    y: baseY,
    w: width,
    h: height,
    path: 'M0,0 L100,0 L100,100 L0,100 Z',
  };
}