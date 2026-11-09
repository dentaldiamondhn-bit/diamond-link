'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChartStore } from '@/lib/store/useChartStore';
import { classifyAllTeeth } from '@/lib/utils/periodontalAnalysis';

interface ClassificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGE_STYLES: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  4: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function ClassificationModal({ open, onOpenChange }: ClassificationModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const classifications = classifyAllTeeth(chartData).filter(item => item.stage > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Clasificación AAP/EFP 2017
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Estadío por diente según nivel de inserción, profundidad de sondaje, furcación y movilidad
          </DialogDescription>
        </DialogHeader>

        {classifications.length === 0 ? (
          <p className="mt-6 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Ningún diente cumple criterios de periodontitis con los datos registrados.
          </p>
        ) : (
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Diente', 'Estadío', 'Criterios'].map(header => (
                  <th
                    key={header}
                    className="border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classifications.map(item => (
                <tr key={item.tooth}>
                  <td className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center font-bold text-gray-900 dark:text-white">
                    {item.tooth}
                  </td>
                  <td className="border border-gray-200 dark:border-gray-600 px-2 py-1">
                    <span className={`rounded px-2 py-0.5 font-semibold ${STAGE_STYLES[item.stage]}`}>
                      {item.label}
                    </span>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-200">
                    {item.reasons.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}
