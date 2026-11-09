'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getSurfaceX, getViewConfig } from '@/lib/utils/chartGeometry';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';
import { getToothTemplate } from '@/lib/utils/toothAnatomy';

interface MissingToothDiagonalProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

export function MissingToothDiagonal({ tooth, viewId, data }: MissingToothDiagonalProps) {
  if (isToothPresent(data, tooth)) return null;
  if (readNumber(data[`implant_${tooth}`]) > 0) return null;

  const { rootDirection, zeroLineY } = getViewConfig(viewId);
  const template = getToothTemplate(tooth);
  const centre = getSurfaceX(tooth, 'b');
  const halfWidth = template.crownHalfWidth;
  const crownHeight = template.crownHeight;

  const topY = zeroLineY + rootDirection * crownHeight;
  const bottomY = zeroLineY;

  return (
    <g>
      <line
        x1={centre - halfWidth}
        y1={topY}
        x2={centre + halfWidth}
        y2={bottomY}
        stroke="#000000"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      <line
        x1={centre + halfWidth}
        y1={topY}
        x2={centre - halfWidth}
        y2={bottomY}
        stroke="#000000"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      <title>{`Diente ${tooth} ausente`}</title>
    </g>
  );
}
