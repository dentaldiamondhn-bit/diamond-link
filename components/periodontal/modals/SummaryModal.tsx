'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChartStore } from '@/lib/store/useChartStore';
import { calculateChartStatistics } from '@/lib/utils/periodontalAnalysis';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { ALL_TEETH } from '@/lib/constants/teeth';
import { readNumber, isToothPresent, getToothAl } from '@/lib/utils/periodontalAnalysis';

interface SummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SummaryModal({ open, onOpenChange }: SummaryModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const stats = calculateChartStatistics(chartData);

  const rows = ALL_TEETH.filter(tooth => {
    if (!isToothPresent(chartData, tooth)) return false;
    return getApplicableSurfaces(tooth).some(
      surface => readNumber(chartData[`pd_${tooth}_${surface}`]) > 0,
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-4xl">
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">Resumen del estudio</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Medidas registradas del paciente
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Prof. media', value: `${stats.meanPd.toFixed(1)} mm` },
            { label: 'NIC media', value: `${stats.meanAl.toFixed(1)} mm` },
            { label: 'BOP', value: `${stats.bopPercent.toFixed(0)}%` },
            { label: 'PI', value: `${stats.plaquePercent.toFixed(0)}%` },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {item.label}
              </div>
              <div className="mt-1 text-lg font-bold text-teal-600 dark:text-teal-300">{item.value}</div>
            </div>
          ))}
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Diente', 'Vest. mesial', 'Vest. medio', 'Vest. distal', 'Oral mesial', 'Oral medio', 'Oral distal'].map(
                header => (
                  <th
                    key={header}
                    className="border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(tooth => {
              const surfaces = getApplicableSurfaces(tooth);
              return (
                <tr key={tooth}>
                  <td className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center font-bold text-gray-900 dark:text-white">
                    {tooth}
                  </td>
                  {surfaces.map(surface => {
                    const pd = readNumber(chartData[`pd_${tooth}_${surface}`]);
                    const al = getToothAl(chartData, tooth, surface);
                    return (
                      <td
                        key={surface}
                        className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center text-gray-700 dark:text-gray-200"
                      >
                        {pd ? `${pd} / ${al.toFixed(1)}` : '–'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border border-gray-200 dark:border-gray-600 px-2 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  Todavía no hay profundidades de sondaje registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
