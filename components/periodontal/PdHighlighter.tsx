'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import {
  ChartViewId,
  getGmY,
  getPdY,
  getSurfaceX,
  getViewSurfacesOrdered,
} from '@/lib/utils/chartGeometry';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';

interface PdHighlighterProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
  threshold: number;
  color: string;
}

export function PdHighlighter({
  tooth,
  viewId,
  data,
  isGmInverted,
  threshold,
  color,
}: PdHighlighterProps) {
  if (!isToothPresent(data, tooth)) return null;

  const surfaces = getViewSurfacesOrdered(tooth, viewId);

  return (
    <g>
      {surfaces.map(surface => {
        const pd = readNumber(data[`pd_${tooth}_${surface}`]);
        if (pd < threshold) return null;

        const x = getSurfaceX(tooth, surface);
        const gmY = getGmY(viewId, readNumber(data[`gm_${tooth}_${surface}`]), isGmInverted);
        const y = getPdY(viewId, gmY, pd);

        return (
          <circle
            key={`${tooth}-${viewId}-${surface}-pd`}
            cx={x}
            cy={y}
            r={7}
            fill={color}
            fillOpacity={0.85}
            stroke="#111827"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${tooth} ${surface}: ${pd}mm`}</title>
          </circle>
        );
      })}
    </g>
  );
}
