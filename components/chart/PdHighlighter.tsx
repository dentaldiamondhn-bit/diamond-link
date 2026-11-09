'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import { getAllSurfacesForTooth } from '@/lib/constants/surfaces';
import { isUpperJaw, isRightSide } from '@/lib/constants/teeth';
import { X_COORDINATES, POLYGON_ZERO_LINES, POLYGON_SCALE } from '@/lib/utils/coordinateMaps';

interface PdHighlighterProps {
  data: ChartData;
  isGmInverted: boolean;
  threshold: '5mm' | '6mmplus';
}

export function PdHighlighter({ data, isGmInverted, threshold }: PdHighlighterProps) {
  const minValue = threshold === '5mm' ? 5 : 6;
  const maxValue = threshold === '5mm' ? 6 : 20;
  const color = threshold === '5mm' ? '#fbbf24' : '#ef4444';

  const teeth: FDIToothNumber[] = [
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41,
    31, 32, 33, 34, 35, 36, 37, 38,
  ];

  const highlights: { x: number; y: number; r: number; svgId: string }[] = [];

  for (const tooth of teeth) {
    const isToothPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
    const isImplantActive = (data[`implant_${tooth}`] as number) > 0;
    if (!isToothPresent || isImplantActive) continue;

    const isUpper = isUpperJaw(tooth);
    const isRight = isRightSide(tooth);
    const surfaces = getAllSurfacesForTooth(tooth);

    for (const surface of surfaces) {
      const pdKey = `pd_${tooth}_${surface}`;
      const pd = parseFloat(data[pdKey]) || 0;

      if (pd >= minValue && pd < maxValue) {
        let svgId: string;

        if (isUpper) {
          if (isRight) {
            svgId = ['mb', 'b', 'db'].includes(surface) ? 'upper-svg-placeholder-01' : 'upper-svg-placeholder-02';
          } else {
            svgId = ['mb', 'b', 'db'].includes(surface) ? 'upper-svg-placeholder-01' : 'upper-svg-placeholder-02';
          }
        } else {
          if (isRight) {
            svgId = ['ml', 'l', 'dl'].includes(surface) ? 'lower-svg-placeholder-01' : 'lower-svg-placeholder-02';
          } else {
            svgId = ['ml', 'l', 'dl'].includes(surface) ? 'lower-svg-placeholder-01' : 'lower-svg-placeholder-02';
          }
        }

        const toothXCoords = X_COORDINATES[tooth];
        const zeroLineY = POLYGON_ZERO_LINES[svgId] || 0;
        const scale = POLYGON_SCALE;
        const gm = parseFloat(data[`gm_${tooth}_${surface}`]) || 0;
        const adjustedGm = isGmInverted ? -gm : gm;

        let pdY: number;
        let x: number;

        if (!isUpper) {
          if (svgId === 'lower-svg-placeholder-01') {
            pdY = zeroLineY + adjustedGm * scale - pd * scale;
            x = surface === 'b' ? (toothXCoords['db'] + toothXCoords['mb']) / 2 :
                surface === 'p' ? (toothXCoords['dp'] + toothXCoords['mp']) / 2 :
                surface === 'l' ? (toothXCoords['dl'] + toothXCoords['ml']) / 2 :
                toothXCoords[surface];
          } else {
            pdY = zeroLineY - adjustedGm * scale + pd * scale;
            x = surface === 'b' ? (toothXCoords['db'] + toothXCoords['mb']) / 2 :
                surface === 'p' ? (toothXCoords['dp'] + toothXCoords['mp']) / 2 :
                surface === 'l' ? (toothXCoords['dl'] + toothXCoords['ml']) / 2 :
                toothXCoords[surface];
          }
        } else {
          if (svgId === 'upper-svg-placeholder-01') {
            pdY = zeroLineY + adjustedGm * scale - pd * scale;
            x = surface === 'b' ? (toothXCoords['db'] + toothXCoords['mb']) / 2 :
                surface === 'p' ? (toothXCoords['dp'] + toothXCoords['mp']) / 2 :
                surface === 'l' ? (toothXCoords['dl'] + toothXCoords['ml']) / 2 :
                toothXCoords[surface];
          } else {
            pdY = zeroLineY - adjustedGm * scale + pd * scale;
            x = surface === 'b' ? (toothXCoords['db'] + toothXCoords['mb']) / 2 :
                surface === 'p' ? (toothXCoords['dp'] + toothXCoords['mp']) / 2 :
                surface === 'l' ? (toothXCoords['dl'] + toothXCoords['ml']) / 2 :
                toothXCoords[surface];
          }
        }

        highlights.push({ x, y: pdY, r: Math.max(4, pd * scale / 3), svgId });
      }
    }
  }

  return (
    <g className="pd-highlights">
      {highlights.map((h, i) => (
        <circle
          key={`${h.svgId}-${i}`}
          cx={h.x}
          cy={h.y}
          r={h.r}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      ))}
    </g>
  );
}