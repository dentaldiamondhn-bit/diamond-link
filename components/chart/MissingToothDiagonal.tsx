'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { MISSING_TOOTH_X_POSITIONS, DIAGONAL_WIDTH, DIAGONAL_HEIGHT } from '@/lib/utils/coordinateMaps';

interface MissingToothDiagonalProps {
  tooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
}

export function MissingToothDiagonal({ tooth, svgId, data }: MissingToothDiagonalProps) {
  const isToothPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
  const isImplantActive = (data[`implant_${tooth}`] as number) > 0;

  if (isToothPresent || isImplantActive) return null;

  const _isUpper = tooth >= 11 && tooth <= 28;
  const _isLower = tooth >= 31 && tooth <= 48;

  let viewType: 'buccal' | 'palatinal' | 'lingual';

  if (svgId === 'upper-svg-placeholder-01') viewType = 'buccal';
  else if (svgId === 'upper-svg-placeholder-02') viewType = 'palatinal';
  else if (svgId === 'lower-svg-placeholder-01') viewType = 'lingual';
  else if (svgId === 'lower-svg-placeholder-02') viewType = 'buccal';
  else return null;

  const positions = MISSING_TOOTH_X_POSITIONS[tooth];
  if (!positions) return null;

  const x = positions[viewType] || positions.buccal;

  return (
    <line
      x1={x - DIAGONAL_WIDTH / 2}
      y1={0}
      x2={x + DIAGONAL_WIDTH / 2}
      y2={DIAGONAL_HEIGHT}
      stroke="#828282"
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity={0.6}
    />
  );
}