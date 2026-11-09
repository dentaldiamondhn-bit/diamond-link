'use client';

import React from 'react';
import { X_COORDINATES, POLYGON_ZERO_LINES, POLYGON_SCALE } from '@/lib/utils/coordinateMaps';
import { FDIToothNumber, SurfaceId, ChartData, ActiveIndices } from '@/lib/types';

interface PerioPolygonProps {
  tooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
  viewStatus: 0 | 1 | 2;
  isGmInverted: boolean;
  activeIndices: ActiveIndices;
  overlayData?: ChartData | null;
}

export function PerioPolygon({ tooth, svgId, data, viewStatus, isGmInverted, activeIndices, overlayData }: PerioPolygonProps) {
  const isLowerJaw = tooth >= 31;
  const isCorrectJaw = (isLowerJaw && svgId.includes('lower')) || (!isLowerJaw && svgId.includes('upper'));
  if (!isCorrectJaw) return null;

  const isToothPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
  const isImplantActive = (data[`implant_${tooth}`] as number) > 0;
  if (!isToothPresent || isImplantActive) return null;

  const toothXCoords = X_COORDINATES[tooth];
  const zeroLineY = POLYGON_ZERO_LINES[svgId] || 0;
  const scale = POLYGON_SCALE;

  const isUpperRight = tooth >= 11 && tooth <= 18;
  const isUpperLeft = tooth >= 21 && tooth <= 28;
  const isLowerRight = tooth >= 41 && tooth <= 48;
  const isLowerLeft = tooth >= 31 && tooth <= 38;

  let buccalPositions: SurfaceId[] = [];
  let oralPositions: SurfaceId[] = [];

  if (isUpperRight || isLowerRight) {
    buccalPositions = ['db', 'b', 'mb'];
    oralPositions = isLowerJaw ? ['dl', 'l', 'ml'] : ['mp', 'p', 'dp'];
  } else if (isUpperLeft || isLowerLeft) {
    buccalPositions = ['mb', 'b', 'db'];
    oralPositions = isLowerJaw ? ['ml', 'l', 'dl'] : ['dp', 'p', 'mp'];
  } else return null;

  const isBuccalView = svgId === 'upper-svg-placeholder-01' || svgId === 'lower-svg-placeholder-02';
  const positions = isBuccalView ? buccalPositions : oralPositions;

  const getPoint = (pos: SurfaceId, source: ChartData) => {
    const gm = parseFloat(source[`gm_${tooth}_${pos}`]) || 0;
    const pd = parseFloat(source[`pd_${tooth}_${pos}`]) || 0;
    const muc = parseFloat(source[`muc_${tooth}_${pos}`]) || 0;

    const adjustedGm = isGmInverted ? -gm : gm;

    let gmY: number, pdY: number, mucY: number;

    if (!isLowerJaw) {
      if (svgId === 'upper-svg-placeholder-01') {
        gmY = zeroLineY + adjustedGm * scale;
        pdY = gmY - pd * scale;
        mucY = gmY - muc * scale;
      } else {
        gmY = zeroLineY - adjustedGm * scale;
        pdY = gmY + pd * scale;
        mucY = gmY + muc * scale;
      }
    } else {
      if (svgId === 'lower-svg-placeholder-01') {
        gmY = zeroLineY + adjustedGm * scale;
        pdY = gmY - pd * scale;
        mucY = gmY - muc * scale;
      } else {
        gmY = zeroLineY - adjustedGm * scale;
        pdY = gmY + pd * scale;
        mucY = gmY + muc * scale;
      }
    }

    const getXCoord = (p: SurfaceId) => {
      if (p === 'b') return (toothXCoords['db'] + toothXCoords['mb']) / 2;
      if (p === 'p') return (toothXCoords['dp'] + toothXCoords['mp']) / 2;
      if (p === 'l') return (toothXCoords['dl'] + toothXCoords['ml']) / 2;
      return toothXCoords[p];
    };

    const x = getXCoord(pos);
    return { gm: { x, y: gmY ?? 0 }, pd: { x, y: pdY ?? 0 }, muc: { x, y: mucY ?? 0 } };
  };

  const values = positions.map(pos => getPoint(pos, data));
  const gmPoints = values.map(v => v.gm);
  const pdPoints = values.map(v => v.pd);
  const polygonPoints = [...gmPoints, ...pdPoints.slice().reverse()];
  const mucPoints = values.map(v => v.muc);

  const overlayValues = overlayData ? positions.map(pos => getPoint(pos, overlayData)) : null;
  const overlayPdPoints = overlayValues ? overlayValues.map(v => v.pd) : null;
  const overlayHasData = overlayData
    ? positions.some(pos => parseFloat(overlayData[`pd_${tooth}_${pos}`]) > 0)
    : false;

  const formatPoints = (points: { x: number; y: number }[]) =>
    points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const colors = {
    polygonFill: '#000080',
    polygonOpacity: 0.5,
    pdStroke: '#3b82f6',
    gmStroke: '#ef4444',
    mucStroke: '#d011a6',
  };

  return (
    <g>
      {overlayHasData && overlayPdPoints && (
        <polyline
          className="perio-overlay-pd"
          data-tooth={tooth}
          points={formatPoints(overlayPdPoints)}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeDasharray="4,4"
          strokeOpacity="0.7"
        />
      )}

      <polygon
        className="perio-poly"
        data-tooth={tooth}
        points={formatPoints(polygonPoints)}
        fill={colors.polygonFill}
        fillOpacity={colors.polygonOpacity}
        stroke="none"
      />

      <polyline
        className="perio-pd"
        data-tooth={tooth}
        points={formatPoints(pdPoints)}
        fill="none"
        stroke={colors.pdStroke}
        strokeWidth="3"
      />

      {viewStatus === 1 && (
        <polyline
          className="perio-gm"
          data-tooth={tooth}
          points={formatPoints(gmPoints)}
          fill="none"
          stroke={colors.gmStroke}
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}

      {activeIndices.muc && (
        <polyline
          className="perio-muc"
          data-tooth={tooth}
          points={formatPoints(mucPoints)}
          fill="none"
          stroke={colors.mucStroke}
          strokeWidth="2"
        />
      )}
    </g>
  );
}