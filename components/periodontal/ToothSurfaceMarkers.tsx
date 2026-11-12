'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import {
  ChartViewId,
  getGmY,
  getSurfaceX,
  getViewConfig,
  getViewSurfacesOrdered,
  POLYGON_SCALE,
} from '@/lib/utils/chartGeometry';
import { isToothPresent, readFlag, readNumber } from '@/lib/utils/periodontalAnalysis';

interface ToothSurfaceMarkersProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
}

const BOP_COLOR = '#ef4444';
const PLAQUE_COLOR = '#3b82f6';
const MARKER_HEIGHT = 1.3 * POLYGON_SCALE;

export function ToothSurfaceMarkers({
  tooth,
  viewId,
  data,
  isGmInverted,
}: ToothSurfaceMarkersProps) {
  if (!isToothPresent(data, tooth)) return null;

  const { rootDirection } = getViewConfig(viewId);
  const surfaces = getViewSurfacesOrdered(tooth, viewId);
  const xs = surfaces.map(surface => getSurfaceX(tooth, surface));
  const step = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) / (xs.length - 1) : 20;

  return (
    <g>
      {surfaces.map((surface, index) => {
        const x = xs[index];
        const half = step / 2;
        const gm = readNumber(data[`gm_${tooth}_${surface}`]);
        const gmY = getGmY(viewId, gm, isGmInverted);
        const bop = readFlag(data[`bop_${tooth}_${surface}`]);
        const plaque = readFlag(data[`pi_${tooth}_${surface}`]);
        const markerY = rootDirection === -1 ? gmY - MARKER_HEIGHT : gmY;
        const fill = bop ? BOP_COLOR : plaque ? PLAQUE_COLOR : 'transparent';

        return (
          <rect
            key={`marker-${tooth}-${viewId}-${surface}`}
            x={x - half}
            y={markerY}
            width={step}
            height={MARKER_HEIGHT}
            fill={fill}
            fillOpacity={fill === 'transparent' ? 0 : 0.85}
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
}
