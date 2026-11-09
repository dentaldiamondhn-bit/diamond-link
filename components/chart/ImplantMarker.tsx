'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { IMPLANT_COORDINATES } from '@/lib/utils/coordinateMaps';

interface ImplantMarkerProps {
  tooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
}

const IMPLANT_COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#9ca3af',
  2: '#ef4444',
  3: '#22c55e',
};

function ImplantIcon({ status, size = 24 }: { status: number; size?: number }) {
  const color = IMPLANT_COLORS[status] || 'transparent';
  const _half = size / 2;

  if (status === 0) return null;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx={12} cy={12} r={10} stroke={color} strokeWidth="2" fill="none" />
      <rect x={10} y={4} width={4} height={8} fill={color} />
      <path d="M8 16h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 12h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ImplantMarker({ tooth, svgId, data }: ImplantMarkerProps) {
  const isToothPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
  const implantStatus = (data[`implant_${tooth}`] as number) || 0;

  if (!isToothPresent && implantStatus === 0) return null;

  const implantKey = `${svgId === 'upper-svg-placeholder-01' || svgId === 'lower-svg-placeholder-02' ? 'b' : 'p'}`;
  const coordKey = `implant_${tooth}_${implantKey}`;
  const coords = IMPLANT_COORDINATES[coordKey];

  if (!coords) return null;

  const transform = `translate(${coords.x - 12}, ${coords.y - 12})`;
  return (
    <g transform={transform}>
      <ImplantIcon status={implantStatus} size={24} />
    </g>
  );
}