'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChartStore } from '@/lib/store/useChartStore';
import {
  calculateChartStatistics,
  calculateRiskAssessment,
  RiskLevel,
} from '@/lib/utils/periodontalAnalysis';

interface AnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_STYLES: Record<RiskLevel, string> = {
  bajo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderado: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  alto: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-500',
  moderate: 'bg-amber-500',
  high: 'bg-red-500',
  info: 'bg-gray-400',
};

export function AnalysisModal({ open, onOpenChange }: AnalysisModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const stats = calculateChartStatistics(chartData);
  const risk = calculateRiskAssessment(chartData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Análisis de riesgo periodontal
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Evaluación basada en sangrado, placa, profundidad de sondaje, furcaciones y movilidad
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${LEVEL_STYLES[risk.level]}`}>
            Riesgo {risk.level}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Puntaje: {risk.score}</span>
        </div>

        <ul className="mt-4 space-y-2">
          {risk.factors.map(factor => (
            <li
              key={factor.label}
              className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_STYLES[factor.severity]}`} />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{factor.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{factor.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: 'Dientes presentes', value: stats.teethPresent },
            { label: 'Dientes ausentes', value: stats.teethMissing },
            { label: 'Implantes', value: stats.teethImplanted },
            { label: 'Bolsas ≥ 5mm', value: stats.sites5mm },
            { label: 'Bolsas ≥ 6mm', value: stats.sites6mm },
            { label: 'Furcación II-III', value: stats.furcationAdvanced },
          ].map(item => (
            <div
              key={item.label}
              className="rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {item.label}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
