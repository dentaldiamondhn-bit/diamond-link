'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getViewConfig } from '@/lib/utils/chartGeometry';
import { getToothDimensions } from '@/lib/utils/toothAnatomy';
import { getSiteCrownPaths, getSiteCrownTransform } from '@/lib/periodontal/toothSvgPaths';
import { isToothPresent } from '@/lib/utils/periodontalAnalysis';

interface ToothOutlineSvgProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  x: number;
  y: number;
}

export function ToothOutlineSvg({ tooth, viewId, data, x, y }: ToothOutlineSvgProps) {
  const config = getViewConfig(viewId);
  const isPresent = isToothPresent(data, tooth);

  if (!isPresent) return null;

  const dims = getToothDimensions(tooth);
  const crownWidth = dims.crownHalfWidth * 2;
  const crownHeight = dims.crownHeight;
  const crownTransform = getSiteCrownTransform(tooth, crownWidth, crownHeight);
  const crownPaths = getSiteCrownPaths(tooth);
  const flip = config.rootDirection === 1 ? -1 : 1;

  return (
    <g transform={`translate(${x} ${y}) scale(1 ${flip})`}>
      <g transform={crownTransform}>
        {crownPaths.map((path, index) => (
          <path
            key={`crown-${index}`}
            d={path}
            fill="none"
            stroke="#1f2937"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </g>
  );
}
