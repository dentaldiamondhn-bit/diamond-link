'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import { calculateChartStatistics } from '@/lib/utils/periodontalAnalysis';

interface SummaryMetricsProps {
  data: ChartData;
}

interface Metric {
  label: string;
  value: string;
  unit: string;
  tone: string;
}

export function SummaryMetrics({ data }: SummaryMetricsProps) {
  const stats = calculateChartStatistics(data);

  const metrics: Metric[] = [
    {
      label: 'Profundidad media de sondaje',
      value: stats.meanPd.toFixed(1),
      unit: 'mm',
      tone: 'text-teal-600 dark:text-teal-300',
    },
    {
      label: 'Nivel medio de inserción',
      value: stats.meanAl.toFixed(1),
      unit: 'mm',
      tone: 'text-blue-600 dark:text-blue-300',
    },
    {
      label: 'BOP',
      value: stats.bopPercent.toFixed(0),
      unit: '%',
      tone: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'PI',
      value: stats.plaquePercent.toFixed(0),
      unit: '%',
      tone: 'text-blue-600 dark:text-blue-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 lg:grid-cols-4">
      {metrics.map(metric => (
        <div
          key={metric.label}
          className="rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-center"
        >
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {metric.label}
          </div>
          <div className={`mt-0.5 text-xl font-bold ${metric.tone}`}>
            {metric.value}
            <span className="ml-0.5 text-xs font-medium">{metric.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
