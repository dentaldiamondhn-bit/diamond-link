'use client';

import React from 'react';
import type {
  OverviewFurcationMarker,
  OverviewImplantMarker,
  OverviewPdText,
  OverviewSiteFill,
} from '@/lib/utils/periodontalOverview';
import { OVERVIEW_SITE_PATHS } from '@/lib/constants/overviewSites';

const FURCATION_RADIUS = 7;
const IMPLANT_RADIUS = 9;

// Per-map layer switches for the Historial section (site toggles PD/BOP,
// PD >= 6mm, Furcaciones, Implantes and PI +). Everything stays visible when
// omitted, which keeps the Resumen modal behaviour untouched.
export interface OverviewLayerVisibility {
  pdText?: boolean;
  circles?: boolean;
  furcations?: boolean;
  implants?: boolean;
}

export function OverviewFurcationMarkerSvg({ marker }: { marker: OverviewFurcationMarker }) {
  const { grade, x, y } = marker;
  const outline = (
    <circle
      cx={x}
      cy={y}
      r={FURCATION_RADIUS}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    />
  );

  return (
    <g color="currentColor">
      {outline}
      {grade === 2 && (
        <path
          d={`M ${x} ${y - FURCATION_RADIUS} A ${FURCATION_RADIUS} ${FURCATION_RADIUS} 0 0 0 ${x} ${y + FURCATION_RADIUS} L ${x} ${y} Z`}
          fill="currentColor"
        />
      )}
      {grade === 3 && <circle cx={x} cy={y} r={FURCATION_RADIUS} fill="currentColor" />}
    </g>
  );
}

interface OverviewMapProps {
  kind: 'pi' | 'bop';
  fills: OverviewSiteFill[];
  pdTexts: OverviewPdText[];
  furcations: OverviewFurcationMarker[];
  implants: OverviewImplantMarker[];
  dateText: string;
  percent: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  layerVisibility?: OverviewLayerVisibility;
}

export function OverviewMap({
  kind,
  fills,
  pdTexts,
  furcations,
  implants,
  dateText,
  percent,
  svgRef,
  layerVisibility,
}: OverviewMapProps) {
  const visibility = {
    pdText: true,
    circles: true,
    furcations: true,
    implants: true,
    ...layerVisibility,
  };
  const color = kind === 'bop' ? '#FF0000' : '#0000FF';
  const label = kind === 'bop' ? 'Sangrado al sondaje (BOP)' : 'Índice de placa (PI)';
  const visiblePdTexts = visibility.pdText ? pdTexts : [];

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 300"
      className="w-full"
      role="img"
      aria-label={`${label} ${percent}% — ${dateText}`}
      style={{ color: 'inherit' }}
    >
      <defs>
        <style>{`
          .overview-bg { fill: var(--overview-bg, #FFFFFF); }
          .overview-stroke { stroke: var(--overview-stroke, #000000); }
          .overview-text { fill: var(--overview-text, #000000); }
          .overview-tooth-text { fill: var(--overview-tooth-text, #000000); }
          .overview-percent-text { fill: var(--overview-percent-text, ${color}); }
          .overview-pd-text { fill: var(--overview-pd-text, red); }
          .overview-pd-circle { fill: yellow; stroke: orange; opacity: 0.3; }
          .overview-furcation { color: var(--overview-furcation, #000000); }
          .overview-implant-bg { fill: var(--overview-implant-bg, white); }
          .overview-implant-stroke { stroke: var(--overview-implant-stroke, gray); }
          .overview-implant-text { fill: var(--overview-implant-text, black); }
          .overview-missing { fill: var(--overview-missing, #808080); fill-opacity: 0.4; }
        `}</style>
      </defs>
      {fills.map(fill => {
        const positive = (kind === 'bop' ? fill.bop : fill.pi) === 1;
        const fillClass = fill.missing ? 'overview-missing' : positive ? '' : 'overview-bg';
        const fillStyle = fill.missing ? undefined : positive ? { fill: color } : undefined;
        return (
          <path
            key={fill.id}
            d={OVERVIEW_SITE_PATHS.find(p => p.id === fill.id)?.d ?? ''}
            className={fillClass}
            style={fillStyle}
            stroke="var(--overview-stroke, #000000)"
            strokeWidth={1}
            strokeMiterlimit={10}
          />
        );
      })}

      {visibility.circles &&
        visiblePdTexts
          .filter(text => text.highlighted)
          .map(text => (
            <circle
              key={`pd-circle-${text.tooth}-${text.surface}`}
              cx={text.x}
              cy={text.y - 5}
              r={10}
              className="overview-pd-circle"
            />
          ))}

      {visiblePdTexts.map(text => (
        <text
          key={`pd-text-${text.tooth}-${text.surface}`}
          x={text.x}
          y={text.y}
          fontSize={14}
          className="overview-pd-text"
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
        >
          {text.value}
        </text>
      ))}

      {visibility.furcations &&
        furcations.map(marker => (
          <OverviewFurcationMarkerSvg
            key={`furcation-${marker.tooth}-${marker.site}`}
            marker={marker}
          />
        ))}

      {visibility.implants &&
        implants.map(implant => (
          <g key={`implant-${implant.tooth}`}>
            <circle
              cx={implant.x}
              cy={implant.y}
              r={IMPLANT_RADIUS}
              className="overview-implant-bg"
              stroke="var(--overview-implant-stroke, gray)"
              strokeWidth={2}
            />
            <text
              x={implant.x}
              y={implant.y + 5}
              fontSize={14}
              className="overview-implant-text"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              I
            </text>
          </g>
        ))}

      <text
        x={30}
        y={160}
        fontSize={24}
        className="overview-text"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        textAnchor="start"
      >
        {dateText}
      </text>
      <text
        x={960}
        y={160}
        fontSize={24}
        className="overview-percent-text"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        textAnchor="end"
      >
        {percent}%
      </text>
    </svg>
  );
}
