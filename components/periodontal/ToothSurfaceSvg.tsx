'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import {
  ChartViewId,
  getGmY,
  getSurfaceX,
  getViewSurfacesOrdered,
  POLYGON_SCALE,
} from '@/lib/utils/chartGeometry';
import { isToothPresent, readFlag, readNumber } from '@/lib/utils/periodontalAnalysis';
import { useChartStore } from '@/lib/store/useChartStore';

interface ToothSurfaceSvgProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
  activeRemoteControl: string;
}

const SURFACE_LABELS: Record<SurfaceId, string> = {
  mb: 'Mesiobuccal',
  b: 'Bucal',
  db: 'Distobuccal',
  mp: 'Mesopalatino',
  p: 'Palatino',
  dp: 'Distopalatino',
  ml: 'Mesiolingual',
  l: 'Lingual',
  dl: 'Distolingual',
};

const BOP_COLOR = '#ef4444';
const PLAQUE_COLOR = '#3b82f6';
const MARKER_HEIGHT = 1.3 * POLYGON_SCALE;
const HIT_HEIGHT = 4.5 * POLYGON_SCALE;

export function ToothSurfaceSvg({
  tooth,
  viewId,
  data,
  isGmInverted,
  activeRemoteControl,
}: ToothSurfaceSvgProps) {
  const toggleBop = useChartStore(state => state.toggleBop);
  const togglePlaque = useChartStore(state => state.togglePlaque);
  const isOverlayMode = useChartStore(state => state.isOverlayMode);

  if (!isToothPresent(data, tooth)) return null;

  const surfaces = getViewSurfacesOrdered(tooth, viewId);
  const xs = surfaces.map(surface => getSurfaceX(tooth, surface));
  const step = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) / (xs.length - 1) : 20;

  const handleClick = (surface: SurfaceId) => {
    if (isOverlayMode) return;
    if (activeRemoteControl === 'bop') toggleBop(tooth, surface);
    else if (activeRemoteControl === 'plaque') togglePlaque(tooth, surface);
  };

  return (
    <g>
      {surfaces.map((surface, index) => {
        const x = xs[index];
        const half = step / 2;
        const gm = readNumber(data[`gm_${tooth}_${surface}`]);
        const gmY = getGmY(viewId, gm, isGmInverted);
        const rootDirection = viewId.startsWith('upper') ? -1 : 1;

        const bop = readFlag(data[`bop_${tooth}_${surface}`]);
        const plaque = readFlag(data[`pi_${tooth}_${surface}`]);

        const markerY = rootDirection === -1 ? gmY - MARKER_HEIGHT : gmY;
        const hitY = rootDirection === -1 ? gmY - HIT_HEIGHT : gmY;

        const fill = bop ? BOP_COLOR : plaque ? PLAQUE_COLOR : 'transparent';

        return (
          <g key={`${tooth}-${viewId}-${surface}`}>
            <rect
              x={x - half}
              y={hitY}
              width={step}
              height={HIT_HEIGHT}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => handleClick(surface)}
            >
              <title>{`${tooth} ${SURFACE_LABELS[surface]}`}</title>
            </rect>
            <rect
              x={x - half}
              y={markerY}
              width={step}
              height={MARKER_HEIGHT}
              fill={fill}
              fillOpacity={fill === 'transparent' ? 0 : 0.85}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </g>
  );
}
