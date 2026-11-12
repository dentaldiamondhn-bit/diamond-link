'use client';

import React from 'react';
import { ChartData, FDIToothNumber, SurfaceId } from '@/lib/types';
import {
  ChartViewId,
  getToothCenterX,
  getViewConfig,
  getViewSurfacesOrdered,
} from '@/lib/utils/chartGeometry';
import { isToothPresent } from '@/lib/utils/periodontalAnalysis';
import { getToothDimensions } from '@/lib/utils/toothAnatomy';
import { getSiteCrownTransform, getSiteToothCrown } from '@/lib/periodontal/toothSvgPaths';
import { useChartStore } from '@/lib/store/useChartStore';

interface ToothSurfaceSvgProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
  activeRemoteControl: string;
}

const SURFACE_LABELS: Record<SurfaceId, string> = {
  mb: 'Mesiobuccal',
  b: 'Bucal',
  db: 'Distobuccal',
  mp: 'Mesopalatino',
  p: 'Palatino',
  dp: 'Distopalatino',
  ml: 'Mesiolingual',
  l: 'Lingual',
  dl: 'Distolingual',
};

function toSiteSurfaceKey(surface: SurfaceId): 'm' | 'b' | 'd' | 'p' | 'l' {
  if (surface === 'mb' || surface === 'mp' || surface === 'ml') return 'm';
  if (surface === 'db' || surface === 'dp' || surface === 'dl') return 'd';
  return surface;
}

export function ToothSurfaceSvg({
  tooth,
  viewId,
  data,
  activeRemoteControl,
}: ToothSurfaceSvgProps) {
  const toggleBop = useChartStore(state => state.toggleBop);
  const togglePlaque = useChartStore(state => state.togglePlaque);
  const isOverlayMode = useChartStore(state => state.isOverlayMode);

  if (!isToothPresent(data, tooth)) return null;

  const config = getViewConfig(viewId);
  const { rootDirection } = config;
  const surfaces = getViewSurfacesOrdered(tooth, viewId);
  const dims = getToothDimensions(tooth);
  const crown = getSiteToothCrown(tooth);
  const crownTransform = getSiteCrownTransform(tooth, dims.crownHalfWidth * 2, dims.crownHeight);
  const toothX = getToothCenterX(tooth, viewId);
  const toothY = config.zeroLineY;
  const flip = rootDirection === 1 ? -1 : 1;

  const getSurfacePath = (surface: SurfaceId): string | undefined => {
    const key = toSiteSurfaceKey(surface);
    return (crown.surfaces as Readonly<Record<string, string>>)[key];
  };

  const handleClick = (surface: SurfaceId) => {
    if (isOverlayMode) return;
    if (activeRemoteControl === 'bop') toggleBop(tooth, surface);
    else if (activeRemoteControl === 'plaque') togglePlaque(tooth, surface);
  };

  return (
    <g transform={`translate(${toothX} ${toothY}) scale(1 ${flip})`}>
      <g transform={crownTransform}>
        {surfaces.map(surface => {
          const d = getSurfacePath(surface);
          if (!d) return null;

          return (
            <path
              key={`${tooth}-${viewId}-${surface}`}
              d={d}
              fill="transparent"
              stroke="none"
              pointerEvents="all"
              className="cursor-pointer"
              onClick={() => handleClick(surface)}
            >
              <title>{`${tooth} ${SURFACE_LABELS[surface]}`}</title>
            </path>
          );
        })}
      </g>
    </g>
  );
}
