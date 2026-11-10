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
    <div className="flex items-center justify-center gap-6 rounded-md border border-gray-700 bg-gray-900/80 px-4 py-2 my-3">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          Profundidad media de sondaje
        </div>
        <div className="text-sm font-bold text-teal-300">
          {stats.meanPd.toFixed(1)} mm
        </div>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          Nivel medio de inserción
        </div>
        <div className="text-sm font-bold text-blue-300">
          {stats.meanAl.toFixed(1)} mm
        </div>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          BOP
        </div>
        <div className="text-sm font-bold text-red-400">
          {stats.bopPercent.toFixed(0)}%
        </div>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">
          PI
        </div>
        <div className="text-sm font-bold text-blue-300">
          {stats.plaquePercent.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
