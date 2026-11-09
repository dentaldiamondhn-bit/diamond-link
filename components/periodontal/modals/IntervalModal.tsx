'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import { useChartStore } from '@/lib/store/useChartStore';

interface IntervalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTERVALS = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: '24', label: '24 meses' },
];

export function IntervalModal({ open, onOpenChange }: IntervalModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const current = String(chartData.intervalo_mantenimiento ?? '6');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Intervalo de mantenimiento
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Periodicidad recomendada para el paciente
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {INTERVALS.map(interval => (
            <label
              key={interval.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="radio"
                name="intervalo_mantenimiento"
                value={interval.value}
                checked={current === interval.value}
                onChange={() => updateField('intervalo_mantenimiento', interval.value)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500"
              />
              {interval.label}
            </label>
          ))}
        </div>

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
