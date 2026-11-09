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

const RISK_STYLES: Record<string, string> = {
  bajo: 'border-green-400 bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  moderado:
    'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  alto: 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

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
    <div className="flex w-full flex-col gap-4">
      <SummaryMetrics data={data} />

      {showRisk && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
            RISK_STYLES[risk.level] ?? RISK_STYLES.bajo
          }`}
        >
          Evaluación de riesgo periodontal: {risk.level} (puntaje {risk.score})
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Maxilar Superior
        </h3>

        <ArchDataGrid arch="upper" readOnly={readOnly} />

        <div className="space-y-3">
          {(['upper-svg-placeholder-01', 'upper-svg-placeholder-02'] as const).map(viewId => (
            <div
              key={viewId}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-2 dark:bg-gray-800"
            >
              <h4 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {viewId === 'upper-svg-placeholder-01' ? 'Vestibular Superior' : 'Palatino Superior'}
              </h4>
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
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Mandibular Inferior
        </h3>

        <div className="space-y-3">
          {(['lower-svg-placeholder-01', 'lower-svg-placeholder-02'] as const).map(viewId => (
            <div
              key={viewId}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-2 dark:bg-gray-800"
            >
              <h4 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {viewId === 'lower-svg-placeholder-01' ? 'Lingual Inferior' : 'Vestibular Inferior'}
              </h4>
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

        <ArchDataGrid arch="lower" readOnly={readOnly} />
      </section>

      <SummaryMetrics data={data} />
    </div>
  );
}
