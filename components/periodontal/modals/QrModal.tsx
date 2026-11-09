'use client';

import React from 'react';
import { QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChartStore } from '@/lib/store/useChartStore';

interface QrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrModal({ open, onOpenChange }: QrModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const patient = chartData.patient_number || 'Paciente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Código QR del paciente
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Resumen del estudio periodontal {patient}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center dark:border-gray-600 dark:bg-gray-900">
          <QrCode className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Generación del código QR disponible en una fase posterior
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
