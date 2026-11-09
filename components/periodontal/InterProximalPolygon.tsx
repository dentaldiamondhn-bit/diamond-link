'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import {
  ChartViewId,
  formatPoints,
  getGmY,
  getPdY,
  getSurfaceX,
  getViewSurfaces,
} from '@/lib/utils/chartGeometry';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';

interface InterProximalPolygonProps {
  tooth: FDIToothNumber;
  prevTooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
}

export function InterProximalPolygon({
  tooth,
  prevTooth,
  viewId,
  data,
  isGmInverted,
}: InterProximalPolygonProps) {
  if (!isToothPresent(data, tooth) || !isToothPresent(data, prevTooth)) return null;
  if (readNumber(data[`implant_${tooth}`]) > 0 || readNumber(data[`implant_${prevTooth}`]) > 0) return null;

  const surfaces = getViewSurfaces(viewId);

  const edgeSurface = (target: FDIToothNumber, side: 'left' | 'right'): SurfaceId => {
    let best = surfaces[0];
    let bestX = getSurfaceX(target, best);
    surfaces.forEach(surface => {
      const x = getSurfaceX(target, surface);
      if (side === 'right' ? x > bestX : x < bestX) {
        best = surface;
        bestX = x;
      }
    });
    return best;
  };

  const prevSurface = edgeSurface(prevTooth, 'right');
  const currSurface = edgeSurface(tooth, 'left');

  const pointFor = (target: FDIToothNumber, surface: SurfaceId) => {
    const x = getSurfaceX(target, surface);
    const gm = readNumber(data[`gm_${target}_${surface}`]);
    const pd = readNumber(data[`pd_${target}_${surface}`]);
    const gmY = getGmY(viewId, gm, isGmInverted);
    return { gm: { x, y: gmY }, pd: { x, y: getPdY(viewId, gmY, pd) } };
  };

  const prevPoint = pointFor(prevTooth, prevSurface);
  const currPoint = pointFor(tooth, currSurface);

  const hasMeasurement =
    readNumber(data[`pd_${prevTooth}_${prevSurface}`]) > 0 ||
    readNumber(data[`pd_${tooth}_${currSurface}`]) > 0;

  if (!hasMeasurement) return null;

  const points = [prevPoint.gm, currPoint.gm, currPoint.pd, prevPoint.pd];

  return (
    <polygon
      className="perio-interproximal"
      points={formatPoints(points)}
      fill="#000080"
      fillOpacity={0.22}
      stroke="none"
    />
  );
}
