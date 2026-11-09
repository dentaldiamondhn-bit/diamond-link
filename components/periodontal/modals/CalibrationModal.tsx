'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChartStore } from '@/lib/store/useChartStore';

interface CalibrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalibrationModal({ open, onOpenChange }: CalibrationModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const offset = String(chartData.calibracion_sonda ?? '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Calibración de la sonda
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Ajuste aplicado a las profundidades de sondaje registradas
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <label
            htmlFor="calibracion-offset"
            className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Desvío (mm)
          </label>
          <input
            id="calibracion-offset"
            type="number"
            step="0.1"
            value={offset}
            onChange={event => updateField('calibracion_sonda', event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Un desvío positivo suma milímetros a cada lectura de profundidad de sondaje.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
