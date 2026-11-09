'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getSurfaceX, getViewConfig } from '@/lib/utils/chartGeometry';
import { readNumber } from '@/lib/utils/periodontalAnalysis';
import { getToothRootLength } from '@/lib/utils/toothAnatomy';

interface FurcationMarkerProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

const MARKER_SIZE = 11;

function FurcationSymbol({ grade, x, y }: { grade: number; x: number; y: number }) {
  const half = MARKER_SIZE / 2;
  const points = `${x},${y - half} ${x - half},${y + half} ${x + half},${y + half}`;

  if (grade >= 3) {
    return <polygon points={points} fill="#000000" stroke="#000000" strokeWidth={1} />;
  }

  if (grade === 2) {
    return (
      <polygon
        points={points}
        fill="#000000"
        fillOpacity={0.45}
        stroke="#000000"
        strokeWidth={1}
      />
    );
  }

  return <polygon points={points} fill="none" stroke="#000000" strokeWidth={1.2} />;
}

export function FurcationMarker({ tooth, viewId, data }: FurcationMarkerProps) {
  const { kind, rootDirection } = getViewConfig(viewId);

  const grade =
    kind === 'buccal'
      ? readNumber(data[`furcation_${tooth}_b`])
      : viewId.startsWith('upper')
        ? Math.max(readNumber(data[`furcation_${tooth}_dp`]), readNumber(data[`furcation_${tooth}_mp`]))
        : readNumber(data[`furcation_${tooth}_l`]);

  if (!grade || grade < 1) return null;

  const surface = kind === 'buccal' ? 'b' : viewId.startsWith('upper') ? 'p' : 'l';
  const x = getSurfaceX(tooth, surface);
  const rootLength = getToothRootLength(tooth);
  const zeroLineY = getViewConfig(viewId).zeroLineY;
  const y = zeroLineY + rootDirection * rootLength * 0.42;

  return (
    <g>
      <FurcationSymbol grade={grade} x={x} y={y} />
      <title>{`Furcación ${tooth} grado ${grade}`}</title>
    </g>
  );
}
