'use client';

import React from 'react';
import { ChartData, FDIToothNumber, ActiveIndices } from '@/lib/types';
import { POLYGON_ZERO_LINES } from '@/lib/utils/coordinateMaps';
import { PerioPolygon } from './PerioPolygon';
import { ToothSurfaceSvg } from './ToothSurfaceSvg';
import { FurcationMarker } from './FurcationMarker';
import { ImplantMarker } from './ImplantMarker';
import { MissingToothDiagonal } from './MissingToothDiagonal';
import { InterProximalPolygon } from './InterProximalPolygon';

interface SvgPlaceholderProps {
  id: string;
  view: 'buccal' | 'oral';
  teeth: FDIToothNumber[];
  data: ChartData;
  viewStatus: 0 | 1 | 2;
  isGmInverted: boolean;
  activeIndices: ActiveIndices;
  activeRemoteControl: string;
  overlayData?: ChartData | null;
}

export function SvgPlaceholder({
  id,
  view,
  teeth,
  data,
  viewStatus,
  isGmInverted,
  activeIndices,
  activeRemoteControl,
  overlayData,
}: SvgPlaceholderProps) {
  const zeroLineY = POLYGON_ZERO_LINES[id] || 200;

  return (
    <div id={id} className="w-full">
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: '800px' }}>
        <svg
          viewBox="0 0 1800 400"
          preserveAspectRatio="none"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f0f0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[100, 200, 300].map(y => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={1800}
            y2={y}
            stroke="#e0e0e0"
            strokeWidth="0.5"
          />
        ))}

        <line
          x1={0}
          y1={zeroLineY}
          x2={1800}
          y2={zeroLineY}
          stroke="#999"
          strokeWidth="1.5"
        />

        {teeth.slice(1).map((tooth, i) => {
          const prevTooth = teeth[i];
          return (
            <InterProximalPolygon
              key={`inter-${prevTooth}-${tooth}`}
              tooth={tooth}
              prevTooth={prevTooth}
              svgId={id}
              data={data}
              isGmInverted={isGmInverted}
            />
          );
        })}

        {teeth.map(tooth => (
          <PerioPolygon
            key={`perio-${tooth}`}
            tooth={tooth}
            svgId={id}
            data={data}
            viewStatus={viewStatus}
            isGmInverted={isGmInverted}
            activeIndices={activeIndices}
            overlayData={overlayData}
          />
        ))}

        {teeth.map(tooth => (
          <FurcationMarker key={`furc-${tooth}`} tooth={tooth} svgId={id} data={data} />
        ))}

        {teeth.map(tooth => (
          <ImplantMarker key={`impl-${tooth}`} tooth={tooth} svgId={id} data={data} />
        ))}

        {teeth.map(tooth => (
          <MissingToothDiagonal key={`missing-${tooth}`} tooth={tooth} svgId={id} data={data} />
        ))}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {teeth.map(tooth => (
          <ToothSurfaceSvg
            key={`surface-${tooth}`}
            tooth={tooth}
            view={view}
            data={data}
            activeRemoteControl={activeRemoteControl}
          />
        ))}
      </div>
        </div>
      </div>
    </div>
  );
}