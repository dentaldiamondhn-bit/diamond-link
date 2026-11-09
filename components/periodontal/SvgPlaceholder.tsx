'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import {
  ChartViewId,
  getGridLines,
  getToothCenterX,
  getViewConfig,
  getViewTeeth,
  SVG_VIEWBOX_HEIGHT,
  SVG_VIEWBOX_WIDTH,
} from '@/lib/utils/chartGeometry';
import { PerioPolygon } from './PerioPolygon';
import { ToothSurfaceSvg } from './ToothSurfaceSvg';
import { ToothOutlineSvg } from './ToothOutlineSvg';
import { FurcationMarker } from './FurcationMarker';
import { ImplantMarker } from './ImplantMarker';
import { MissingToothDiagonal } from './MissingToothDiagonal';
import { InterProximalPolygon } from './InterProximalPolygon';
import { PdHighlighter } from './PdHighlighter';

interface SvgPlaceholderProps {
  id: ChartViewId;
  data: ChartData;
  isGmInverted: boolean;
  activeRemoteControl: string;
  overlayData?: ChartData | null;
}

const GRID_STROKE = '#4b5563';
const ZERO_STROKE = '#ef4444';

export function SvgPlaceholder({
  id,
  data,
  isGmInverted,
  activeRemoteControl,
  overlayData,
}: SvgPlaceholderProps) {
  const config = getViewConfig(id);
  const teeth = getViewTeeth(id);
  const gridLines = getGridLines();

  const highlightThreshold =
    activeRemoteControl === '5mm' ? 5 : activeRemoteControl === '6mmplus' ? 6 : null;
  const highlightColor = activeRemoteControl === '5mm' ? '#fbbf24' : '#ef4444';

  return (
    <div id={id} className="w-full">
      <svg
        viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block"
        style={{ aspectRatio: `${SVG_VIEWBOX_WIDTH} / ${SVG_VIEWBOX_HEIGHT}` }}
      >
        <defs>
          <linearGradient id={`al-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000080" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {gridLines.map(y => (
          <line
            key={`grid-${y}`}
            x1={0}
            y1={y}
            x2={SVG_VIEWBOX_WIDTH}
            y2={y}
            stroke={GRID_STROKE}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <line
          x1={0}
          y1={config.zeroLineY}
          x2={SVG_VIEWBOX_WIDTH}
          y2={config.zeroLineY}
          stroke={ZERO_STROKE}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {teeth.map(tooth => (
          <ToothOutlineSvg
            key={`outline-${tooth}`}
            tooth={tooth}
            view={config.kind}
            x={getToothCenterX(tooth, id)}
            y={config.zeroLineY}
            rootDirection={config.rootDirection}
            data={data}
          />
        ))}

        {teeth.slice(1).map((tooth, index) => (
          <InterProximalPolygon
            key={`inter-${teeth[index]}-${tooth}`}
            tooth={tooth}
            prevTooth={teeth[index]}
            viewId={id}
            data={data}
            isGmInverted={isGmInverted}
          />
        ))}

        {teeth.map(tooth => (
          <PerioPolygon
            key={`perio-${tooth}`}
            tooth={tooth}
            viewId={id}
            data={data}
            isGmInverted={isGmInverted}
            overlayData={overlayData}
          />
        ))}

        {highlightThreshold !== null &&
          teeth.map(tooth => (
            <PdHighlighter
              key={`pd-high-${tooth}`}
              tooth={tooth}
              viewId={id}
              data={data}
              isGmInverted={isGmInverted}
              threshold={highlightThreshold}
              color={highlightColor}
            />
          ))}

        {teeth.map(tooth => (
          <FurcationMarker key={`furc-${tooth}`} tooth={tooth} viewId={id} data={data} />
        ))}

        {teeth.map(tooth => (
          <ImplantMarker key={`impl-${tooth}`} tooth={tooth} viewId={id} data={data} />
        ))}

        {teeth.map(tooth => (
          <MissingToothDiagonal key={`missing-${tooth}`} tooth={tooth} viewId={id} data={data} />
        ))}

        {teeth.map(tooth => (
          <ToothSurfaceSvg
            key={`surface-${tooth}`}
            tooth={tooth}
            viewId={id}
            data={data}
            isGmInverted={isGmInverted}
            activeRemoteControl={activeRemoteControl}
          />
        ))}
      </svg>
    </div>
  );
}
