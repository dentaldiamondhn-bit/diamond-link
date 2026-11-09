'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import {
  ChartViewId,
  ChartPoint,
  formatPoints,
  getGmY,
  getMucY,
  getPdY,
  getSurfaceX,
  getViewSurfacesOrdered,
} from '@/lib/utils/chartGeometry';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';

interface PerioPolygonProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
  overlayData?: ChartData | null;
}

const POLYGON_FILL = '#000080';
const PD_STROKE = '#3b82f6';
const GM_STROKE = '#ef4444';
const MUC_STROKE = '#d011a6';
const OVERLAY_STROKE = '#7c3aed';

export function PerioPolygon({ tooth, viewId, data, isGmInverted, overlayData }: PerioPolygonProps) {
  if (!isToothPresent(data, tooth)) return null;

  const surfaces = getViewSurfacesOrdered(tooth, viewId);

  const buildPoints = (source: ChartData) => {
    const gmPoints: ChartPoint[] = [];
    const pdPoints: ChartPoint[] = [];
    const mucPoints: ChartPoint[] = [];

    surfaces.forEach(surface => {
      const x = getSurfaceX(tooth, surface);
      const gm = readNumber(source[`gm_${tooth}_${surface}`]);
      const pd = readNumber(source[`pd_${tooth}_${surface}`]);
      const muc = readNumber(source[`muc_${tooth}_${surface}`]);

      const gmY = getGmY(viewId, gm, isGmInverted);

      gmPoints.push({ x, y: gmY });
      pdPoints.push({ x, y: getPdY(viewId, gmY, pd) });
      mucPoints.push({ x, y: getMucY(viewId, gmY, muc) });
    });

    return { gmPoints, pdPoints, mucPoints };
  };

  const { gmPoints, pdPoints, mucPoints } = buildPoints(data);
  const polygonPoints = [...gmPoints, ...pdPoints.slice().reverse()];

  const hasMeasurement = surfaces.some(surface => readNumber(data[`pd_${tooth}_${surface}`]) > 0);
  if (!hasMeasurement) return null;

  const overlayPoints = overlayData
    ? buildPoints(overlayData).pdPoints
    : null;
  const overlayHasData = overlayData
    ? surfaces.some(surface => readNumber(overlayData[`pd_${tooth}_${surface}`]) > 0)
    : false;

  return (
    <g>
      {overlayHasData && overlayPoints && (
        <polyline
          className="perio-overlay-pd"
          data-tooth={tooth}
          points={formatPoints(overlayPoints)}
          fill="none"
          stroke={OVERLAY_STROKE}
          strokeWidth={2}
          strokeDasharray="4,4"
          strokeOpacity={0.75}
          vectorEffect="non-scaling-stroke"
        />
      )}

      <polygon
        className="perio-poly"
        data-tooth={tooth}
        points={formatPoints(polygonPoints)}
        fill={POLYGON_FILL}
        fillOpacity={0.45}
        stroke="none"
      />

      <polyline
        className="perio-pd"
        data-tooth={tooth}
        points={formatPoints(pdPoints)}
        fill="none"
        stroke={PD_STROKE}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        className="perio-gm"
        data-tooth={tooth}
        points={formatPoints(gmPoints)}
        fill="none"
        stroke={GM_STROKE}
        strokeWidth={1.5}
        strokeDasharray="4,4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        className="perio-muc"
        data-tooth={tooth}
        points={formatPoints(mucPoints)}
        fill="none"
        stroke={MUC_STROKE}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeOpacity={0.85}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
