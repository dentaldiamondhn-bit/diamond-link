'use client';

import React from 'react';
import { FDIToothNumber } from '@/lib/types';
import { getCrownPath, getRootPaths, getToothTemplate, ToothView } from '@/lib/utils/toothAnatomy';
import { ChartData } from '@/lib/types';
import { isToothPresent } from '@/lib/utils/periodontalAnalysis';

interface ToothOutlineSvgProps {
  tooth: FDIToothNumber;
  view: ToothView;
  x: number;
  y: number;
  rootDirection: -1 | 1;
  data: ChartData;
}

export function ToothOutlineSvg({ tooth, view, x, y, rootDirection, data }: ToothOutlineSvgProps) {
  const crownPath = getCrownPath(tooth);
  const template = getToothTemplate(tooth);
  const flip = rootDirection === 1 ? -1 : 1;
  const isImplant = data[`implant_${tooth}`] === 1 || data[`implant_${tooth}`] === '1';

  if (!isToothPresent(data, tooth)) return null;

  const rootPaths = isImplant ? [] : getRootPaths(tooth, view);

  return (
    <g transform={`translate(${x} ${y}) scale(1 ${flip})`}>
      {rootPaths.map((path, index) => (
        <path
          key={`root-${tooth}-${view}-${index}`}
          d={path}
          className="fill-white dark:fill-gray-700 stroke-gray-500 dark:stroke-gray-400"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      ))}
      <path
        d={crownPath}
        className="fill-white dark:fill-gray-700 stroke-gray-500 dark:stroke-gray-400"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <title>{`${tooth} ${template.class}`}</title>
    </g>
  );
}
