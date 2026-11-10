'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getSurfaceX, getViewConfig } from '@/lib/utils/chartGeometry';
import { readNumber } from '@/lib/utils/periodontalAnalysis';
import { getToothTemplate, getToothRootLength } from '@/lib/utils/toothAnatomy';

interface ImplantMarkerProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

const STATUS_COLORS: Record<number, string> = {
  1: '#6b7280',
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
  const width = template.crownHalfWidth * 0.32;
  const length = getToothRootLength(tooth) * 0.85;
  const startY = zeroLineY;
  const endY = startY + rootDirection * length;

  const threads = 8;
  const threadStep = length / threads;

  const minY = Math.min(startY, endY);

  return (
    <g>
      {/* Implant body - solid fill by status */}
      <rect
        x={x - width / 2}
        y={minY}
        width={width}
        height={Math.abs(endY - startY)}
        rx={width / 4}
        fill={color}
        stroke="#111827"
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      {/* Screw threads */}
      {Array.from({ length: threads }).map((_, index) => {
        const y = startY + rootDirection * (index + 0.5) * threadStep;
        return (
          <line
            key={`thread-${index}`}
            x1={x - width / 2 + 1}
            y1={y}
            x2={x + width / 2 - 1}
            y2={y}
            stroke="#111827"
            strokeWidth={1}
            strokeOpacity={0.6}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {/* Apex */}
      <circle
        cx={x}
        cy={endY}
        r={width / 2.2}
        fill={color}
        stroke="#111827"
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      {/* Abutment at CEJ */}
      <rect
        x={x - width / 1.5}
        y={minY - 2}
        width={width * 1.33}
        height={4}
        rx={1}
        fill={color}
        stroke="#111827"
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
      <title>{`Implante ${tooth} estado ${status}`}</title>
    </g>
  );
}