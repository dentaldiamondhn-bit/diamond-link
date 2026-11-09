'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import { getSurfaceElementBounds, SVG_VIEWBOX_WIDTH, SVG_VIEWBOX_HEIGHT } from '@/lib/utils/coordinateMaps';
import { useChartStore } from '@/lib/store/useChartStore';

interface ToothSurfaceSvgProps {
  tooth: FDIToothNumber;
  view: 'buccal' | 'oral';
  data: ChartData;
  activeRemoteControl: string;
}

const SURFACE_DISPLAY_NAMES: Record<SurfaceId, string> = {
  mb: 'MB', b: 'B', db: 'DB',
  mp: 'MP', p: 'P', dp: 'DP',
  ml: 'ML', l: 'L', dl: 'DL',
};

export function ToothSurfaceSvg({ tooth, view, data, activeRemoteControl }: ToothSurfaceSvgProps) {
  const toggleToothIndex = useChartStore((state) => state.toggleToothIndex);
  const isOverlayMode = useChartStore((state) => state.isOverlayMode);

  const isPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;

  const isUpper = tooth >= 11 && tooth <= 28;
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);

  let surfaces: SurfaceId[] = [];
  let svgId: string;

  if (isUpper) {
    if (view === 'buccal') {
      svgId = 'upper-svg-placeholder-01';
      surfaces = isRight ? ['db', 'b', 'mb'] : ['mb', 'b', 'db'];
    } else {
      svgId = 'upper-svg-placeholder-02';
      surfaces = isRight ? ['mp', 'p', 'dp'] : ['dp', 'p', 'mp'];
    }
  } else {
    if (view === 'buccal') {
      svgId = 'lower-svg-placeholder-02';
      surfaces = isRight ? ['mb', 'b', 'db'] : ['db', 'b', 'mb'];
    } else {
      svgId = 'lower-svg-placeholder-01';
      surfaces = isRight ? ['dl', 'l', 'ml'] : ['ml', 'l', 'dl'];
    }
  }

  const getSurfaceColor = (surfaceId: SurfaceId): string => {
    if (activeRemoteControl !== 'bop' && activeRemoteControl !== 'plaque') return '#F2F2F2';

    const prefix = activeRemoteControl === 'bop' ? 'bop' : 'pi';
    const key = `${prefix}_${tooth}_${surfaceId}`;
    const isActive = data[key] === '1' || data[key] === 1;

    return isActive
      ? (activeRemoteControl === 'bop' ? '#ef4444' : '#3b82f6')
      : '#F2F2F2';
  };

  const handleSurfaceClick = () => {
    if (isOverlayMode) return;

    if (activeRemoteControl === 'bop') {
      toggleToothIndex(tooth, 'bop');
    } else if (activeRemoteControl === 'plaque') {
      toggleToothIndex(tooth, 'pi');
    }
  };

  if (!isPresent) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {surfaces.map(surface => {
        const bounds = getSurfaceElementBounds(tooth, surface, svgId);
        if (bounds.w === 0 || bounds.h === 0) return null;

        return (
          <svg
            key={`${tooth}-${surface}`}
            id={`surface-${tooth}${surface}`}
            className="absolute cursor-pointer pointer-events-auto"
            style={{
              left: `${(bounds.x / SVG_VIEWBOX_WIDTH) * 100}%`,
              top: `${(bounds.y / SVG_VIEWBOX_HEIGHT) * 100}%`,
              width: `${(bounds.w / SVG_VIEWBOX_WIDTH) * 100}%`,
              height: `${(bounds.h / SVG_VIEWBOX_HEIGHT) * 100}%`,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            onClick={() => handleSurfaceClick()}
          >
            <path
              d={bounds.path}
              fill={getSurfaceColor(surface)}
              stroke="#ccc"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <title>{`${tooth} ${SURFACE_DISPLAY_NAMES[surface]}`}</title>
          </svg>
        );
      })}
    </div>
  );
}
