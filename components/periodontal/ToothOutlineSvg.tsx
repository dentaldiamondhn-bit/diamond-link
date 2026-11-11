'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getViewConfig } from '@/lib/utils/chartGeometry';
import { getCrownPath, getRootPaths, getToothDimensions } from '@/lib/utils/toothAnatomy';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';
import { getImplantScrewSvg } from '@/lib/periodontal/implantVector';

interface ToothOutlineSvgProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  x: number;
  y: number;
}

export function ToothOutlineSvg({ tooth, viewId, data, x, y }: ToothOutlineSvgProps) {
  const config = getViewConfig(viewId);
  const rootDirection = config.rootDirection;
  const hasImplant = readNumber(data[`implant_${tooth}`]) > 0;
  const implantStatus = readNumber(data[`implant_${tooth}`]);
  const isPresent = isToothPresent(data, tooth);

  if (!isPresent) return null;

  const crownPath = getCrownPath(tooth);
  const rootPaths = getRootPaths(tooth, config.kind);
  const dims = getToothDimensions(tooth);
  const flip = rootDirection === 1 ? -1 : 1;
  const isUpper = viewId.startsWith('upper');

  return (
    <g transform={`translate(${x} ${y}) scale(1 ${flip})`}>
      {/* Crown: always rendered */}
      <path
        d={crownPath}
        fill="none"
        stroke="#1f2937"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />

      {/* Root: only when no implant */}
      {!hasImplant &&
        rootPaths.map((path, index) => (
          <path
            key={`root-${index}`}
            d={path}
            fill="none"
            stroke="#1f2937"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}

      {/* Implant screw: replaces root when implant > 0 */}
      {hasImplant &&
        getImplantScrewSvg(
          0,
          0,
          dims.rootWidth * 0.9,
          dims.rootLength * 0.9,
          isUpper,
          implantStatus,
        )}
    </g>
  );
}