'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import {
  ChartViewId,
  formatPoints,
  getGmY,
  getMucY,
  getPdY,
  getSurfaceX,
  getViewSurfaces,
} from '@/lib/utils/chartGeometry';
import { isToothCharted, readNumber } from '@/lib/utils/periodontalAnalysis';

interface InterProximalPolygonProps {
  tooth: FDIToothNumber;
  prevTooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
}

// Site renderInterPolygons (js/renderer/chart_renderer.js): polygon fill
// #000080 at opacity 0.5 plus continuous GM (red) and PD (blue) polylines
// across the interdental space, stroke-width 3. The midline pairs
// (11->21, 41->31) are skipped.
const POLYGON_FILL = '#000080';
const PD_STROKE = '#0000ff';
const GM_STROKE = '#ff0000';
const MUC_STROKE = '#D011A6';
const STROKE_WIDTH = 3;

export function InterProximalPolygon({
  tooth,
  prevTooth,
  viewId,
  data,
  isGmInverted,
}: InterProximalPolygonProps) {
  if ((prevTooth === 11 && tooth === 21) || (prevTooth === 41 && tooth === 31)) {
    return null;
  }
  // Site gate (chart_renderer.js renderInterPolygons, 23.09.2026 note) is
  // presence of BOTH teeth only — implanted teeth keep their connections so
  // the GM/PD lines run continuously over the implant PNGs. Switched-off
  // positions with an implant status stay charted in the app.
  if (!isToothCharted(data, tooth) || !isToothCharted(data, prevTooth)) return null;

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
    const muc = readNumber(data[`muc_${target}_${surface}`]);
    const gmY = getGmY(viewId, gm, isGmInverted);
    return {
      gm: { x, y: gmY },
      pd: { x, y: getPdY(viewId, gmY, pd) },
      muc: { x, y: getMucY(viewId, gmY, muc) },
    };
  };

  const prevPoint = pointFor(prevTooth, prevSurface);
  const currPoint = pointFor(tooth, currSurface);

  // The site renders the interdental space for every adjacent present pair,
  // even with all-zero values — no data gate.
  const points = [prevPoint.gm, currPoint.gm, currPoint.pd, prevPoint.pd];

  const hasMuc =
    readNumber(data[`muc_${prevTooth}_${prevSurface}`]) > 0 ||
    readNumber(data[`muc_${tooth}_${currSurface}`]) > 0;

  return (
    <g>
      <polygon
        className="inter-poly"
        points={formatPoints(points)}
        fill={POLYGON_FILL}
        fillOpacity={0.5}
        stroke="none"
      />

      <polyline
        className="inter-pd"
        points={formatPoints([prevPoint.pd, currPoint.pd])}
        fill="none"
        stroke={PD_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {hasMuc && (
        <polyline
          className="inter-muc"
          points={formatPoints([prevPoint.muc, currPoint.muc])}
          fill="none"
          stroke={MUC_STROKE}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <polyline
        className="inter-gm"
        points={formatPoints([prevPoint.gm, currPoint.gm])}
        fill="none"
        stroke={GM_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
