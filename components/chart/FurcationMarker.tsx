'use client';

import React from 'react';
import { ChartData, FDIToothNumber, FurcationSite } from '@/lib/types';
import { FURCATION_CHART_COORDINATES } from '@/lib/constants/furcation';

interface FurcationMarkerProps {
  tooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
}

function FurcationSymbol({ grade, size = 12 }: { grade: number; size?: number }) {
  const radius = size / 2;
  const center = size / 2;

  if (grade === 1) {
    return (
      <circle
        key="furcation-1"
        cx={center}
        cy={center}
        r={radius - 1}
        fill="none"
        stroke="black"
        strokeWidth="2"
      />
    );
  }

  if (grade === 2) {
    return (
      <g key="furcation-2">
        <circle
          cx={center}
          cy={center}
          r={radius - 1}
          fill="none"
          stroke="black"
          strokeWidth="2"
        />
        <path
          d={`M${center},${center - radius + 2} L${center},${center + radius - 2}`}
          stroke="black"
          strokeWidth="2"
        />
        <path
          d={`M${center - radius + 2},${center} L${center + radius - 2},${center}`}
          stroke="black"
          strokeWidth="1"
        />
      </g>
    );
  }

  if (grade === 3) {
    return (
      <circle
        key="furcation-3"
        cx={center}
        cy={center}
        r={radius - 1}
        fill="black"
        stroke="black"
        strokeWidth="1"
      />
    );
  }

  return null;
}

export function FurcationMarker({ tooth, svgId, data }: FurcationMarkerProps) {
  const isUpper = tooth >= 11 && tooth <= 28;
  const _isLower = tooth >= 31 && tooth <= 48;

  const furcationSites: FurcationSite[] = isUpper
    ? (['b', 'dp', 'mp'] as FurcationSite[]).filter(site =>
        ['b', 'dp', 'mp'].includes(site) &&
        (data[`furcation_${tooth}_${site}`] as number) > 0
      )
    : (['b', 'l'] as FurcationSite[]).filter(site =>
        ['b', 'l'].includes(site) &&
        (data[`furcation_${tooth}_${site}`] as number) > 0
      );

  if (furcationSites.length === 0) return null;

  const chartCoords = FURCATION_CHART_COORDINATES[svgId] || {};

  return (
    <g>
      {furcationSites.map(site => {
        const key = `furcation_${tooth}_${site}`;
        const grade = (data[key] as number) || 0;
        if (grade === 0) return null;

        const coords = chartCoords[key];
        if (!coords) return null;

        const transform = `translate(${coords.x - 6}, ${coords.y - 6})`;
        return (
          <g key={key} transform={transform}>
            <FurcationSymbol grade={grade} size={12} />
          </g>
        );
      })}
    </g>
  );
}