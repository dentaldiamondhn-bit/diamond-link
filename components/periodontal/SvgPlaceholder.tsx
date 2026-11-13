'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import {
  ChartViewId,
  getMmLineYs,
  getViewConfig,
  getViewTeeth,
  SVG_VIEWBOX_HEIGHT,
  SVG_VIEWBOX_WIDTH,
} from '@/lib/utils/chartGeometry';
import { ImplantOverlay } from './ImplantOverlay';
import { PerioPolygon } from './PerioPolygon';
import { ToothSurfaceSvg } from './ToothSurfaceSvg';
import { ToothSurfaceMarkers } from './ToothSurfaceMarkers';
import { FurcationMarker } from './FurcationMarker';
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
        style={{ aspectRatio: `${SVG_VIEWBOX_WIDTH} / ${SVG_VIEWBOX_HEIGHT}` }}
      >
        <div
          className="absolute inset-0 z-[1]"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        {/* z-2: implant PNGs are the bottom overlay layer, exactly like the
            site (site: .implant-marker z-index 3 < .svg-placeholder z-index
            5). The mm grid (z-3) and the GM/PD polygons (z-4) paint over
            them so the lines stay visible. */}
        <div className="pointer-events-none absolute inset-0 z-[2]">
          {teeth.map(tooth => (
            <ImplantOverlay key={`implant-overlay-${tooth}`} tooth={tooth} viewId={id} data={data} />
          ))}
        </div>

        {/* z-3: zero (CEJ) line plus 16 mm lines at 1 mm intervals extending
            from the CEJ into the root area only, exactly like the site's
            chart renderer (stroke #000, width 1.25). Painted over the
            implant PNGs like on the site. */}
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
          style={{ display: 'block' }}
        >
          {getMmLineYs(id).map(y => (
            <line
              key={`grid-${y}`}
              x1={0}
              y1={y}
              x2={SVG_VIEWBOX_WIDTH}
              y2={y}
              stroke="#000"
              strokeWidth={1.25}
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
        </svg>

        <svg
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={`al-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#000080" stopOpacity="0.35" />
            </linearGradient>
          </defs>

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
            <MissingToothDiagonal key={`missing-${tooth}`} tooth={tooth} viewId={id} data={data} />
          ))}

          {teeth.map(tooth => (
            <ToothSurfaceMarkers
              key={`surface-marker-${tooth}`}
              tooth={tooth}
              viewId={id}
              data={data}
              isGmInverted={isGmInverted}
            />
          ))}
        </svg>

        <svg
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 z-[5] h-full w-full"
          style={{ display: 'block' }}
        >
          {teeth.map(tooth => (
            <ToothSurfaceSvg
              key={`surface-${tooth}`}
              tooth={tooth}
              viewId={id}
              data={data}
              activeRemoteControl={activeRemoteControl}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
