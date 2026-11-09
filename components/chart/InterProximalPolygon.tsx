'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import { X_COORDINATES, POLYGON_ZERO_LINES, POLYGON_SCALE } from '@/lib/utils/coordinateMaps';

interface InterProximalPolygonProps {
  tooth: FDIToothNumber;
  prevTooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
  isGmInverted: boolean;
}

function getPointForInterproximal(
  tooth: FDIToothNumber,
  surface: SurfaceId,
  data: ChartData,
  zeroLineY: number,
  scale: number,
  isLowerJaw: boolean,
  isGmInverted: boolean
): { gm: { x: number; y: number }; pd: { x: number; y: number } } {
  const gm = parseFloat(data[`gm_${tooth}_${surface}`]) || 0;
  const pd = parseFloat(data[`pd_${tooth}_${surface}`]) || 0;
  const adjustedGm = isGmInverted ? -gm : gm;

  let gmY: number, pdY: number;
  const toothXCoords = X_COORDINATES[tooth];

  const getXCoord = (p: SurfaceId) => {
    if (p === 'b') return (toothXCoords['db'] + toothXCoords['mb']) / 2;
    if (p === 'p') return (toothXCoords['dp'] + toothXCoords['mp']) / 2;
    if (p === 'l') return (toothXCoords['dl'] + toothXCoords['ml']) / 2;
    return toothXCoords[p];
  };

  const x = getXCoord(surface);

  if (!isLowerJaw) {
    gmY = zeroLineY + adjustedGm * scale;
    pdY = gmY - pd * scale;
  } else {
    gmY = zeroLineY + adjustedGm * scale;
    pdY = gmY - pd * scale;
  }

  return { gm: { x, y: gmY }, pd: { x, y: pdY } };
}

export function InterProximalPolygon({
  tooth,
  prevTooth,
  svgId,
  data,
  isGmInverted,
}: InterProximalPolygonProps) {
  const isToothPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
  const isPrevToothPresent = data[`tooth_${prevTooth}`] === '1' || data[`tooth_${prevTooth}`] === 1;
  const isImplantActive = (data[`implant_${tooth}`] as number) > 0;
  const isPrevImplantActive = (data[`implant_${prevTooth}`] as number) > 0;

  if (!isToothPresent || !isPrevToothPresent || isImplantActive || isPrevImplantActive) {
    return null;
  }

  const isLowerJaw = tooth >= 31;
  const isUpperJaw = tooth >= 11 && tooth <= 28;
  const isRightSide = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);

  let prevSurface: SurfaceId;
  let currSurface: SurfaceId;

  if (isUpperJaw) {
    if (isRightSide) {
      prevSurface = 'db';
      currSurface = 'mb';
    } else {
      prevSurface = 'dp';
      currSurface = 'mp';
    }
  } else {
    if (isRightSide) {
      prevSurface = 'dl';
      currSurface = 'ml';
    } else {
      prevSurface = 'ml';
      currSurface = 'dl';
    }
  }

  const zeroLineY = POLYGON_ZERO_LINES[svgId] || 0;
  const scale = POLYGON_SCALE;

  const prevPoint = getPointForInterproximal(prevTooth, prevSurface, data, zeroLineY, scale, isLowerJaw, isGmInverted);
  const currPoint = getPointForInterproximal(tooth, currSurface, data, zeroLineY, scale, isLowerJaw, isGmInverted);

  const formatPoint = (p: { x: number; y: number }) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

  const points = [
    formatPoint(prevPoint.gm),
    formatPoint(currPoint.gm),
    formatPoint(currPoint.pd),
    formatPoint(prevPoint.pd),
  ].join(' ');

  return (
    <polygon
      className="interproximal-poly"
      data-teeth={`${prevTooth}-${tooth}`}
      points={points}
      fill="#000080"
      fillOpacity="0.3"
      stroke="#000080"
      strokeWidth="1"
      strokeOpacity="0.5"
    />
  );
}