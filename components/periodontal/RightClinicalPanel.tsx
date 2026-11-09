'use client';

import React from 'react';
import {
  Box,
  CalendarClock,
  ClipboardList,
  QrCode,
  Ruler,
  ScanLine,
  Stethoscope,
} from 'lucide-react';

export type ClinicalModalKey =
  | 'classification'
  | 'summary'
  | 'analysis'
  | 'interval'
  | 'three-d'
  | 'qr'
  | 'calibration';

interface RightClinicalPanelProps {
  onOpenModal: (key: ClinicalModalKey) => void;
}

const ACTIONS: { key: ClinicalModalKey; label: string; icon: React.ElementType }[] = [
  { key: 'classification', label: 'Clasificación', icon: Stethoscope },
  { key: 'summary', label: 'Resumen', icon: ClipboardList },
  { key: 'analysis', label: 'Análisis', icon: ScanLine },
  { key: 'interval', label: 'Intervalo', icon: CalendarClock },
  { key: 'three-d', label: '3D', icon: Box },
  { key: 'qr', label: 'Código QR', icon: QrCode },
  { key: 'calibration', label: 'Calibración', icon: Ruler },
];

export function RightClinicalPanel({ onOpenModal }: RightClinicalPanelProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      {ACTIONS.map(action => (
        <button
          key={action.key}
          type="button"
          onClick={() => onOpenModal(action.key)}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-2 text-[10px] font-medium text-gray-700 dark:text-gray-200 transition-colors hover:border-teal-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <action.icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          {action.label}
        </button>
      ))}
    </aside>
  );
}
