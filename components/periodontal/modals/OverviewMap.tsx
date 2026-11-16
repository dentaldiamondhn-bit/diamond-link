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
      stroke="black"
      strokeWidth={2.5}
    />
  );

  return (
    <g>
      {outline}
      {grade === 2 && (
        <path
          d={`M ${x} ${y - FURCATION_RADIUS} A ${FURCATION_RADIUS} ${FURCATION_RADIUS} 0 0 0 ${x} ${y + FURCATION_RADIUS} L ${x} ${y} Z`}
          fill="black"
        />
      )}
      {grade === 3 && <circle cx={x} cy={y} r={FURCATION_RADIUS} fill="black" />}
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
    >
      {fills.map(fill => {
        const positive = (kind === 'bop' ? fill.bop : fill.pi) === 1;
        const fillValue = fill.missing ? '#808080' : positive ? color : '#FFFFFF';
        const fillOpacity = fill.missing ? '0.4' : '1';
        return (
          <path
            key={fill.id}
            d={OVERVIEW_SITE_PATHS.find(p => p.id === fill.id)?.d ?? ''}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke="#000000"
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
              fill="yellow"
              stroke="orange"
              strokeWidth={2}
              opacity={0.3}
            />
          ))}

      {visiblePdTexts.map(text => (
        <text
          key={`pd-text-${text.tooth}-${text.surface}`}
          x={text.x}
          y={text.y}
          fontSize={14}
          fill="red"
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
              fill="white"
              stroke="gray"
              strokeWidth={2}
            />
            <text
              x={implant.x}
              y={implant.y + 5}
              fontSize={14}
              fill="black"
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
        fill="black"
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
        fill={color}
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        textAnchor="end"
      >
        {percent}%
      </text>
    </svg>
  );
}
