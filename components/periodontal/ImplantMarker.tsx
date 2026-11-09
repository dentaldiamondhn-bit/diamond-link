'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getSurfaceX, getViewConfig } from '@/lib/utils/chartGeometry';
import { readNumber } from '@/lib/utils/periodontalAnalysis';
import { getToothRootLength, getToothTemplate } from '@/lib/utils/toothAnatomy';

interface ImplantMarkerProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

const STATUS_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#ef4444',
  3: '#22c55e',
};

export function ImplantMarker({ tooth, viewId, data }: ImplantMarkerProps) {
  const status = readNumber(data[`implant_${tooth}`]);
  if (!status || status < 1) return null;

  const color = STATUS_COLORS[status] ?? STATUS_COLORS[1];
  const { kind, rootDirection, zeroLineY } = getViewConfig(viewId);
  const surface = kind === 'buccal' ? 'b' : viewId.startsWith('upper') ? 'p' : 'l';
  const x = getSurfaceX(tooth, surface);

  const template = getToothTemplate(tooth);
  const width = template.crownHalfWidth * 0.5;
  const length = getToothRootLength(tooth) * 0.62;
  const startY = zeroLineY + rootDirection * template.crownHeight * 0.25;
  const endY = startY + rootDirection * length;

  const threads = 6;
  const threadStep = length / threads;

  return (
    <g>
      <rect
        x={x - width / 2}
        y={Math.min(startY, endY)}
        width={width}
        height={Math.abs(endY - startY)}
        rx={width / 3}
        fill="#e5e7eb"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {Array.from({ length: threads }).map((_, index) => {
        const y = startY + rootDirection * (index + 0.5) * threadStep;
        return (
          <line
            key={`thread-${index}`}
            x1={x - width / 2}
            y1={y}
            x2={x + width / 2}
            y2={y}
            stroke={color}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <circle
        cx={x}
        cy={endY}
        r={width / 2.4}
        fill={color}
        stroke="#111827"
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      <title>{`Implante ${tooth} estado ${status}`}</title>
    </g>
  );
}
