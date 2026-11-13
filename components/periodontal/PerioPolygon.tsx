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
import { isToothCharted, readNumber } from '@/lib/utils/periodontalAnalysis';

interface PerioPolygonProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
  overlayData?: ChartData | null;
}

// Site renderPerioPolygon colors (js/renderer/chart_renderer.js): pdStroke
// 'blue' (#0000ff), gmStroke 'red' (#ff0000), mucStroke '#D011A6', polygon
// fill #000080 at opacity 0.5, every stroke-width 3 (≈3px on screen).
const POLYGON_FILL = '#000080';
const PD_STROKE = '#0000ff';
const GM_STROKE = '#ff0000';
const MUC_STROKE = '#D011A6';
const OVERLAY_STROKE = '#7c3aed';
const STROKE_WIDTH = 3;

export function PerioPolygon({ tooth, viewId, data, isGmInverted, overlayData }: PerioPolygonProps) {
  // Site gate is positionBesetzt (present) only, but the app also charts
  // peri-implant values on switched-off positions: implanted teeth keep
  // their polygons so the GM/PD lines draw over the implant PNG.
  if (!isToothCharted(data, tooth)) return null;

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

  // The site renders flat lines along the CEJ for every present tooth, even
  // with all-zero values — no data gate.
  const { gmPoints, pdPoints, mucPoints } = buildPoints(data);
  const polygonPoints = [...gmPoints, ...pdPoints.slice().reverse()];

  // The site only draws the muc line when its mucogingival mode is active
  // (data.active_indices.muc); our equivalent gate is any muc value present.
  const hasMuc = surfaces.some(surface => readNumber(data[`muc_${tooth}_${surface}`]) > 0);

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
        fillOpacity={0.5}
        stroke="none"
      />

      <polyline
        className="perio-pd"
        data-tooth={tooth}
        points={formatPoints(pdPoints)}
        fill="none"
        stroke={PD_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {hasMuc && (
        <polyline
          className="perio-muc"
          data-tooth={tooth}
          points={formatPoints(mucPoints)}
          fill="none"
          stroke={MUC_STROKE}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <polyline
        className="perio-gm"
        data-tooth={tooth}
        points={formatPoints(gmPoints)}
        fill="none"
        stroke={GM_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
