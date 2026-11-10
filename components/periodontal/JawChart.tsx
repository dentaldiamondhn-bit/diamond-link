'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import { SvgPlaceholder } from './SvgPlaceholder';
import { ArchDataGrid } from './ArchDataGrid';
import { SummaryMetrics } from './SummaryMetrics';
import { calculateRiskAssessment } from '@/lib/utils/periodontalAnalysis';

interface JawChartProps {
  data: ChartData;
  isGmInverted: boolean;
  activeRemoteControl: string;
  overlayData?: ChartData | null;
  readOnly?: boolean;
}

export function JawChart({
  data,
  isGmInverted,
  activeRemoteControl,
  overlayData,
  readOnly = false,
}: JawChartProps) {
  const risk = calculateRiskAssessment(data);
  const showRisk = activeRemoteControl === 'pra';

  return (
    <div className="flex w-full flex-col gap-0">
      <SummaryMetrics data={data} />

      {showRisk && (
        <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Evaluación de riesgo periodontal: {risk.level} (puntaje {risk.score})
        </div>
      )}

      {/* Upper Arch Assembly */}
      <ArchDataGrid arch="upper" readOnly={readOnly} />

      <div className="w-full">
        {(['upper-svg-placeholder-01', 'upper-svg-placeholder-02'] as const).map(viewId => (
          <div key={viewId} className="w-full">
            <div className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {viewId === 'upper-svg-placeholder-01' ? 'Vestibular Superior' : 'Palatino Superior'}
            </div>
            <SvgPlaceholder
              id={viewId}
              data={data}
              isGmInverted={isGmInverted}
              activeRemoteControl={activeRemoteControl}
              overlayData={overlayData}
            />
          </div>
        ))}
      </div>

      {/* Center Interface Contact — lower SVG directly below upper */}
      <div className="w-full">
        {(['lower-svg-placeholder-01', 'lower-svg-placeholder-02'] as const).map(viewId => (
          <div key={viewId} className="w-full">
            <div className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {viewId === 'lower-svg-placeholder-01' ? 'Lingual Inferior' : 'Vestibular Inferior'}
            </div>
            <SvgPlaceholder
              id={viewId}
              data={data}
              isGmInverted={isGmInverted}
              activeRemoteControl={activeRemoteControl}
              overlayData={overlayData}
            />
          </div>
        ))}
      </div>

      {/* Lower Arch Assembly */}
      <ArchDataGrid arch="lower" readOnly={readOnly} />

      <SummaryMetrics data={data} />
    </div>
  );
}