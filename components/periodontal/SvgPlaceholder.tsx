'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import {
  ChartViewId,
  getSurfaceX,
  getViewConfig,
  getViewTeeth,
  SVG_VIEWBOX_HEIGHT,
  SVG_VIEWBOX_WIDTH,
} from '@/lib/utils/chartGeometry';
import { ToothOutlineSvg } from './ToothOutlineSvg';
import { readNumber } from '@/lib/utils/periodontalAnalysis';
import { getToothCenterX } from '@/lib/utils/chartGeometry';
import { PerioPolygon } from './PerioPolygon';
import { ToothSurfaceSvg } from './ToothSurfaceSvg';
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

const BACKGROUND_IMAGES: Record<ChartViewId, string> = {
  'upper-svg-placeholder-01': '/img/jpg/ok-teeth-01.jpg',
  'upper-svg-placeholder-02': '/img/jpg/ok-teeth-02.jpg',
  'lower-svg-placeholder-01': '/img/jpg/uk-teeth-01.jpg',
  'lower-svg-placeholder-02': '/img/jpg/uk-teeth-02.jpg',
};

const GRID_STROKE = '#4b5563';
const ZERO_STROKE = '#f59e0b';

export function SvgPlaceholder({
  id,
  data,
  isGmInverted,
  activeRemoteControl,
  overlayData,
}: SvgPlaceholderProps) {
  const config = getViewConfig(id);
  const teeth = getViewTeeth(id);

  const highlightThreshold =
    activeRemoteControl === '5mm' ? 5 : activeRemoteControl === '6mmplus' ? 6 : null;
  const highlightColor = activeRemoteControl === '5mm' ? '#fbbf24' : '#ef4444';

  const backgroundImage = BACKGROUND_IMAGES[id];

  return (
    <div id={id} className="w-full">
      <div
        className="relative w-full overflow-hidden rounded"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          aspectRatio: `${SVG_VIEWBOX_WIDTH} / ${SVG_VIEWBOX_HEIGHT}`,
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={`al-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#000080" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {Array.from({ length: 16 }, (_, i) => {
            const y = (i + 1) * (SVG_VIEWBOX_HEIGHT / 16);
            return (
              <line
                key={`grid-${y}`}
                x1={0}
                y1={y}
                x2={SVG_VIEWBOX_WIDTH}
                y2={y}
                stroke={GRID_STROKE}
                strokeWidth={0.5}
                strokeOpacity={0.35}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          <line
            x1={0}
            y1={config.zeroLineY}
            x2={SVG_VIEWBOX_WIDTH}
            y2={config.zeroLineY}
            stroke={ZERO_STROKE}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* Tooth outlines - crown + root or implant */}
          {teeth.map(tooth => {
            const { zeroLineY } = getViewConfig(id);
            const x = getToothCenterX(tooth, id);
            return (
              <ToothOutlineSvg
                key={`outline-${tooth}`}
                tooth={tooth}
                viewId={id}
                data={data}
                x={x}
                y={zeroLineY}
              />
            );
          })}

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

          {teeth.map(tooth => {
            const status = readNumber(data[`implant_${tooth}`]);
            if (!status || status < 1) return null;
            const { rootDirection, zeroLineY } = getViewConfig(id);
            const template = getToothTemplate(tooth);
            const surface = (getViewConfig(id).kind === 'buccal' ? 'b' : id.startsWith('upper') ? 'p' : 'l') as 'b' | 'p' | 'l';
            const x = getSurfaceX(tooth, surface);
            const width = template.crownHalfWidth * 0.55;
            const length = getToothRootLength(tooth) * 0.95;
            const minY = Math.min(zeroLineY, zeroLineY + rootDirection * length);
            const maxY = Math.max(zeroLineY, zeroLineY + rootDirection * length);
            return (
              <rect
                key={`implant-mask-${tooth}`}
                x={x - width}
                y={minY}
                width={width * 2}
                height={maxY - minY + 4}
                className="fill-white dark:fill-gray-800"
                stroke="none"
              />
            );
          })}

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
    </div>
  );
}
