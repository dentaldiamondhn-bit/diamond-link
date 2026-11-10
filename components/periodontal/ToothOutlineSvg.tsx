'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, getViewConfig } from '@/lib/utils/chartGeometry';
import { getCrownPath, getRootPaths, getToothDimensions } from '@/lib/utils/toothAnatomy';
import { isToothPresent, readNumber } from '@/lib/utils/periodontalAnalysis';

interface ToothOutlineSvgProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  x: number;
  y: number;
}

const IMPLANT_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#ef4444',
  3: '#22c55e',
};

function getImplantScrewPath(rootLength: number, rootWidth: number, rootDirection: -1 | 1): string {
  const w = rootWidth * 0.6;
  const len = rootLength * 0.9;
  const tipY = rootDirection * len;

  return [
    `M ${-w} 0`,
    `L ${-w} ${tipY * 0.15}`,
    `L ${-w * 0.85} ${tipY * 0.15}`,
    `L ${-w * 0.85} ${tipY * 0.3}`,
    `L ${-w} ${tipY * 0.3}`,
    `L ${-w} ${tipY * 0.45}`,
    `L ${-w * 0.85} ${tipY * 0.45}`,
    `L ${-w * 0.85} ${tipY * 0.6}`,
    `L ${-w} ${tipY * 0.6}`,
    `L ${-w} ${tipY * 0.75}`,
    `L ${-w * 0.85} ${tipY * 0.75}`,
    `L ${-w * 0.85} ${tipY * 0.9}`,
    `L ${-w} ${tipY * 0.9}`,
    `L ${-w} ${tipY}`,
    `L 0 ${tipY + rootDirection * 4}`,
    `L ${w} ${tipY}`,
    `L ${w} ${tipY * 0.9}`,
    `L ${w * 0.85} ${tipY * 0.9}`,
    `L ${w * 0.85} ${tipY * 0.75}`,
    `L ${w} ${tipY * 0.75}`,
    `L ${w} ${tipY * 0.6}`,
    `L ${w * 0.85} ${tipY * 0.6}`,
    `L ${w * 0.85} ${tipY * 0.45}`,
    `L ${w} ${tipY * 0.45}`,
    `L ${w} ${tipY * 0.3}`,
    `L ${w * 0.85} ${tipY * 0.3}`,
    `L ${w * 0.85} ${tipY * 0.15}`,
    `L ${w} ${tipY * 0.15}`,
    `L ${w} 0`,
    'Z',
  ].join(' ');
}

export function ToothOutlineSvg({ tooth, viewId, data, x, y }: ToothOutlineSvgProps) {
  const config = getViewConfig(viewId);
  const rootDirection = config.rootDirection;
  const hasImplant = readNumber(data[`implant_${tooth}`]) > 0;
  const implantStatus = readNumber(data[`implant_${tooth}`]);
  const isPresent = isToothPresent(data, tooth);

  if (!isPresent) return null;

  const crownPath = getCrownPath(tooth);
  const rootPaths = getRootPaths(tooth, config.kind);
  const template = getToothDimensions(tooth);
  const rootWidth = template.rootWidth;

  const flip = rootDirection === 1 ? -1 : 1;

  const implantColor = IMPLANT_COLORS[implantStatus] ?? IMPLANT_COLORS[1];

  return (
    <g transform={`translate(${x} ${y}) scale(1 ${flip})`}>
      {/* Crown: always rendered */}
      <path
        d={crownPath}
        fill="none"
        stroke="#1f2937"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />

      {/* Natural root or implant */}
      {!hasImplant ? (
        rootPaths.map((path, index) => (
          <path
            key={`root-${index}`}
            d={path}
            fill="none"
            stroke="#1f2937"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))
      ) : (
        <g id={`implant-screw-${tooth}`}>
          <path
            d={getImplantScrewPath(
              0,
              rootWidth,
            )}
            fill={implantColor}
            stroke="#111827"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </g>
  );
}