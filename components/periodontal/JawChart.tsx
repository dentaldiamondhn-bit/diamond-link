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

      {/* 1. Upper Grid (Vestibular Superior) */}
      <ArchDataGrid arch="upper" siteGroup="vestibular" readOnly={readOnly} />

      {/* 2. SVG Canvas: Maxilar Superior - Vestibular */}
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

      {/* 3. SVG Canvas: Maxilar Superior - Palatino */}
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

      {/* 4. Upper Grid (Palatino Superior) */}
      <ArchDataGrid arch="upper" siteGroup="palatal" readOnly={readOnly} />

      {/* 5. Summary Metrics Bar (Central Divider) */}
      <SummaryMetricsBar data={data} />

      {/* 6. Lower Grid (Lingual Inferior) */}
      <ArchDataGrid arch="lower" siteGroup="lingual" readOnly={readOnly} />

      {/* 7. SVG Canvas: Mandibular Inferior - Lingual */}
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

      {/* 8. SVG Canvas: Mandibular Inferior - Vestibular */}
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

      {/* 9. Lower Grid (Vestibular Inferior) */}
      <ArchDataGrid arch="lower" siteGroup="vestibular" readOnly={readOnly} />

      <SummaryMetrics data={data} />
    </div>
  );
}