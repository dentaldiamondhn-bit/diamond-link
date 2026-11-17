'use client';

import React from 'react';
import { ChartData } from '@/lib/types';
import { calculateChartStatistics } from '@/lib/utils/periodontalAnalysis';

interface SummaryMetricsBarProps {
  data: ChartData;
}

export function SummaryMetricsBar({ data }: SummaryMetricsBarProps) {
  const stats = calculateChartStatistics(data);

  return (
    <div className="flex items-center justify-center gap-6 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-2 my-3">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Profundidad media de sondaje
        </div>
        <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
          {stats.meanPd.toFixed(1)} mm
        </div>
      </div>
      <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Nivel medio de inserción
        </div>
        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {stats.meanAl.toFixed(1)} mm
        </div>
      </div>
      <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          BOP
        </div>
        <div className="text-sm font-bold text-red-600 dark:text-red-400">
          {stats.bopPercent.toFixed(0)}%
        </div>
      </div>
      <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          PI
        </div>
        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {stats.plaquePercent.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
