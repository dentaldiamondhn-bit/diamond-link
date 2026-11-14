'use client';

import React from 'react';
import { ChartData, FDIToothNumber, FurcationSite } from '@/lib/types';
import {
  ChartViewId,
  POLYGON_SCALE,
  siteSvgXToApp,
  siteSvgYToApp,
} from '@/lib/utils/chartGeometry';
import { isImplanted, isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';
import { FURCATION_CHART_COORDINATES } from '@/lib/constants/furcation';

interface FurcationMarkerProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

// Reference marker geometry (js/renderer/chart_renderer.js renderFurcations):
// filled radius 7 site units, stroke width 2.5, stroked radius 7 - 2.5/2.
// App units per site unit = POLYGON_SCALE / 6.45 (site mm scale).
const SITE_UNIT_TO_APP = POLYGON_SCALE / 6.45;
const RADIUS_FILLED = 7 * SITE_UNIT_TO_APP;
const STROKE_WIDTH = 2.5 * SITE_UNIT_TO_APP;
const RADIUS_STROKED = RADIUS_FILLED - STROKE_WIDTH / 2;

// Site routing (js/renderer/chart_renderer.js:140-152): the upper buccal view
// draws site 'b', the upper oral view draws both palatal-root sites, the
// lower lingual view 'l' and the lower buccal view 'b'.
const FURCATION_SITES_BY_VIEW: Record<ChartViewId, FurcationSite[]> = {
  'upper-svg-placeholder-01': ['b'],
  'upper-svg-placeholder-02': ['mp', 'dp'],
  'lower-svg-placeholder-01': ['l'],
  'lower-svg-placeholder-02': ['b'],
};

// Grade glyphs copied from the reference: grade 1 = stroked circle, grade 2 =
// stroked circle with the left half of the disc filled (the site's path
// `M cx cy-7 A 7 7 0 0 0 cx cy+7 L cx cy Z`), grade 3 = solid disc.
function FurcationSymbol({ grade, x, y }: { grade: number; x: number; y: number }) {
  if (grade >= 3) {
    return (
      <circle cx={x} cy={y} r={RADIUS_FILLED} fill="black" stroke="none" />
    );
  }

  if (grade === 2) {
    const halfDisc = `M ${x} ${y - RADIUS_FILLED} A ${RADIUS_FILLED} ${RADIUS_FILLED} 0 0 0 ${x} ${y + RADIUS_FILLED} L ${x} ${y} Z`;
    return (
      <g>
        <circle
          cx={x}
          cy={y}
          r={RADIUS_STROKED}
          fill="none"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
        />
        <path d={halfDisc} fill="black" stroke="none" />
      </g>
    );
  }

  return (
    <circle
      cx={x}
      cy={y}
      r={RADIUS_STROKED}
      fill="none"
      stroke="black"
      strokeWidth={STROKE_WIDTH}
    />
  );
}

export function FurcationMarker({ tooth, viewId, data }: FurcationMarkerProps) {
  // The reference hides furcation markers on absent teeth and on implants
  // (renderFurcations + .implant-active .furcation-button display:none).
  if (!isToothPresent(data, tooth) || isImplanted(data, tooth)) return null;

  const symbols = FURCATION_SITES_BY_VIEW[viewId].flatMap(site => {
    const grade = readNumber(data[`furcation_${tooth}_${site}`]);
    if (grade < 1) return [];
    const coord = FURCATION_CHART_COORDINATES[viewId]?.[`furcation_${tooth}_${site}`];
    if (!coord) return [];
    const x = siteSvgXToApp(coord.x);
    const y = siteSvgYToApp(coord.y);
    return [<FurcationSymbol key={site} grade={grade} x={x} y={y} />];
  });

  if (symbols.length === 0) return null;

  return (
    <g>
      {symbols}
      <title>{`Furcación ${tooth}`}</title>
    </g>
  );
}
