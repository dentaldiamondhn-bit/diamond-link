'use client';

import React from 'react';
import { ChartData, FDIToothNumber, ActiveIndices } from '@/lib/types';
import { SvgPlaceholder } from './SvgPlaceholder';
import { UPPER_TEETH, LOWER_TEETH } from '@/lib/constants/teeth';

interface JawChartProps {
  data: ChartData;
  viewStatus: 0 | 1 | 2;
  isGmInverted: boolean;
  activeIndices: ActiveIndices;
  activeRemoteControl: string;
  overlayData?: ChartData | null;
}

export function JawChart({
  data,
  viewStatus,
  isGmInverted,
  activeIndices,
  activeRemoteControl,
  overlayData,
}: JawChartProps) {
  const upperPlaceholders = [
    { id: 'upper-svg-placeholder-01', view: 'buccal' as const, label: 'Vestibular Superior' },
    { id: 'upper-svg-placeholder-02', view: 'oral' as const, label: 'Palatino Superior' },
  ];

  const lowerPlaceholders = [
    { id: 'lower-svg-placeholder-01', view: 'oral' as const, label: 'Lingual Inferior' },
    { id: 'lower-svg-placeholder-02', view: 'buccal' as const, label: 'Vestibular Inferior' },
  ];

  return (
    <div className="space-y-6 max-w-full">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Maxilar Superior
        </h3>
        {upperPlaceholders.map(placeholder => (
          <div key={placeholder.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {placeholder.label}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 overflow-x-auto">
              <SvgPlaceholder
                id={placeholder.id}
                view={placeholder.view}
                teeth={UPPER_TEETH}
                data={data}
                viewStatus={viewStatus}
                isGmInverted={isGmInverted}
                activeIndices={activeIndices}
                activeRemoteControl={activeRemoteControl}
                overlayData={overlayData}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Maxilar Inferior
        </h3>
        {lowerPlaceholders.map(placeholder => (
          <div key={placeholder.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {placeholder.label}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 overflow-x-auto">
              <SvgPlaceholder
                id={placeholder.id}
                view={placeholder.view}
                teeth={LOWER_TEETH}
                data={data}
                viewStatus={viewStatus}
                isGmInverted={isGmInverted}
                activeIndices={activeIndices}
                activeRemoteControl={activeRemoteControl}
                overlayData={overlayData}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}