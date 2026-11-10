'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import { SvgPlaceholder } from './SvgPlaceholder';
import { ArchDataGrid } from './ArchDataGrid';
import { SummaryMetrics } from './SummaryMetrics';
import { SummaryMetricsBar } from './SummaryMetricsBar';
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

  const labelClass = 'text-xs font-bold uppercase tracking-wider text-gray-400 mb-1';

  return (
    <div className="flex w-full flex-col gap-0">
      <SummaryMetrics data={data} />

      {showRisk && (
        <div className="mb-1 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Evaluación de riesgo periodontal: {risk.level} (puntaje {risk.score})
        </div>
      )}

      {/* Upper Arch */}
      <ArchDataGrid arch="upper" readOnly={readOnly} />

      <div className={labelClass}>Maxilar Superior - Vestibular</div>
      <div className="w-full">
        <SvgPlaceholder
          id="upper-svg-placeholder-01"
          data={data}
          isGmInverted={isGmInverted}
          activeRemoteControl={activeRemoteControl}
          overlayData={overlayData}
        />
      </div>

      <div className={labelClass}>Maxilar Superior - Palatino</div>
      <div className="w-full">
        <SvgPlaceholder
          id="upper-svg-placeholder-02"
          data={data}
          isGmInverted={isGmInverted}
          activeRemoteControl={activeRemoteControl}
          overlayData={overlayData}
        />
      </div>

      {/* Middle Summary Metrics Bar */}
      <SummaryMetricsBar data={data} />

      {/* Lower Arch */}
      <div className={labelClass}>Mandibular Inferior - Lingual</div>
      <div className="w-full">
        <SvgPlaceholder
          id="lower-svg-placeholder-01"
          data={data}
          isGmInverted={isGmInverted}
          activeRemoteControl={activeRemoteControl}
          overlayData={overlayData}
        />
      </div>

      <div className={labelClass}>Mandibular Inferior - Vestibular</div>
      <div className="w-full">
        <SvgPlaceholder
          id="lower-svg-placeholder-02"
          data={data}
          isGmInverted={isGmInverted}
          activeRemoteControl={activeRemoteControl}
          overlayData={overlayData}
        />
      </div>

      <ArchDataGrid arch="lower" readOnly={readOnly} />

      <SummaryMetrics data={data} />
    </div>
  );
}